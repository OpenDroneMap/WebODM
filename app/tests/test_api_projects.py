import logging
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient
from app.models import Project
from .classes import BootTestCase
from guardian.shortcuts import get_perms

from webodm import settings
logger = logging.getLogger('app.logger')


class TestApiProjects(BootTestCase):
    def setUp(self):
        super().setUp()

    def tearDown(self):
        super().tearDown()

    def test_project(self):
        client = APIClient()

        user = User.objects.get(username="testuser")
        project = Project.objects.create(
            owner=user,
            name="test project"
        )

        # Cannot edit project (anonymous)
        res = client.post("/api/projects/{}/edit/".format(project.id), {
            'name': 'edited'
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        client.login(username="testuser", password="test1234")

         # Can edit project
        res = client.post("/api/projects/{}/edit/".format(project.id), {
            'name': 'edited'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        project.refresh_from_db()

        self.assertEqual(project.name, 'edited')
        self.assertEqual(project.description, '')

        other_user = User.objects.get(username="testuser2")

        other_client = APIClient()
        other_client.login(username="testuser2", password="test1234")

        # Other user cannot edit project
        res = other_client.post("/api/projects/{}/edit/".format(project.id), {
            'name': 'edited2'
        })
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # Other user cannot see project
        res = other_client.get("/api/projects/{}/".format(project.id))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # Change permissions via API
        res = client.post("/api/projects/{}/edit/".format(project.id), {
            'permissions': [{'username': 'testuser2', 'permissions': ['view']}]
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Other user can see project
        res = other_client.get("/api/projects/{}/".format(project.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Other user still cannot edit project
        res = other_client.post("/api/projects/{}/edit/".format(project.id), {
            'name': 'edited2'
        })
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # Change permissions again
        res = client.post("/api/projects/{}/edit/".format(project.id), {
            'permissions': [{'username': 'testuser2', 'permissions': ['view', 'add', 'change', 'delete']}]
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Other user can now edit
        res = other_client.post("/api/projects/{}/edit/".format(project.id), {
            'name': 'edited3'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        project.refresh_from_db()
        self.assertEqual(project.name, 'edited3')

        # Can remove permissions
        res = client.post("/api/projects/{}/edit/".format(project.id), {
            'permissions': []
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Other user cannot see project
        res = other_client.get("/api/projects/{}/".format(project.id))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # Current user (owner) still has permissions
        res = client.get("/api/projects/{}/".format(project.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        perms = get_perms(user, project)
        self.assertEqual(len(perms), 4)