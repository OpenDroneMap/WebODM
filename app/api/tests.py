from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from app.models import Project
from django.contrib.auth.models import User

from app.boot import boot

class TestApi(TestCase):

    fixtures = ['test_users', ]

    @classmethod
    def setUpClass(cls):
        super(TestApi, cls).setUpClass()
        boot()

    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_project_list(self):
        client = APIClient()

        nonstaff_user = User.objects.get(username="testuser2")
        self.assertFalse(nonstaff_user.is_superuser)

        project = Project.objects.create(
                owner=nonstaff_user,
                name="test project"
            )
        other_project = Project.objects.create(
                owner=User.objects.get(username="testuser3"),
                name="another test project"
            )

        # Forbidden without credentials
        res = client.get('/api/projects/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        
        client.login(username="testuser2", password="test1234")
        res = client.get('/api/projects/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data["results"]) > 0)

        res = client.get('/api/projects/{}/'.format(project.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = client.get('/api/projects/dasjkldas/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        res = client.get('/api/projects/{}/'.format(other_project.id))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Can filter
        res = client.get('/api/projects/?owner=-1')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data["results"]) == 0)

        # Cannot list somebody else's project without permission
        res = client.get('/api/projects/?id={}'.format(other_project.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data["results"]) == 0)
