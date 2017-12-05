import os
import subprocess
import time

import shutil

import logging
from datetime import timedelta

import json
import requests
from django.contrib.auth.models import User
from django.contrib.gis.gdal import GDALRaster
from django.contrib.gis.gdal import OGRGeometry
from rest_framework import status
from rest_framework.test import APIClient

from app import pending_actions
from app import scheduler
from django.utils import timezone
from app.models import Project, Task, ImageUpload
from app.models.task import task_directory_path, full_task_directory_path
from app.tests.classes import BootTransactionTestCase
from nodeodm import status_codes
from nodeodm.models import ProcessingNode, OFFLINE_MINUTES
from app.testwatch import testWatch

# We need to test the task API in a TransactionTestCase because
# task processing happens on a separate thread, and normal TestCases
# do not commit changes to the DB, so spawning a new thread will show no
# data in it.
from webodm import settings
logger = logging.getLogger('app.logger')

DELAY = 2  # time to sleep for during process launch, background processing, etc.

def start_processing_node(*args):
    current_dir = os.path.dirname(os.path.realpath(__file__))
    node_odm = subprocess.Popen(['node', 'index.js', '--port', '11223', '--test'] + list(args), shell=False,
                                cwd=os.path.join(current_dir, "..", "..", "nodeodm", "external", "node-OpenDroneMap"))
    time.sleep(DELAY)  # Wait for the server to launch
    return node_odm

