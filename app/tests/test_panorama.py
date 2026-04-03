import io
import os
import shutil

from PIL import Image
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient

from app.models import Project, Task
from app.tests.classes import BootTestCase


class TestPanorama(BootTestCase):
    def setUp(self):
        pass
    def tearDown(self):
        pass

    def test_panorama_tiles(self):
        user = User.objects.get(username="testuser")
        project = Project.objects.create(owner=user, name="pano test")
        task = Task.objects.create(project=project)
        client = APIClient()
        client.login(username="testuser", password="test1234")
        other_client = APIClient()
        other_client.login(username="testuser2", password="test1234")

        media_dir = task.media_directory_path()
        os.makedirs(media_dir, exist_ok=True)

        filepath = os.path.join(media_dir, 'pano.jpg')
        Image.new('RGB', (4000, 2000), color='green').save(filepath, 'JPEG')

        task.media = [{'type': 'pano', 'filename': 'pano.jpg', 'size': 1000}]
        task.save()

        # No access from another user
        res = other_client.get("/api/projects/{}/tasks/{}/media/panorama/pano.jpg/tiles/1/f/0/0.jpg".format(project.id, task.id))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        FACE_LETTERS = ['f', 'b', 'u', 'd', 'l', 'r']
        for f in FACE_LETTERS:
            res = client.get("/api/projects/{}/tasks/{}/media/panorama/pano.jpg/tiles/1/{}/0/0.jpg".format(project.id, task.id, f))
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(res['Content-Type'], 'image/jpeg')

        # Invalid face
        res = client.get("/api/projects/{}/tasks/{}/media/panorama/pano.jpg/tiles/1/z/0/0.jpg".format(project.id, task.id))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # Invalid level (0)
        res = client.get("/api/projects/{}/tasks/{}/media/panorama/pano.jpg/tiles/0/f/0/0.jpg".format(project.id, task.id))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
