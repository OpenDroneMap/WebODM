import logging

import json
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient

from app.models import Project, Task
from app.tests.classes import BootTestCase

logger = logging.getLogger('app.logger')

class TestApiTags(BootTestCase):
    def setUp(self):
        super().setUp()

    def test_tags(self):
        client = APIClient()
        client.login(username="testuser", password="test1234")

        user = User.objects.get(username="testuser")
        project = Project.objects.create(
            owner=user,
            name="test project",
            tags="a b c .hidden"
        )

        # Can retrieve tags
        res = client.get("/api/projects/{}/".format(project.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(4, len(res.data['tags']))

        # Can update tags
        res = client.post("/api/projects/{}/edit/".format(project.id), {
            'tags': ["b", "c", ".hidden"]
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        project.refresh_from_db()
        self.assertEqual(project.tags, "b c .hidden")

        # Can search projects by tag
        project2 = Project.objects.create(
            owner=user,
            name="test project2",
            tags="c d"
        )

        res = client.get("/api/projects/?search=:c")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(2, len(res.data))

        res = client.get("/api/projects/?search=:d")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(1, len(res.data))

        # Can search projects by name
        res = client.get("/api/projects/?search=project2")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(1, len(res.data))

        Task.objects.create(project=project, name="TestTask0")
        task = Task.objects.create(project=project, name="TestTask1", tags="d .hidden")
        task2 = Task.objects.create(project=project2, name="TestTask2", tags="ee .hidden")
        
        # Can retrieve task tags
        res = client.get("/api/projects/{}/tasks/{}/".format(project.id, task.id))
        self.assertEqual(2, len(res.data['tags']))

        # Can update task tags
        res = client.patch("/api/projects/{}/tasks/{}/".format(project.id, task.id), {
            'tags': ["d", "e", ".hidden"]
        }, format="json")
        self.assertTrue(res.status_code == status.HTTP_200_OK)

        task.refresh_from_db()
        self.assertEqual(task.tags, "d e .hidden")

        # Can search task tags
        res = client.get("/api/projects/?search=::e")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(1, len(res.data))
        self.assertEqual(res.data[0]['tasks'][0], task.id)

        res = client.get("/api/projects/?search=::hidden")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(2, len(res.data))

        # Can search task names
        res = client.get("/api/projects/?search=TestTask2")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(1, len(res.data))
        self.assertEqual(res.data[0]['tasks'][0], task2.id)

        # Can search by username
        res = client.get("/api/projects/?search=@tEstUsEr")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(3, len(res.data))

        # Can search by username and task name
        res = client.get("/api/projects/?search=@tEstUsEr%20TestTask2")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(1, len(res.data))

        # Bad username
        res = client.get("/api/projects/?search=@TestTask2")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(0, len(res.data))