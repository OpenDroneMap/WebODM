import os
import subprocess
import time

import shutil

import logging
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient

from app import scheduler
from app.models import Project, Task, ImageUpload, task_directory_path
from app.tests.classes import BootTransactionTestCase
from nodeodm import status_codes
from nodeodm.models import ProcessingNode
from app.testwatch import testWatch

# We need to test the task API in a TransactionTestCase because
# task processing happens on a separate thread, and normal TestCases
# do not commit changes to the DB, so spawning a new thread will show no
# data in it.
from webodm import settings
logger = logging.getLogger('app.logger')

class TestApiTask(BootTransactionTestCase):
    def setUp(self):
        # We need to clear previous media_root content
        # This points to the test directory, but just in case
        # we double check that the directory is indeed a test directory
        if "_test" in settings.MEDIA_ROOT:
            logger.info("Cleaning up {}".format(settings.MEDIA_ROOT))
            shutil.rmtree(settings.MEDIA_ROOT)
        else:
            logger.warning("We did not remove MEDIA_ROOT because we couldn't find a _test suffix in its path.")

    def test_task(self):
        DELAY = 1  # time to sleep for during process launch, background processing, etc.
        client = APIClient()

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
        current_dir = os.path.dirname(os.path.realpath(__file__))
        node_odm = subprocess.Popen(['node', 'index.js', '--port', '11223', '--test'], shell=False,
                                    cwd=os.path.join(current_dir, "..", "..", "nodeodm", "external", "node-OpenDroneMap"))
        time.sleep(DELAY)  # Wait for the server to launch

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

        # Normal case with just images[] parameter
        res = client.post("/api/projects/{}/tasks/".format(project.id), {
            'images': [image1, image2]
        }, format="multipart")
        self.assertTrue(res.status_code == status.HTTP_201_CREATED)

        # Should have returned the id of the newly created task
        task = Task.objects.latest('created_at')
        self.assertTrue('id' in res.data)
        self.assertTrue(task.id == res.data['id'])

        # Two images should have been uploaded
        self.assertTrue(ImageUpload.objects.filter(task=task).count() == 2)

        # No processing node is set
        self.assertTrue(task.processing_node is None)

        image1.close()
        image2.close()

        # tiles.json should not be accessible at this point
        res = client.get("/api/projects/{}/tasks/{}/tiles.json".format(project.id, task.id))
        self.assertTrue(res.status_code == status.HTTP_400_BAD_REQUEST)

        # Neither should an individual tile
        # Z/X/Y coords are choosen based on node-odm test dataset for orthophoto_tiles/
        res = client.get("/api/projects/{}/tasks/{}/tiles/16/16020/42443.png".format(project.id, task.id))
        self.assertTrue(res.status_code == status.HTTP_404_NOT_FOUND)

        # Cannot access a tiles.json we have no access to
        res = client.get("/api/projects/{}/tasks/{}/tiles.json".format(other_project.id, other_task.id))
        self.assertTrue(res.status_code == status.HTTP_404_NOT_FOUND)

        # Cannot access an individual tile we have no access to
        res = client.get("/api/projects/{}/tasks/{}/tiles/16/16020/42443.png".format(other_project.id, other_task.id))
        self.assertTrue(res.status_code == status.HTTP_404_NOT_FOUND)

        # Cannot download assets (they don't exist yet)
        assets = ["all", "geotiff", "las", "csv", "ply"]

        for asset in assets:
            res = client.get("/api/projects/{}/tasks/{}/download/{}/".format(project.id, task.id, asset))
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
        self.assertTrue(task.status == status_codes.RUNNING)
        self.assertTrue(len(task.uuid) > 0)

        # Calling process pending tasks should finish the process
        scheduler.process_pending_tasks()
        task.refresh_from_db()
        self.assertTrue(task.status == status_codes.COMPLETED)

        # Can download assets
        for asset in assets:
            res = client.get("/api/projects/{}/tasks/{}/download/{}/".format(project.id, task.id, asset))
            self.assertTrue(res.status_code == status.HTTP_200_OK)

        # Can download raw assets
        res = client.get("/api/projects/{}/tasks/{}/assets/odm_orthophoto/odm_orthophoto.tif".format(project.id, task.id))
        self.assertTrue(res.status_code == status.HTTP_200_OK)

        # Can access tiles.json and individual tiles
        res = client.get("/api/projects/{}/tasks/{}/tiles.json".format(project.id, task.id))
        self.assertTrue(res.status_code == status.HTTP_200_OK)

        res = client.get("/api/projects/{}/tasks/{}/tiles/16/16020/42443.png".format(project.id, task.id))
        self.assertTrue(res.status_code == status.HTTP_200_OK)

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

        task_assets_path = os.path.join(settings.MEDIA_ROOT,
                               task_directory_path(task.id, task.project.id))
        self.assertFalse(os.path.exists(task_assets_path))

        testWatch.clear()
        testWatch.intercept("app.scheduler.process_pending_tasks")



        # TODO: what happens when nodes go offline, or an offline node is assigned to a task
        # TODO: timeout issues

        # Teardown processing node
        node_odm.terminate()
