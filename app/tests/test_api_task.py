import io
import os
import time

import threading

from worker.celery import app as celery
import logging
from datetime import timedelta

import json
import requests
from PIL import Image
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient

import worker
from django.utils import timezone

from app import pending_actions
from app.api.formulas import algos, get_camera_filters_for
from app.api.tiler import ZOOM_EXTRA_LEVELS
from app.cogeo import valid_cogeo
from app.models import Project, Task, ImageUpload
from app.models.task import task_directory_path, full_task_directory_path, TaskInterruptedException
from app.plugins.signals import task_completed, task_removed, task_removing
from app.tests.classes import BootTransactionTestCase
from nodeodm import status_codes
from nodeodm.models import ProcessingNode
from app.testwatch import testWatch
from .utils import start_processing_node, clear_test_media_root, catch_signal

# We need to test the task API in a TransactionTestCase because
# task processing happens on a separate thread, and normal TestCases
# do not commit changes to the DB, so spawning a new thread will show no
# data in it.
from webodm import settings
logger = logging.getLogger('app.logger')

DELAY = 2  # time to sleep for during process launch, background processing, etc.

class TestApiTask(BootTransactionTestCase):
    def setUp(self):
        super().setUp()

    def tearDown(self):
        clear_test_media_root()

    def test_task(self):
        client = APIClient()

        with start_processing_node():
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
            multispec_image = open("app/fixtures/tiny_drone_image_multispec.tif", 'rb')


            img1 = Image.open("app/fixtures/tiny_drone_image.jpg")

            # Not authenticated?
            res = client.post("/api/projects/{}/tasks/".format(project.id), {
                'images': [image1, image2]
            }, format="multipart")
            self.assertTrue(res.status_code == status.HTTP_403_FORBIDDEN);
            image1.seek(0)
            image2.seek(0)

            client.login(username="testuser", password="test1234")

            # Cannot create a task for a project that does not exist
            res = client.post("/api/projects/0/tasks/", {
                'images': [image1, image2]
            }, format="multipart")
            self.assertTrue(res.status_code == status.HTTP_404_NOT_FOUND)
            image1.seek(0)
            image2.seek(0)

            # Cannot create a task for a project for which we have no access to
            res = client.post("/api/projects/{}/tasks/".format(other_project.id), {
                'images': [image1, image2]
            }, format="multipart")
            self.assertTrue(res.status_code == status.HTTP_404_NOT_FOUND)
            image1.seek(0)
            image2.seek(0)

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
            image1.seek(0)

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
            self.assertEqual(multiple_param_task.import_url, "")
            image1.seek(0)
            image2.seek(0)

            # Uploaded images should be the same size as originals
            with Image.open(multiple_param_task.task_path("tiny_drone_image.jpg")) as im:
                self.assertTrue(im.size == img1.size)

            # Normal case with images[], GCP, name and processing node parameter and resize_to option
            testWatch.clear()
            gcp = open("app/fixtures/gcp.txt", 'r')
            res = client.post("/api/projects/{}/tasks/".format(project.id), {
                'images': [image1, image2, multispec_image, gcp],
                'name': 'test_task',
                'processing_node': pnode.id,
                'resize_to': img1.size[0] / 2.0
            }, format="multipart")
            self.assertTrue(res.status_code == status.HTTP_201_CREATED)
            resized_task = Task.objects.latest('created_at')
            image1.seek(0)
            image2.seek(0)
            gcp.seek(0)
            multispec_image.seek(0)

            # Uploaded images should have been resized
            with Image.open(resized_task.task_path("tiny_drone_image.jpg")) as im:
                self.assertTrue(im.size[0] == img1.size[0] / 2.0)

            # Except the multispectral image
            with Image.open(resized_task.task_path("tiny_drone_image_multispec.tif")) as im:
                self.assertTrue(im.size[0] == img1.size[0])

            # GCP should have been scaled
            with open(resized_task.task_path("gcp.txt")) as f:
                lines = list(map(lambda l: l.strip(), f.readlines()))

                [x, y, z, px, py, imagename, *extras] = lines[1].split(' ')
                self.assertTrue(imagename == "tiny_drone_image.JPG") # case insensitive
                self.assertEqual(float(px), 2.0) # scaled by half
                self.assertEqual(float(py), 3.0) # scaled by half
                self.assertEqual(float(x), 576529.22) # Didn't change

                [x, y, z, px, py, imagename, *extras] = lines[5].split(' ')
                self.assertEqual(imagename, "missing_image.jpg")
                self.assertEqual(float(px), 8.0)  # Didn't change
                self.assertEqual(float(py), 8.0)  # Didn't change

            # Resize progress is 100%
            resized_task.refresh_from_db()
            self.assertEqual(resized_task.resize_progress, 1.0)

            # Upload progress is 100%
            self.assertEqual(resized_task.upload_progress, 1.0)

            # Upload progress callback has been called
            self.assertTrue(testWatch.get_calls_count("Task.process.callback") > 0)

            # This is not a partial task
            self.assertFalse(resized_task.partial)

            # Case with malformed GCP file option
            with open("app/fixtures/gcp_malformed.txt", 'r') as malformed_gcp:
                res = client.post("/api/projects/{}/tasks/".format(project.id), {
                    'images': [image1, image2, malformed_gcp],
                    'name': 'test_task',
                    'processing_node': pnode.id,
                    'resize_to': img1.size[0] / 2.0
                }, format="multipart")
                self.assertTrue(res.status_code == status.HTTP_201_CREATED)
                malformed_gcp_task = Task.objects.latest('created_at')

                # We just pass it along, it will get errored out during processing
                # But we shouldn't fail.
                with open(malformed_gcp_task.task_path("gcp_malformed.txt")) as f:
                    lines = list(map(lambda l: l.strip(), f.readlines()))
                    self.assertTrue(lines[1] == "<O_O>")

                image1.seek(0)
                image2.seek(0)

            # Cannot create a task with images[], name, but invalid processing node parameter
            res = client.post("/api/projects/{}/tasks/".format(project.id), {
                'images': [image1, image2],
                'name': 'test_task',
                'processing_node': 9999
            }, format="multipart")
            self.assertTrue(res.status_code == status.HTTP_400_BAD_REQUEST)
            image1.seek(0)
            image2.seek(0)

            # Normal case with images[] parameter
            res = client.post("/api/projects/{}/tasks/".format(project.id), {
                'images': [image1, image2],
                'auto_processing_node': 'false'
            }, format="multipart")
            self.assertTrue(res.status_code == status.HTTP_201_CREATED)
            image1.seek(0)
            image2.seek(0)

            # Should have returned the id of the newly created task
            task = Task.objects.latest('created_at')
            self.assertTrue('id' in res.data)
            self.assertTrue(str(task.id) == res.data['id'])

            # Progress is at 0%
            self.assertEqual(task.running_progress, 0.0)

            # Two images should have been uploaded
            self.assertTrue(ImageUpload.objects.filter(task=task).count() == 2)

            # Can_rerun_from should be an empty list
            self.assertTrue(len(res.data['can_rerun_from']) == 0)

            # processing_node_name should be null
            self.assertTrue(res.data['processing_node_name'] is None)

            # No processing node is set
            self.assertTrue(task.processing_node is None)

            # EPSG should be null
            self.assertTrue(task.epsg is None)

            # tiles.json, bounds, metadata should not be accessible at this point
            tile_types = ['orthophoto', 'dsm', 'dtm']
            endpoints = ['tiles.json', 'bounds', 'metadata']
            for ep in endpoints:
                for tile_type in tile_types:
                    res = client.get("/api/projects/{}/tasks/{}/{}/{}".format(project.id, task.id, tile_type, ep))
                    self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

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
                self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

            # Cannot access raw assets (they don't exist yet)
            res = client.get("/api/projects/{}/tasks/{}/assets/odm_orthophoto/odm_orthophoto.tif".format(project.id, task.id))
            self.assertTrue(res.status_code == status.HTTP_404_NOT_FOUND)

            # Cannot assign processing node to a task we have no access to
            res = client.patch("/api/projects/{}/tasks/{}/".format(other_project.id, other_task.id), {
                'processing_node': pnode.id
            })
            self.assertTrue(res.status_code == status.HTTP_404_NOT_FOUND)

            # Cannot download/preview images for a task we have no access to
            res = client.get("/api/projects/{}/tasks/{}/images/thumbnail/tiny_drone_image.jpg".format(other_project.id, other_task.id))
            self.assertTrue(res.status_code == status.HTTP_404_NOT_FOUND)
            res = client.get("/api/projects/{}/tasks/{}/images/download/tiny_drone_image.jpg".format(other_project.id, other_task.id))
            self.assertTrue(res.status_code == status.HTTP_404_NOT_FOUND)

            # Cannot duplicate a task we have no access to
            res = client.post("/api/projects/{}/tasks/{}/duplicate/".format(other_project.id, other_task.id))
            self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

            # Cannot export orthophoto
            res = client.post("/api/projects/{}/tasks/{}/orthophoto/export".format(project.id, task.id), {
                'formula': 'NDVI',
                'bands': 'RGN'
            })
            self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

            # No UUID at this point
            self.assertTrue(len(task.uuid) == 0)

            # Assign processing node to task via API
            res = client.patch("/api/projects/{}/tasks/{}/".format(project.id, task.id), {
                'processing_node': pnode.id
            })
            self.assertTrue(res.status_code == status.HTTP_200_OK)

            # On update worker.tasks.process_pending_tasks should have been called in the background
            # (during tests this is sync)

            # Processing should have started and a UUID is assigned
            # Calling process pending tasks should finish the process
            # and invoke the plugins completed signal
            time.sleep(0.5)
            task.refresh_from_db()
            self.assertTrue(task.status in [status_codes.RUNNING, status_codes.COMPLETED])  # Sometimes this finishes before we get here
            self.assertTrue(len(task.uuid) > 0)

            with catch_signal(task_completed) as handler:
                retry_count = 0
                while task.status != status_codes.COMPLETED:
                    worker.tasks.process_pending_tasks()
                    time.sleep(DELAY)
                    task.refresh_from_db()
                    retry_count += 1
                    if retry_count > 10:
                        break

                self.assertEqual(task.status, status_codes.COMPLETED)

                # Progress is 100%
                self.assertTrue(task.running_progress == 1.0)

                time.sleep(0.5)

                handler.assert_any_call(
                    sender=Task,
                    task_id=task.id,
                    signal=task_completed,
                )

            # Processing node should have a "rerun_from" option
            pnode_rerun_from_opts = list(filter(lambda d: 'name' in d and d['name'] == 'rerun-from', pnode.available_options))[0]
            self.assertTrue(len(pnode_rerun_from_opts['domain']) > 0)

            # The can_rerun_from field of a task should now be populated
            # with the same values as the "rerun_from" domain values of
            # the processing node
            res = client.get("/api/projects/{}/tasks/{}/".format(project.id, task.id))
            self.assertTrue(res.status_code == status.HTTP_200_OK)
            self.assertTrue(pnode_rerun_from_opts['domain'] == res.data['can_rerun_from'])

            # processing_node_name should be the name of the pnode
            self.assertEqual(res.data['processing_node_name'], str(pnode))

            # Can download assets
            for asset in list(task.ASSETS_MAP.keys()):
                res = client.get("/api/projects/{}/tasks/{}/download/{}".format(project.id, task.id, asset))
                self.assertEqual(res.status_code, status.HTTP_200_OK)

            # We can stream downloads
            res = client.get("/api/projects/{}/tasks/{}/download/{}?_force_stream=1".format(project.id, task.id, list(task.ASSETS_MAP.keys())[0]))
            self.assertTrue(res.status_code == status.HTTP_200_OK)
            self.assertTrue(res.has_header('_stream'))

            # The tif files are valid Cloud Optimized GeoTIFF
            self.assertTrue(valid_cogeo(task.assets_path(task.ASSETS_MAP["orthophoto.tif"])))
            self.assertTrue(valid_cogeo(task.assets_path(task.ASSETS_MAP["dsm.tif"])))
            self.assertTrue(valid_cogeo(task.assets_path(task.ASSETS_MAP["dtm.tif"])))

            # A textured mesh archive file should not exist (it's generated on the fly)
            self.assertFalse(os.path.exists(task.assets_path(task.ASSETS_MAP["textured_model.zip"]["deferred_path"])))

            # Can download raw assets
            res = client.get("/api/projects/{}/tasks/{}/assets/odm_orthophoto/odm_orthophoto.tif".format(project.id, task.id))
            self.assertTrue(res.status_code == status.HTTP_200_OK)

            # Can export orthophoto (when formula and bands are specified)
            res = client.post("/api/projects/{}/tasks/{}/orthophoto/export".format(project.id, task.id), {
                'formula': 'NDVI'
            })
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
            res = client.post("/api/projects/{}/tasks/{}/orthophoto/export".format(project.id, task.id), {
                'bands': 'RGN'
            })
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

            res = client.post("/api/projects/{}/tasks/{}/orthophoto/export".format(project.id, task.id), {
                'formula': 'NDVI',
                'bands': 'RGN'
            })
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            reply = json.loads(res.content.decode("utf-8"))
            self.assertTrue("celery_task_id" in reply)
            celery_task_id = reply["celery_task_id"]

            # Can access thumbnails
            res = client.get("/api/projects/{}/tasks/{}/images/thumbnail/tiny_drone_image.jpg?size=4".format(project.id, task.id))
            self.assertTrue(res.status_code == status.HTTP_200_OK)
            with Image.open(io.BytesIO(res.content)) as i:
                # Thumbnail has been resized
                self.assertEqual(i.width, 4)
                self.assertEqual(i.height, 3)

            res = client.get("/api/projects/{}/tasks/{}/images/thumbnail/tiny_drone_image.jpg?size=9999999".format(project.id, task.id))
            self.assertTrue(res.status_code == status.HTTP_200_OK)
            with Image.open(io.BytesIO(res.content)) as i:
                # Thumbnail has been resized to the max allowed (oringinal image size)
                self.assertEqual(i.width, 48)
                self.assertEqual(i.height, 36)

            # Can plot points, recenter thumbnails, zoom
            res = client.get("/api/projects/{}/tasks/{}/images/thumbnail/tiny_drone_image.jpg?size=9999999&center_x=0.3&center_y=0.2&draw_point=0.4,0.4&point_color=ff0000&point_radius=3&zoom=2".format(project.id, task.id))
            self.assertTrue(res.status_code == status.HTTP_200_OK)
            with Image.open(io.BytesIO(res.content)) as i:
                # Thumbnail has been resized to the max allowed (oringinal image size)
                self.assertEqual(i.width, 48)
                self.assertEqual(i.height, 36)

            # Can download images
            res = client.get("/api/projects/{}/tasks/{}/images/download/tiny_drone_image.jpg".format(project.id, task.id))
            self.assertTrue(res.status_code == status.HTTP_200_OK)
            with Image.open(io.BytesIO(res.content)) as i:
                # Thumbnail has been resized
                self.assertEqual(i.width, 48)
                self.assertEqual(i.height, 36)

            # Cannot get thumbnails/download images that don't exist
            res = client.get("/api/projects/{}/tasks/{}/images/thumbnail/nonexistant.jpg".format(project.id, task.id))
            self.assertTrue(res.status_code == status.HTTP_404_NOT_FOUND)
            res = client.get("/api/projects/{}/tasks/{}/images/download/nonexistant.jpg".format(project.id, task.id))
            self.assertTrue(res.status_code == status.HTTP_404_NOT_FOUND)
            
            # Check export status
            res = client.get("/api/workers/check/{}".format(celery_task_id))
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            reply = json.loads(res.content.decode("utf-8"))
            self.assertTrue("ready" in reply)
            self.assertEqual(reply["ready"], True)

            # Can download exported orthophoto
            res = client.get("/api/workers/get/{}?filename=odm_orthophoto_NDVI.tif".format(celery_task_id))
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEquals(res.get('Content-Disposition'), "attachment; filename=odm_orthophoto_NDVI.tif")
            with Image.open(io.BytesIO(res.content)) as i:
                self.assertEqual(i.width, 212)
                self.assertEqual(i.height, 212)

            # Can access tiles.json, bounds and metadata
            for ep in endpoints:
                for tile_type in tile_types:
                    res = client.get("/api/projects/{}/tasks/{}/{}/{}".format(project.id, task.id, tile_type, ep))
                    self.assertTrue(res.status_code == status.HTTP_200_OK)

            # Bounds are what we expect them to be
            # (4 coords in lat/lon)
            res = client.get("/api/projects/{}/tasks/{}/orthophoto/tiles.json".format(project.id, task.id))
            tiles = json.loads(res.content.decode("utf-8"))
            self.assertTrue(len(tiles['bounds']) == 4)
            self.assertTrue(round(tiles['bounds'][0], 7) == -91.9945132)

            res = client.get("/api/projects/{}/tasks/{}/orthophoto/bounds".format(project.id, task.id))
            bounds = json.loads(res.content.decode("utf-8"))
            self.assertTrue(len(bounds['bounds']) == 4)
            self.assertTrue(round(bounds['bounds'][0], 7) == -91.9945132)

            # Metadata checks for orthophoto
            res = client.get("/api/projects/{}/tasks/{}/orthophoto/metadata".format(project.id, task.id))
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            metadata = json.loads(res.content.decode("utf-8"))
            fields = ['bounds', 'minzoom', 'maxzoom', 'statistics', 'algorithms', 'color_maps', 'tiles', 'scheme', 'name']
            for f in fields:
                self.assertTrue(f in metadata)

            self.assertEqual(metadata['minzoom'], 18 - ZOOM_EXTRA_LEVELS)
            self.assertEqual(metadata['maxzoom'], 18 + ZOOM_EXTRA_LEVELS)

            # Colormaps and algorithms should be empty lists
            self.assertEqual(metadata['algorithms'], [])
            self.assertEqual(metadata['color_maps'], [])

            # Address key is removed
            self.assertFalse('address' in metadata)

            # Scheme is xyz
            self.assertEqual(metadata['scheme'], 'xyz')

            # Tiles URL has no extra params
            self.assertTrue(metadata['tiles'][0].endswith('{z}/{x}/{y}'))

            # Histogram stats are available (3 bands for orthophoto)
            self.assertTrue(len(metadata['statistics']) == 3)
            for b in ['1', '2', '3']:
                self.assertEqual(len(metadata['statistics'][b]['histogram']), 2)
                self.assertEqual(len(metadata['statistics'][b]['histogram'][0]), 255)
                self.assertTrue('max' in metadata['statistics'][b])
                self.assertTrue('min' in metadata['statistics'][b])

            # Metadata with invalid formula
            res = client.get("/api/projects/{}/tasks/{}/orthophoto/metadata?formula=INVALID".format(project.id, task.id))
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

            # Metadata with a valid formula but invalid bands
            res = client.get("/api/projects/{}/tasks/{}/orthophoto/metadata?formula=NDVI&bands=ABC".format(project.id, task.id))
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

            # Medatata with valid formula and bands
            res = client.get("/api/projects/{}/tasks/{}/orthophoto/metadata?formula=NDVI&bands=RGN".format(project.id, task.id))
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            metadata = json.loads(res.content.decode("utf-8"))

            # Colormaps and algorithms are populated
            self.assertTrue(len(metadata['algorithms']) > 0)
            self.assertTrue(len(metadata['color_maps']) > 0)

            # Algorithms have valid keys
            for k in ['id', 'filters', 'expr', 'help']:
                for a in metadata['algorithms']:
                    self.assertTrue(k in a)
                    self.assertTrue(len(a['filters']) > 0)

            # Colormap is for algorithms
            self.assertEqual(len([x for x in metadata['color_maps'] if x['key'] == 'rdylgn']), 1)
            self.assertEqual(len([x for x in metadata['color_maps'] if x['key'] == 'pastel1']), 0)

            # Formula parameters are copied to tile URL
            self.assertTrue(metadata['tiles'][0].endswith('?formula=NDVI&bands=RGN'))

            # Histogram stats are available (1 band)
            self.assertTrue(len(metadata['statistics']) == 1)

            # Medatata with valid formula and bands that specifies a scale range
            res = client.get("/api/projects/{}/tasks/{}/orthophoto/metadata?formula=VARI".format(project.id, task.id))
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            metadata = json.loads(res.content.decode("utf-8"))
            self.assertTrue(len(metadata['statistics']) == 1)

            # Min/max values have been replaced
            self.assertEqual(metadata['statistics']['1']['min'], algos['VARI']['range'][0])
            self.assertEqual(metadata['statistics']['1']['max'], algos['VARI']['range'][1])

            tile_path = {
                'orthophoto': '17/32042/46185',
                'dsm': '18/64083/92370',
                'dtm': '18/64083/92370'
            }
            tile_path_512 = {
                'orthophoto': '18/32042/46185'
            }

            # Metadata for DSM/DTM
            for tile_type in ['dsm', 'dtm']:
                res = client.get("/api/projects/{}/tasks/{}/{}/metadata".format(project.id, task.id, tile_type))
                self.assertEqual(res.status_code, status.HTTP_200_OK)
                metadata = json.loads(res.content.decode("utf-8"))

                # Colormaps are populated
                self.assertTrue(len(metadata['color_maps']) > 0)

                # Colormaps are for elevation
                self.assertEqual(len([x for x in metadata['color_maps'] if x['key'] == 'rdylgn']), 0)
                self.assertEqual(len([x for x in metadata['color_maps'] if x['key'] == 'jet']), 1)

                # Algorithms are empty
                self.assertEqual(len(metadata['algorithms']), 0)

                # Min/max values are what we expect them to be
                self.assertEqual(len(metadata['statistics']), 1)
                self.assertEqual(round(metadata['statistics']['1']['min'], 2), 156.91)
                self.assertEqual(round(metadata['statistics']['1']['max'], 2), 164.94)

            # Can access individual tiles
            for tile_type in tile_types:
                res = client.get("/api/projects/{}/tasks/{}/{}/tiles/{}.png".format(project.id, task.id, tile_type, tile_path[tile_type]))
                self.assertEqual(res.status_code, status.HTTP_200_OK)

                with Image.open(io.BytesIO(res.content)) as i:
                    self.assertEqual(i.width, 256)
                    self.assertEqual(i.height, 256)

            # Can access retina tiles
            for tile_type in tile_types:
                res = client.get("/api/projects/{}/tasks/{}/{}/tiles/{}@2x.png".format(project.id, task.id, tile_type, tile_path[tile_type]))
                self.assertEqual(res.status_code, status.HTTP_200_OK)

                with Image.open(io.BytesIO(res.content)) as i:
                    self.assertEqual(i.width, 512)
                    self.assertEqual(i.height, 512)
            
            # Cannot set invalid scene
            res = client.post("/api/projects/{}/tasks/{}/3d/scene".format(project.id, task.id), json.dumps({ "garbage": "" }), content_type="application/json")
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

            # Can set scene
            res = client.post("/api/projects/{}/tasks/{}/3d/scene".format(project.id, task.id), json.dumps({ "type": "Potree" }), content_type="application/json")
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(res.data['success'], True)

            # Can set camera view
            res = client.post("/api/projects/{}/tasks/{}/3d/cameraview".format(project.id, task.id), json.dumps({ "position": [0,5,0], "target": [0,0,0] }), content_type="application/json")
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(res.data['success'], True)

            # Can read potree scene
            res = client.get("/api/projects/{}/tasks/{}/3d/scene".format(project.id, task.id))
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertListEqual(res.data['view']['position'], [0,5,0])
            self.assertListEqual(res.data['view']['target'], [0,0,0])

            # Setting scene does not change view key, even if specified
            res = client.post("/api/projects/{}/tasks/{}/3d/scene".format(project.id, task.id), json.dumps({ "type": "Potree", "view": { "position": [9,9,9], "target": [0,0,0] }, "measurements": [1, 2] }), content_type="application/json")
            self.assertEqual(res.status_code, status.HTTP_200_OK)

            res = client.get("/api/projects/{}/tasks/{}/3d/scene".format(project.id, task.id))
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertListEqual(res.data['view']['position'], [0,5,0])
            self.assertListEqual(res.data['measurements'], [1, 2])

            # Cannot access tile 0/0/0
            res = client.get("/api/projects/{}/tasks/{}/orthophoto/tiles/0/0/0.png".format(project.id, task.id))
            self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

            # Cannot access zoom levels outside of the allowed zoom levels
            res = client.get("/api/projects/{}/tasks/{}/orthophoto/tiles/14/32042/46185.png".format(project.id, task.id))
            self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
            res = client.get("/api/projects/{}/tasks/{}/orthophoto/tiles/20/32042/46185.png".format(project.id, task.id))
            self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

            # Can access hillshade, formulas, bands, rescale, color_map
            params = [
                ("dsm", "color_map=jet&hillshade=3&rescale=150,170", status.HTTP_200_OK),
                ("dsm", "color_map=jet&hillshade=0&rescale=150,170", status.HTTP_200_OK),
                ("dsm", "color_map=invalid&rescale=150,170", status.HTTP_400_BAD_REQUEST),
                ("dsm", "color_map=jet&rescale=invalid", status.HTTP_400_BAD_REQUEST),
                ("dsm", "color_map=jet&rescale=150,170&hillshade=invalid", status.HTTP_400_BAD_REQUEST),

                ("dtm", "hillshade=3", status.HTTP_200_OK),
                ("dtm", "hillshade=99999999999999999999999999999999999", status.HTTP_200_OK),
                ("dtm", "hillshade=-9999999999999999999999999999999999", status.HTTP_200_OK),
                ("dtm", "hillshade=0", status.HTTP_200_OK),

                ("orthophoto", "hillshade=3", status.HTTP_400_BAD_REQUEST),
                
                ("orthophoto", "", status.HTTP_200_OK),
                ("orthophoto", "formula=NDVI&bands=RGN", status.HTTP_200_OK),
                ("orthophoto", "formula=VARI&bands=RGN", status.HTTP_400_BAD_REQUEST),
                ("orthophoto", "formula=VARI&bands=RGB", status.HTTP_200_OK),
                ("orthophoto", "formula=VARI&bands=invalid", status.HTTP_400_BAD_REQUEST),
                ("orthophoto", "formula=invalid&bands=RGB", status.HTTP_400_BAD_REQUEST),

                ("orthophoto", "formula=NDVI&bands=RGN&color_map=rdylgn&rescale=-1,1", status.HTTP_200_OK),
                ("orthophoto", "formula=NDVI&bands=RGN&color_map=rdylgn&rescale=1,-1", status.HTTP_200_OK),

                ("orthophoto", "formula=NDVI&bands=RGN&color_map=invalid", status.HTTP_400_BAD_REQUEST),

                ("orthophoto", "boundaries=invalid", status.HTTP_400_BAD_REQUEST),
                ("orthophoto", "boundaries=%7B%22a%22%3A%20true%7D", status.HTTP_400_BAD_REQUEST),
                
                ("orthophoto", "boundaries=%7B%22type%22%3A%22Feature%22%2C%22properties%22%3A%7B%22Length%22%3A52.98642774268887%2C%22Area%22%3A139.71740455567166%7D%2C%22geometry%22%3A%7B%22type%22%3A%22Polygon%22%2C%22coordinates%22%3A%5B%5B%5B-91.993925%2C46.842686%5D%2C%5B-91.993928%2C46.842756%5D%2C%5B-91.994024%2C46.84276%5D%2C%5B-91.994018%2C46.842582%5D%2C%5B-91.993928%2C46.842585%5D%2C%5B-91.993925%2C46.842686%5D%5D%5D%7D%7D", status.HTTP_200_OK)
            ]

            for k in algos:
                a = algos[k]
                filters = get_camera_filters_for(a)

                for f in filters:
                    params.append(("orthophoto", "formula={}&bands={}&color_map=rdylgn".format(k, f), status.HTTP_200_OK))

            for tile_type, url, sc in params:
                res = client.get("/api/projects/{}/tasks/{}/{}/tiles/{}?{}".format(project.id, task.id, tile_type, tile_path[tile_type], url))
                self.assertEqual(res.status_code, sc)
            
            # Can request PNG/JPG/WEBP tiles explicitely
            for ext in ["png", "jpg", "webp"]:
                res = client.get("/api/projects/{}/tasks/{}/orthophoto/tiles/{}.{}".format(project.id, task.id, tile_path['orthophoto'], ext))
                self.assertEqual(res.status_code, status.HTTP_200_OK)
                self.assertEqual(res.get('content-type'), "image/" + ext)
            
            # Size is 256 by default
            res = client.get("/api/projects/{}/tasks/{}/orthophoto/tiles/{}.png".format(project.id, task.id, tile_path['orthophoto']))
            with Image.open(io.BytesIO(res.content)) as i:
                self.assertEqual(i.width, 256)
                self.assertEqual(i.height, 256)
            
            # Can request 512 tiles
            res = client.get("/api/projects/{}/tasks/{}/orthophoto/tiles/{}.png?size=512".format(project.id, task.id, tile_path_512['orthophoto']))
            with Image.open(io.BytesIO(res.content)) as i:
                self.assertEqual(i.width, 512)
                self.assertEqual(i.height, 512)
            
            # Cannot request invalid tiles sizes
            for s in ["1024", "abc", "-1"]:
                res = client.get("/api/projects/{}/tasks/{}/orthophoto/tiles/{}.png?size={}".format(project.id, task.id, tile_path['orthophoto'], s))
                self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
            
            # Another user does not have access to the resources
            other_client = APIClient()
            other_client.login(username="testuser2", password="test1234")

            def accessResources(expectedStatus):
                for tile_type in tile_types:
                    res = other_client.get("/api/projects/{}/tasks/{}/{}/tiles.json".format(project.id, task.id, tile_type))
                    self.assertEqual(res.status_code, expectedStatus)

                res = other_client.get("/api/projects/{}/tasks/{}/{}/tiles/{}.png".format(project.id, task.id, tile_type, tile_path[tile_type]))
                self.assertEqual(res.status_code, expectedStatus)

                res = other_client.get("/api/projects/{}/tasks/{}/".format(project.id, task.id))
                self.assertEqual(res.status_code, expectedStatus)

                res = other_client.get("/api/projects/{}/tasks/{}/3d/scene".format(project.id, task.id))
                self.assertEqual(res.status_code, expectedStatus)

            accessResources(status.HTTP_404_NOT_FOUND)

            # Original owner enables sharing
            res = client.patch("/api/projects/{}/tasks/{}/".format(project.id, task.id), {
                'public': True
            })
            self.assertTrue(res.status_code == status.HTTP_200_OK)

            # Now other user can acccess resources
            accessResources(status.HTTP_200_OK)

            # He cannot change a task
            res = other_client.patch("/api/projects/{}/tasks/{}/".format(project.id, task.id), {
                'name': "Changed! Uh oh"
            })
            self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

            # He cannot save a scene / change camera view
            res = other_client.post("/api/projects/{}/tasks/{}/3d/cameraview".format(project.id, task.id), json.dumps({ "position": [0,0,0], "target": [0,0,0] }), content_type="application/json")
            self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
            res = other_client.post("/api/projects/{}/tasks/{}/3d/scene".format(project.id, task.id), json.dumps({ "type": "Potree", "modified": True }), content_type="application/json")
            self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

            # User logs out
            other_client.logout()

            # He can still access the resources as anonymous
            accessResources(status.HTTP_200_OK)

            # Restart a task
            testWatch.clear()
            res = client.post("/api/projects/{}/tasks/{}/restart/".format(project.id, task.id))
            self.assertTrue(res.status_code == status.HTTP_200_OK)
            # process_task is called in the background
            task.refresh_from_db()

            self.assertTrue(task.status in [status_codes.RUNNING, status_codes.COMPLETED])

            # Should return without issues
            task.check_if_canceled()

            # Cancel a task
            res = client.post("/api/projects/{}/tasks/{}/cancel/".format(project.id, task.id))
            self.assertTrue(res.status_code == status.HTTP_200_OK)

            # task is processed right away

            # Should have been canceled
            task.refresh_from_db()
            self.assertTrue(task.status == status_codes.CANCELED)
            self.assertTrue(task.pending_action is None)

            # Manually set pending action
            task.pending_action = pending_actions.CANCEL
            task.save()

            # Should raise TaskInterruptedException
            self.assertRaises(TaskInterruptedException, task.check_if_canceled)

            # Restore
            task.pending_action = None
            task.save()

            # Remove a task and verify that it calls the proper plugins signals
            with catch_signal(task_removing) as h1:
                with catch_signal(task_removed) as h2:
                    res = client.post("/api/projects/{}/tasks/{}/remove/".format(project.id, task.id))
                    self.assertTrue(res.status_code == status.HTTP_200_OK)

            h1.assert_called_once_with(sender=Task, task_id=task.id, signal=task_removing)
            h2.assert_called_once_with(sender=Task, task_id=task.id, signal=task_removed)

            # task is processed right away

            # Has been removed along with assets
            self.assertFalse(Task.objects.filter(pk=task.id).exists())
            self.assertFalse(ImageUpload.objects.filter(task=task).exists())

            task_assets_path = os.path.join(settings.MEDIA_ROOT, task_directory_path(task.id, task.project.id))
            self.assertFalse(os.path.exists(task_assets_path))


        # Create a task
        res = client.post("/api/projects/{}/tasks/".format(project.id), {
            'images': [image1, image2],
            'name': 'test_task_offline',
            'processing_node': pnode.id,
            'auto_processing_node': 'false'
        }, format="multipart")
        self.assertTrue(res.status_code == status.HTTP_201_CREATED)
        task = Task.objects.get(pk=res.data['id'])
        image1.seek(0)
        image2.seek(0)

        # Processing should fail and set an error
        task.refresh_from_db()
        self.assertTrue(task.last_error is not None)
        self.assertTrue(task.status == status_codes.FAILED)

        # Now bring it back online
        with start_processing_node():

            # Restart
            res = client.post("/api/projects/{}/tasks/{}/restart/".format(project.id, task.id))
            self.assertTrue(res.status_code == status.HTTP_200_OK)
            task.refresh_from_db()

            # After processing, the task should have restarted, and have no UUID or status
            self.assertTrue(task.status is None)
            self.assertTrue(len(task.uuid) == 0)

            # Another step and it should have acquired a UUID
            worker.tasks.process_pending_tasks()
            task.refresh_from_db()
            self.assertTrue(task.status in [status_codes.RUNNING, status_codes.COMPLETED])
            self.assertTrue(len(task.uuid) > 0)

            # Another step and it should be completed
            time.sleep(DELAY)
            worker.tasks.process_pending_tasks()
            task.refresh_from_db()
            self.assertTrue(task.status == status_codes.COMPLETED)


            # Test rerun-from clearing mechanism:

            # 1 .Set some task options, including rerun_from
            task.options = [{'name': 'mesh-size', 'value':1000},
                            {'name': 'rerun-from', 'value': 'odm_meshing'}]
            task.save()

            # 2. Remove the task directly from node-odm (simulate a task purge)
            self.assertTrue(task.processing_node.remove_task(task.uuid))

            # 3. Restart the task
            res = client.post("/api/projects/{}/tasks/{}/restart/".format(project.id, task.id))
            self.assertTrue(res.status_code == status.HTTP_200_OK)

            # 4. Check that the rerun_from parameter has been cleared
            #   but the other parameters are still set
            task.refresh_from_db()
            self.assertTrue(len(task.uuid) == 0)
            self.assertTrue(len(list(filter(lambda d: d['name'] == 'rerun-from', task.options))) == 0)
            self.assertTrue(len(list(filter(lambda d: d['name'] == 'mesh-size', task.options))) == 1)

            # Test connection, timeout errors
            def connTimeout(*args, **kwargs):
                raise requests.exceptions.ConnectTimeout("Simulated timeout")

            testWatch.intercept("nodeodm.api_client.task_output", connTimeout)
            worker.tasks.process_pending_tasks()

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

        # Restart node-odm as to not generate orthophotos
        testWatch.clear()
        with start_processing_node(["--test_skip_orthophotos"]):
            res = client.post("/api/projects/{}/tasks/".format(project.id), {
                'images': [image1, image2],
                'name': 'test_task_no_orthophoto',
                'processing_node': pnode.id,
                'auto_processing_node': 'false'
            }, format="multipart")
            self.assertTrue(res.status_code == status.HTTP_201_CREATED)

            worker.tasks.process_pending_tasks()
            time.sleep(DELAY)
            worker.tasks.process_pending_tasks()

            task = Task.objects.get(pk=res.data['id'])
            self.assertEqual(task.status, status_codes.COMPLETED)

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

            # EPSG should be populated
            self.assertEqual(task.epsg, 32615)

            # Can access only tiles of available assets
            res = client.get("/api/projects/{}/tasks/{}/dsm/tiles.json".format(project.id, task.id))
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            res = client.get("/api/projects/{}/tasks/{}/dtm/tiles.json".format(project.id, task.id))
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            res = client.get("/api/projects/{}/tasks/{}/orthophoto/tiles.json".format(project.id, task.id))
            self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

            # Available assets should be missing orthophoto.tif type
            # but others such as textured_model.zip should be available
            res = client.get("/api/projects/{}/tasks/{}/".format(project.id, task.id))
            self.assertFalse('orthophoto.tif' in res.data['available_assets'])
            self.assertFalse('orthophoto_tiles.zip' in res.data['available_assets'])
            self.assertTrue('textured_model.zip' in res.data['available_assets'])

        # Can duplicate a task
        res = client.post("/api/projects/{}/tasks/{}/duplicate/".format(project.id, task.id))
        self.assertTrue(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['success'])
        new_task_id = res.data['task']['id']
        self.assertNotEqual(res.data['task']['id'], task.id)
        
        new_task = Task.objects.get(pk=new_task_id)

        # New task has same number of image uploads
        self.assertEqual(task.imageupload_set.count(), new_task.imageupload_set.count())
        
        # Directories have been created
        self.assertTrue(os.path.exists(new_task.task_path()))

        image1.close()
        image2.close()
        multispec_image.close()
        gcp.close()

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

        worker.tasks.process_pending_tasks()

        # A processing node should not have been assigned
        task.refresh_from_db()
        self.assertTrue(task.processing_node is None)

        # Remove error
        task.last_error = None
        task.save()

        worker.tasks.process_pending_tasks()

        # A processing node should not have been assigned because no processing nodes are online
        task.refresh_from_db()
        self.assertTrue(task.processing_node is None)

        # Bring a processing node online
        pnode.last_refreshed = timezone.now()
        pnode.save()
        self.assertTrue(pnode.is_online())

        # A processing node has been assigned
        worker.tasks.process_pending_tasks()
        task.refresh_from_db()
        self.assertTrue(task.processing_node.id == pnode.id)

        # Task should have failed (no images provided, invalid host...)
        self.assertTrue(task.last_error is not None)

        # Bring another processing node online, and bring the old one offline
        pnode.last_refreshed = timezone.now() - timedelta(minutes=settings.NODE_OFFLINE_MINUTES)
        pnode.save()

        another_pnode.last_refreshed = timezone.now()
        another_pnode.save()

        # Remove error, set status to queued
        task.last_error = None
        task.status = status_codes.QUEUED
        task.save()

        worker.tasks.process_pending_tasks()

        # Processing node is now cleared and a new one will be assigned on the next tick
        task.refresh_from_db()
        self.assertTrue(task.processing_node is None)
        self.assertTrue(task.status is None)

        worker.tasks.process_pending_tasks()

        task.refresh_from_db()
        self.assertTrue(task.processing_node.id == another_pnode.id)

        # Set task to queued, bring node offline
        task.last_error = None
        task.status = status_codes.RUNNING
        task.save()
        another_pnode.last_refreshed = timezone.now() - timedelta(minutes=settings.NODE_OFFLINE_MINUTES)
        another_pnode.save()

        worker.tasks.process_pending_tasks()
        task.refresh_from_db()

        # Processing node is still there, but task should have failed
        self.assertTrue(task.status == status_codes.FAILED)
        self.assertTrue("Processing node went offline." in task.last_error)


    def test_task_manual_processing_node(self):
        user = User.objects.get(username="testuser")
        project = Project.objects.create(name="User Test Project", owner=user)
        task = Task.objects.create(project=project, name="Test", auto_processing_node=False)

        # Bring a processing node online
        pnode = ProcessingNode.objects.create(hostname="invalid-host", port=11223)
        pnode.last_refreshed = timezone.now()
        pnode.save()
        self.assertTrue(pnode.is_online())

        worker.tasks.process_pending_tasks()

        # A processing node should not have been assigned because we asked
        # not to via auto_processing_node = false
        task.refresh_from_db()
        self.assertTrue(task.processing_node is None)

    def test_task_chunked_uploads(self):
        with start_processing_node():
            client = APIClient()

            user = User.objects.get(username="testuser")
            self.assertFalse(user.is_superuser)

            project = Project.objects.create(
                owner=user,
                name="test project"
            )

            pnode = ProcessingNode.objects.create(hostname="localhost", port=11223)

            # task creation via chunked upload
            image1 = open("app/fixtures/tiny_drone_image.jpg", 'rb')
            image2 = open("app/fixtures/tiny_drone_image_2.jpg", 'rb')

            # Cannot create partial task without credentials
            res = client.post("/api/projects/{}/tasks/".format(project.id), {
                'auto_processing_node': 'true',
                'partial': 'true'
            }, format="multipart")
            self.assertTrue(res.status_code == status.HTTP_403_FORBIDDEN);

            client.login(username="testuser", password="test1234")

            # Can after login
            res = client.post("/api/projects/{}/tasks/".format(project.id), {
                'auto_processing_node': 'true',
                'partial': 'true'
            }, format="multipart")
            self.assertTrue(res.status_code == status.HTTP_201_CREATED)

            task = Task.objects.get(pk=res.data['id'])

            # It's partial
            self.assertTrue(task.partial)

            # It should not get processed
            worker.tasks.process_pending_tasks()
            time.sleep(DELAY)
            self.assertEqual(task.upload_progress, 0.0)

            # Upload to inexisting task lead to 404
            wrong_task_id = '11111111-1111-1111-1111-111111111111'
            res = client.post("/api/projects/{}/tasks/{}/upload/".format(project.id, wrong_task_id), {
                'images': [image1],
            }, format="multipart")
            self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
            image1.seek(0)

            # Upload works with one image
            res = client.post("/api/projects/{}/tasks/{}/upload/".format(project.id, task.id), {
                'images': [image1],
            }, format="multipart")
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(res.data['success'], True)
            image1.seek(0)

            # Cannot commit with a single image
            res = client.post("/api/projects/{}/tasks/{}/commit/".format(project.id, task.id))
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

            # And second image
            res = client.post("/api/projects/{}/tasks/{}/upload/".format(project.id, task.id), {
                'images': [image2],
            }, format="multipart")
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(res.data['success'], True)
            image2.seek(0)

            # Task hasn't started
            self.assertEqual(task.upload_progress, 0.0)

            # Can commit with two images
            res = client.post("/api/projects/{}/tasks/{}/commit/".format(project.id, task.id))
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(res.data['id'], str(task.id))

            task.refresh_from_db()

            # No longer partial
            self.assertFalse(task.partial)

            # Image count has been updated
            self.assertEqual(task.images_count, 2)

            # Make sure processing begins
            worker.tasks.process_pending_tasks()
            time.sleep(DELAY)

            task.refresh_from_db()
            self.assertEqual(task.upload_progress, 1.0)

            image1.close()
            image2.close()
