import logging
import os
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
        
        # Other user does not own the project
        self.assertFalse(res.data['owned'])

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

        # Current user owns the project
        self.assertTrue(res.data['owned'])

        perms = get_perms(user, project)
        self.assertEqual(len(perms), 4)

        # Re-add permissions for other user
        res = client.post("/api/projects/{}/edit/".format(project.id), {
            'permissions': [{'username': 'testuser2', 'permissions': ['view', 'add', 'change', 'delete']}]
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Other user deletes project
        res = other_client.delete("/api/projects/{}/".format(project.id))
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        project.refresh_from_db()

        # Other user can no longer see the project (permissions have been revoked)
        res = other_client.get("/api/projects/{}/".format(project.id))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        perms = get_perms(other_user, project)
        self.assertEqual(len(perms), 0)
        
        # Project is still there
        res = client.get("/api/projects/{}/".format(project.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Simulate some folders
        project_dir = project.get_project_dir()
        task_dir = os.path.join(project_dir, "task")

        os.makedirs(task_dir, exist_ok=True)
        self.assertTrue(os.path.isdir(task_dir))

        # Delete the project
        res = client.delete('/api/projects/{}/'.format(project.id))
        self.assertTrue(res.status_code == status.HTTP_204_NO_CONTENT)
        
        # Folders should have been deleted
        self.assertFalse(os.path.isdir(task_dir))
        self.assertFalse(os.path.isdir(project_dir))

        # Recreate, but this time add some content in the task folder
        project = Project.objects.create(
            owner=user,
            name="test project"
        )
        project_dir = project.get_project_dir()
        task_dir = os.path.join(project_dir, "task", "123", "assets")

        os.makedirs(task_dir, exist_ok=True)
        self.assertTrue(os.path.isdir(task_dir))

        # Delete the project
        res = client.delete('/api/projects/{}/'.format(project.id))
        self.assertTrue(res.status_code == status.HTTP_204_NO_CONTENT)

        # The folder should still be there because it wasn't empty
        self.assertTrue(os.path.isdir(task_dir))
        self.assertTrue(os.path.isdir(project_dir))

        


        