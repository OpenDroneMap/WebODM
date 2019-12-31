import os
import time

import io
import requests
from django.contrib.auth.models import User
from guardian.shortcuts import remove_perm, assign_perm
from rest_framework import status
from rest_framework.test import APIClient

import worker
from app.cogeo import valid_cogeo
from app.models import Project
from app.models import Task
from app.tests.classes import BootTransactionTestCase
from app.tests.utils import clear_test_media_root, start_processing_node
from nodeodm import status_codes
from nodeodm.models import ProcessingNode
from webodm import settings


class TestApiTask(BootTransactionTestCase):
    def setUp(self):
        super().setUp()
        clear_test_media_root()

    def test_task(self):
        client = APIClient()

        with start_processing_node():
            user = User.objects.get(username="testuser")
            self.assertFalse(user.is_superuser)
            project = Project.objects.create(
                owner=user,
                name="test project"
            )

            image1 = open("app/fixtures/tiny_drone_image.jpg", 'rb')
            image2 = open("app/fixtures/tiny_drone_image_2.jpg", 'rb')

            # Create processing node
            pnode = ProcessingNode.objects.create(hostname="localhost", port=11223)
            client.login(username="testuser", password="test1234")

            # Create task
            res = client.post("/api/projects/{}/tasks/".format(project.id), {
                'images': [image1, image2]
            }, format="multipart")
            image1.close()
            image2.close()
            task = Task.objects.get(id=res.data['id'])

            # Wait for completion
            c = 0
            while c < 10:
                worker.tasks.process_pending_tasks()
                task.refresh_from_db()
                if task.status == status_codes.COMPLETED:
                    break
                c += 1
                time.sleep(1)


            self.assertEqual(task.status, status_codes.COMPLETED)

            # Download task assets
            task_uuid = task.uuid
            res = client.get("/api/projects/{}/tasks/{}/download/all.zip".format(project.id, task.id))
            self.assertEqual(res.status_code, status.HTTP_200_OK)

            if not os.path.exists(settings.MEDIA_TMP):
                os.mkdir(settings.MEDIA_TMP)

            assets_path = os.path.join(settings.MEDIA_TMP, "all.zip")

            with open(assets_path, 'wb') as f:
                f.write(res.content)

            remove_perm('change_project', user, project)

            assets_file = open(assets_path, 'rb')

            # Cannot import unless we have permission
            res = client.post("/api/projects/{}/tasks/import".format(project.id), {
                'file': [assets_file]
            }, format="multipart")
            self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

            assign_perm('change_project', user, project)

            # Import with file upload method
            assets_file.seek(0)
            res = client.post("/api/projects/{}/tasks/import".format(project.id), {
                'file': [assets_file]
            }, format="multipart")
            self.assertEqual(res.status_code, status.HTTP_201_CREATED)
            assets_file.close()

            file_import_task = Task.objects.get(id=res.data['id'])
            # Wait for completion
            c = 0
            while c < 10:
                worker.tasks.process_pending_tasks()
                file_import_task.refresh_from_db()
                if file_import_task.status == status_codes.COMPLETED:
                    break
                c += 1
                time.sleep(1)

            self.assertEqual(file_import_task.import_url, "file://all.zip")
            self.assertEqual(file_import_task.images_count, 1)
            self.assertEqual(file_import_task.processing_node, None)
            self.assertEqual(file_import_task.auto_processing_node, False)

            # Can access assets
            res = client.get("/api/projects/{}/tasks/{}/assets/odm_orthophoto/odm_orthophoto.tif".format(project.id, file_import_task.id))
            self.assertEqual(res.status_code, status.HTTP_200_OK)

            self.assertTrue(valid_cogeo(file_import_task.assets_path(task.ASSETS_MAP["orthophoto.tif"])))
            self.assertTrue(valid_cogeo(file_import_task.assets_path(task.ASSETS_MAP["dsm.tif"])))
            self.assertTrue(valid_cogeo(file_import_task.assets_path(task.ASSETS_MAP["dtm.tif"])))

            # Set task public so we can download from it without auth
            file_import_task.public = True
            file_import_task.save()

            # Import with URL method
            assets_import_url = "http://{}:{}/task/{}/download/all.zip".format(pnode.hostname, pnode.port, task_uuid)
            res = client.post("/api/projects/{}/tasks/import".format(project.id), {
                'url': assets_import_url
            })
            self.assertEqual(res.status_code, status.HTTP_201_CREATED)
            url_task = Task.objects.get(id=res.data['id'])

            # Wait for completion
            c = 0
            while c < 10:
                worker.tasks.process_pending_tasks()
                url_task.refresh_from_db()
                if url_task.status == status_codes.COMPLETED:
                    break
                c += 1
                time.sleep(1)

            self.assertEqual(url_task.import_url, assets_import_url)
            self.assertEqual(url_task.images_count, 1)

            # Import corrupted file
            assets_import_url = "http://{}:{}/task/{}/download/orthophoto.tif".format(pnode.hostname, pnode.port, task_uuid)
            res = client.post("/api/projects/{}/tasks/import".format(project.id), {
                'url': assets_import_url
            })
            self.assertEqual(res.status_code, status.HTTP_201_CREATED)
            corrupted_task = Task.objects.get(id=res.data['id'])

            # Wait for completion
            c = 0
            while c < 10:
                worker.tasks.process_pending_tasks()
                corrupted_task.refresh_from_db()
                if corrupted_task.status == status_codes.FAILED:
                    break
                c += 1
                time.sleep(1)

            self.assertEqual(corrupted_task.status, status_codes.FAILED)
            self.assertTrue("Invalid" in corrupted_task.last_error)

