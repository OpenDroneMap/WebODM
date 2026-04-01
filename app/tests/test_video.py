import os
import shutil

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient

from app.models import Project, Task
from app.tests.classes import BootTestCase


class TestVideo(BootTestCase):
    def setUp(self):
        pass
    def tearDown(self):
        pass

    def test_flightpath(self):
        user = User.objects.get(username="testuser")
        project = Project.objects.create(owner=user, name="video test")
        task = Task.objects.create(project=project)
        client = APIClient()
        client.login(username="testuser", password="test1234")

        other_client = APIClient()
        other_client.login(username="testuser2", password="test1234")

        media_dir = task.media_directory_path()
        os.makedirs(media_dir, exist_ok=True)

        video_path = os.path.join(media_dir, 'flight.mp4')
        with open(video_path, 'w') as f:
            f.write(' ')

        shutil.copy(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'fixtures', 'video.srt'), 
                    os.path.join(media_dir, 'flight.srt'))

        task.media = [{'type': 'video', 'filename': 'flight.mp4', 'size': 1234}]
        task.save()

        # No access from another user
        res = other_client.get("/api/projects/{}/tasks/{}/media/video/flight.mp4/flightpath.geojson".format(project.id, task.id))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # 404 for invalid filename
        res = client.get("/api/projects/{}/tasks/{}/media/video/nonexistant.mp4/flightpath.geojson".format(project.id, task.id))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        res = client.get("/api/projects/{}/tasks/{}/media/video/flight.mp4/flightpath.geojson".format(project.id, task.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['type'], 'Feature')
        self.assertEqual(res.data['geometry']['type'], 'LineString')
        self.assertTrue(len(res.data['geometry']['coordinates']) >= 2)
        self.assertIn('timestamps', res.data['properties'])

        # 404 when no SRT
        os.remove(os.path.join(media_dir, 'flight.srt'))
        res = client.get("/api/projects/{}/tasks/{}/media/video/flight.mp4/flightpath.geojson".format(project.id, task.id))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