class TestApiTask(BootTransactionTestCase):
    def setUp(self):
        super().setUp()

        # We need to clear previous media_root content
        # This points to the test directory, but just in case
        # we double check that the directory is indeed a test directory
        if "_test" in settings.MEDIA_ROOT:
            if os.path.exists(settings.MEDIA_ROOT):
                logger.info("Cleaning up {}".format(settings.MEDIA_ROOT))
                shutil.rmtree(settings.MEDIA_ROOT)
        else:
            logger.warning("We did not remove MEDIA_ROOT because we couldn't find a _test suffix in its path.")

    def test_task(self):
        client = APIClient()

        node_odm = start_processing_node()

        user = User.objects.get(username="testuser")
        self.assertFalse(user.is_superuser)

        other_user = User.objects.get(username="testuser2")

        project = Project.objects.create(
            owner=user,
            name="test project"
        )
        other_project = Project.objects.create(
            owner=other_user,
            name="another test project"
        )
        other_task = Task.objects.create(project=other_project)

        # Start processing node

        # Create processing node
        pnode = ProcessingNode.objects.create(hostname="localhost", port=11223)

        # Verify that it's working
        self.assertTrue(pnode.api_version is not None)

        # task creation via file upload
        image1 = open("app/fixtures/tiny_drone_image.jpg", 'rb')
        image2 = open("app/fixtures/tiny_drone_image_2.jpg", 'rb')

        # Not authenticated?
        res = client.post("/api/projects/{}/tasks/".format(project.id), {
            'images': [image1, image2]
        }, format="multipart")
        self.assertTrue(res.status_code == status.HTTP_403_FORBIDDEN);

        client.login(username="testuser", password="test1234")

        # Cannot create a task for a project that does not exist
        res = client.post("/api/projects/0/tasks/", {
            'images': [image1, image2]
        }, format="multipart")
        self.assertTrue(res.status_code == status.HTTP_404_NOT_FOUND)

        # Cannot create a task for a project for which we have no access to
        res = client.post("/api/projects/{}/tasks/".format(other_project.id), {
            'images': [image1, image2]
        }, format="multipart")
        self.assertTrue(res.status_code == status.HTTP_404_NOT_FOUND)

        # Cannot create a task without images
        res = client.post("/api/projects/{}/tasks/".format(project.id), {
            'images': []
        }, format="multipart")
        self.assertTrue(res.status_code == status.HTTP_400_BAD_REQUEST)

        # Cannot create a task with just 1 image
        res = client.post("/api/projects/{}/tasks/".format(project.id), {
            'images': image1
        }, format="multipart")
        self.assertTrue(res.status_code == status.HTTP_400_BAD_REQUEST)

        # Normal case with images[], name and processing node parameter
        res = client.post("/api/projects/{}/tasks/".format(project.id), {
            'images': [image1, image2],
            'name': 'test_task',
            'processing_node': pnode.id
        }, format="multipart")
        self.assertTrue(res.status_code == status.HTTP_201_CREATED)
        multiple_param_task = Task.objects.latest('created_at')
        self.assertTrue(multiple_param_task.name == 'test_task')
        self.assertTrue(multiple_param_task.processing_node.id == pnode.id)

        # Cannot create a task with images[], name, but invalid processing node parameter
        res = client.post("/api/projects/{}/tasks/".format(project.id), {
            'images': [image1, image2],
            'name': 'test_task',
            'processing_node': 9999
        }, format="multipart")
        self.assertTrue(res.status_code == status.HTTP_400_BAD_REQUEST)

        # Normal case with images[] parameter
        res = client.post("/api/projects/{}/tasks/".format(project.id), {
            'images': [image1, image2],
            'auto_processing_node': 'false'
        }, format="multipart")
        self.assertTrue(res.status_code == status.HTTP_201_CREATED)

        # Should have returned the id of the newly created task
        task = Task.objects.latest('created_at')
        self.assertTrue('id' in res.data)
        self.assertTrue(str(task.id) == res.data['id'])

        # Two images should have been uploaded
        self.assertTrue(ImageUpload.objects.filter(task=task).count() == 2)

        # No processing node is set
        self.assertTrue(task.processing_node is None)

        # tiles.json should not be accessible at this point
        tile_types = ['orthophoto', 'dsm', 'dtm']
        for tile_type in tile_types:
            res = client.get("/api/projects/{}/tasks/{}/{}/tiles.json".format(project.id, task.id, tile_type))
            self.assertTrue(res.status_code == status.HTTP_400_BAD_REQUEST)

        # Neither should an individual tile
        # Z/X/Y coords are chosen based on node-odm test dataset for orthophoto_tiles/
        res = client.get("/api/projects/{}/tasks/{}/orthophoto/tiles/16/16020/42443.png".format(project.id, task.id))
        self.assertTrue(res.status_code == status.HTTP_404_NOT_FOUND)

        # Cannot access a tiles.json we have no access to
        res = client.get("/api/projects/{}/tasks/{}/orthophoto/tiles.json".format(other_project.id, other_task.id))
        self.assertTrue(res.status_code == status.HTTP_404_NOT_FOUND)

        # Cannot access an individual tile we have no access to
        res = client.get("/api/projects/{}/tasks/{}/orthophoto/tiles/16/16020/42443.png".format(other_project.id, other_task.id))
        self.assertTrue(res.status_code == status.HTTP_404_NOT_FOUND)

        # Cannot download assets (they don't exist yet)
        for asset in list(task.ASSETS_MAP.keys()):
            res = client.get("/api/projects/{}/tasks/{}/download/{}".format(project.id, task.id, asset))
            self.assertTrue(res.status_code == status.HTTP_404_NOT_FOUND)

        # Cannot access raw assets (they don't exist yet)
        res = client.get("/api/projects/{}/tasks/{}/assets/odm_orthophoto/odm_orthophoto.tif".format(project.id, task.id))
        self.assertTrue(res.status_code == status.HTTP_404_NOT_FOUND)

        # Cannot assign processing node to a task we have no access to
        res = client.patch("/api/projects/{}/tasks/{}/".format(other_project.id, other_task.id), {
            'processing_node': pnode.id
        })
        self.assertTrue(res.status_code == status.HTTP_404_NOT_FOUND)

        testWatch.clear()

        # No UUID at this point
        self.assertTrue(len(task.uuid) == 0)

        # Assign processing node to task via API
        res = client.patch("/api/projects/{}/tasks/{}/".format(project.id, task.id), {
            'processing_node': pnode.id
        })
        self.assertTrue(res.status_code == status.HTTP_200_OK)

        # On update scheduler.processing_pending_tasks should have been called in the background
        testWatch.wait_until_call("app.scheduler.process_pending_tasks", timeout=5)

        # Processing should have started and a UUID is assigned
        task.refresh_from_db()
        self.assertTrue(task.status in [status_codes.RUNNING, status_codes.COMPLETED]) # Sometimes the task finishes and we can't test for RUNNING state
        self.assertTrue(len(task.uuid) > 0)

        time.sleep(DELAY)

        # Calling process pending tasks should finish the process
        scheduler.process_pending_tasks()
        task.refresh_from_db()
        self.assertTrue(task.status == status_codes.COMPLETED)

        # Can download assets
        for asset in list(task.ASSETS_MAP.keys()):
            res = client.get("/api/projects/{}/tasks/{}/download/{}".format(project.id, task.id, asset))
            self.assertTrue(res.status_code == status.HTTP_200_OK)

        # A textured mesh archive file should exist
        self.assertTrue(os.path.exists(task.assets_path(task.ASSETS_MAP["textured_model.zip"]["deferred_path"])))

        # Can download raw assets
        res = client.get("/api/projects/{}/tasks/{}/assets/odm_orthophoto/odm_orthophoto.tif".format(project.id, task.id))
        self.assertTrue(res.status_code == status.HTTP_200_OK)

        # Can access tiles.json
        for tile_type in tile_types:
            res = client.get("/api/projects/{}/tasks/{}/{}/tiles.json".format(project.id, task.id, tile_type))
            self.assertTrue(res.status_code == status.HTTP_200_OK)

        # Bounds are what we expect them to be
        # (4 coords in lat/lon)
        tiles = json.loads(res.content.decode("utf-8"))
        self.assertTrue(len(tiles['bounds']) == 4)
        self.assertTrue(round(tiles['bounds'][0], 7) == -91.9945132)

        # Can access individual tiles
        for tile_type in tile_types:
            res = client.get("/api/projects/{}/tasks/{}/{}/tiles/16/16020/42443.png".format(project.id, task.id, tile_type))
            self.assertTrue(res.status_code == status.HTTP_200_OK)

        # Another user does not have access to the resources
        other_client = APIClient()
        other_client.login(username="testuser2", password="test1234")

        def accessResources(expectedStatus):
            for tile_type in tile_types:
                res = other_client.get("/api/projects/{}/tasks/{}/{}/tiles.json".format(project.id, task.id, tile_type))
                self.assertTrue(res.status_code == expectedStatus)

            res = other_client.get("/api/projects/{}/tasks/{}/{}/tiles/16/16020/42443.png".format(project.id, task.id, tile_type))
            self.assertTrue(res.status_code == expectedStatus)

        accessResources(status.HTTP_404_NOT_FOUND)

        # Original owner enables sharing
        res = client.patch("/api/projects/{}/tasks/{}/".format(project.id, task.id), {
            'public': True
        })
        self.assertTrue(res.status_code == status.HTTP_200_OK)

        # Now other user can acccess resources
        accessResources(status.HTTP_200_OK)

        # User logs out
        other_client.logout()

        # He can still access the resources as anonymous
        accessResources(status.HTTP_200_OK)

        # Other user still does not have access to certain parts of the API
        res = other_client.get("/api/projects/{}/tasks/{}/".format(project.id, task.id))
        self.assertTrue(res.status_code == status.HTTP_403_FORBIDDEN)

        # Restart a task
        testWatch.clear()
        res = client.post("/api/projects/{}/tasks/{}/restart/".format(project.id, task.id))
        self.assertTrue(res.status_code == status.HTTP_200_OK)
        testWatch.wait_until_call("app.scheduler.process_pending_tasks", timeout=5)
        task.refresh_from_db()

        self.assertTrue(task.status in [status_codes.RUNNING, status_codes.COMPLETED])

        # Cancel a task
        testWatch.clear()
        res = client.post("/api/projects/{}/tasks/{}/cancel/".format(project.id, task.id))
        self.assertTrue(res.status_code == status.HTTP_200_OK)
        testWatch.wait_until_call("app.scheduler.process_pending_tasks", timeout=5)

        # Should have been canceled
        task.refresh_from_db()
        self.assertTrue(task.status == status_codes.CANCELED)

        # Remove a task
        res = client.post("/api/projects/{}/tasks/{}/remove/".format(project.id, task.id))
        self.assertTrue(res.status_code == status.HTTP_200_OK)
        testWatch.wait_until_call("app.scheduler.process_pending_tasks", 2, timeout=5)

        # Has been removed along with assets
        self.assertFalse(Task.objects.filter(pk=task.id).exists())
        self.assertFalse(ImageUpload.objects.filter(task=task).exists())

        task_assets_path = os.path.join(settings.MEDIA_ROOT, task_directory_path(task.id, task.project.id))
        self.assertFalse(os.path.exists(task_assets_path))

        testWatch.clear()
        testWatch.intercept("app.scheduler.process_pending_tasks")

        # Create a task, then kill the processing node
        res = client.post("/api/projects/{}/tasks/".format(project.id), {
            'images': [image1, image2],
            'name': 'test_task_offline',
            'processing_node': pnode.id,
            'auto_processing_node': 'false'
        }, format="multipart")
        self.assertTrue(res.status_code == status.HTTP_201_CREATED)
        task = Task.objects.get(pk=res.data['id'])

        # Stop processing node
        node_odm.terminate()

        task.refresh_from_db()
        self.assertTrue(task.last_error is None)
        scheduler.process_pending_tasks()

        # Processing should fail and set an error
        task.refresh_from_db()
        self.assertTrue(task.last_error is not None)
        self.assertTrue(task.status == status_codes.FAILED)

        # Now bring it back online
        node_odm = start_processing_node()

        # Restart
        res = client.post("/api/projects/{}/tasks/{}/restart/".format(project.id, task.id))
        self.assertTrue(res.status_code == status.HTTP_200_OK)
        task.refresh_from_db()
        self.assertTrue(task.pending_action == pending_actions.RESTART)

        # After processing, the task should have restarted, and have no UUID or status
        scheduler.process_pending_tasks()
        task.refresh_from_db()
        self.assertTrue(task.status is None)
        self.assertTrue(len(task.uuid) == 0)

        # Another step and it should have acquired a UUID
        scheduler.process_pending_tasks()
        task.refresh_from_db()
        self.assertTrue(task.status in [status_codes.RUNNING, status_codes.COMPLETED])
        self.assertTrue(len(task.uuid) > 0)

        # Another step and it should be completed
        time.sleep(DELAY)
        scheduler.process_pending_tasks()
        task.refresh_from_db()
        self.assertTrue(task.status == status_codes.COMPLETED)


        # Test connection, timeout errors
        res = client.post("/api/projects/{}/tasks/{}/restart/".format(project.id, task.id))
        def connTimeout(*args, **kwargs):
            raise requests.exceptions.ConnectTimeout("Simulated timeout")

        testWatch.intercept("nodeodm.api_client.task_output", connTimeout)
        scheduler.process_pending_tasks()

        # Timeout errors should be handled by retrying again at a later time
        # and not fail
        task.refresh_from_db()
        self.assertTrue(task.last_error is None)


        # Reassigning the task to another project should move its assets
        self.assertTrue(os.path.exists(full_task_directory_path(task.id, project.id)))
        self.assertTrue(len(task.imageupload_set.all()) == 2)
        for image in task.imageupload_set.all():
            self.assertTrue('project/{}/'.format(project.id) in image.image.path)

        task.project = other_project
        task.save()
        task.refresh_from_db()
        self.assertFalse(os.path.exists(full_task_directory_path(task.id, project.id)))
        self.assertTrue(os.path.exists(full_task_directory_path(task.id, other_project.id)))

        for image in task.imageupload_set.all():
            self.assertTrue('project/{}/'.format(other_project.id) in image.image.path)

        node_odm.terminate()

        # Restart node-odm as to not generate orthophotos
        testWatch.clear()
        node_odm = start_processing_node("--test_skip_orthophotos")
        res = client.post("/api/projects/{}/tasks/".format(project.id), {
            'images': [image1, image2],
            'name': 'test_task_no_orthophoto',
            'processing_node': pnode.id,
            'auto_processing_node': 'false'
        }, format="multipart")
        self.assertTrue(res.status_code == status.HTTP_201_CREATED)

        scheduler.process_pending_tasks()
        time.sleep(DELAY)
        scheduler.process_pending_tasks()

        task = Task.objects.get(pk=res.data['id'])
        self.assertTrue(task.status == status_codes.COMPLETED)

        # Orthophoto files/directories should be missing
        self.assertFalse(os.path.exists(task.assets_path("odm_orthophoto", "odm_orthophoto.tif")))
        self.assertFalse(os.path.exists(task.assets_path("orthophoto_tiles")))

        # orthophoto_extent should be none
        self.assertTrue(task.orthophoto_extent is None)

        # but other extents should be populated
        self.assertTrue(task.dsm_extent is not None)
        self.assertTrue(task.dtm_extent is not None)
        self.assertTrue(os.path.exists(task.assets_path("dsm_tiles")))
        self.assertTrue(os.path.exists(task.assets_path("dtm_tiles")))

        # Can access only tiles of available assets
        res = client.get("/api/projects/{}/tasks/{}/dsm/tiles.json".format(project.id, task.id))
        self.assertTrue(res.status_code == status.HTTP_200_OK)
        res = client.get("/api/projects/{}/tasks/{}/dtm/tiles.json".format(project.id, task.id))
        self.assertTrue(res.status_code == status.HTTP_200_OK)
        res = client.get("/api/projects/{}/tasks/{}/orthophoto/tiles.json".format(project.id, task.id))
        self.assertTrue(res.status_code == status.HTTP_400_BAD_REQUEST)

        # Available assets should be missing orthophoto.tif type
        # but others such as textured_model.zip should be available
        res = client.get("/api/projects/{}/tasks/{}/".format(project.id, task.id))
        self.assertFalse('orthophoto.tif' in res.data['available_assets'])
        self.assertTrue('textured_model.zip' in res.data['available_assets'])

        image1.close()
        image2.close()
        node_odm.terminate()

    def test_task_auto_processing_node(self):
        project = Project.objects.get(name="User Test Project")
        task = Task.objects.create(project=project, name="Test")
        pnode = ProcessingNode.objects.create(hostname="invalid-host", port=11223)
        another_pnode = ProcessingNode.objects.create(hostname="invalid-host-2", port=11223)

        # By default
        self.assertTrue(task.auto_processing_node)
        self.assertTrue(task.processing_node is None)

        # Simulate an error
        task.last_error = "Test error"
        task.save()

        scheduler.process_pending_tasks()

        # A processing node should not have been assigned
        task.refresh_from_db()
        self.assertTrue(task.processing_node is None)

        # Remove error
        task.last_error = None
        task.save()

        scheduler.process_pending_tasks()

        # A processing node should not have been assigned because no processing nodes are online
        task.refresh_from_db()
        self.assertTrue(task.processing_node is None)

        # Bring a proessing node online
        pnode.last_refreshed = timezone.now()
        pnode.save()
        self.assertTrue(pnode.is_online())

        # A processing node has been assigned
        scheduler.process_pending_tasks()
        task.refresh_from_db()
        self.assertTrue(task.processing_node.id == pnode.id)

        # Task should have failed (no images provided, invalid host...)
        self.assertTrue(task.last_error is not None)

        # Bring another processing node online, and bring the old one offline
        pnode.last_refreshed = timezone.now() - timedelta(minutes=OFFLINE_MINUTES)
        pnode.save()

        another_pnode.last_refreshed = timezone.now()
        another_pnode.save()

        # Remove error
        task.last_error = None
        task.status = None
        task.save()

        scheduler.process_pending_tasks()

        # Processing node is now cleared and a new one will be assigned on the next tick
        task.refresh_from_db()
        self.assertTrue(task.processing_node is None)

        scheduler.process_pending_tasks()

        task.refresh_from_db()
        self.assertTrue(task.processing_node.id == another_pnode.id)

    def test_task_manual_processing_node(self):
        user = User.objects.get(username="testuser")
        project = Project.objects.create(name="User Test Project", owner=user)
        task = Task.objects.create(project=project, name="Test", auto_processing_node=False)

        # Bring a processing node online
        pnode = ProcessingNode.objects.create(hostname="invalid-host", port=11223)
        pnode.last_refreshed = timezone.now()
        pnode.save()
        self.assertTrue(pnode.is_online())

        scheduler.process_pending_tasks()

        # A processing node should not have been assigned because we asked
        # not to via auto_processing_node = false
        task.refresh_from_db()
        self.assertTrue(task.processing_node is None)






