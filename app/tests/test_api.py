from .classes import BootTestCase
from rest_framework.test import APIClient
from rest_framework import status

from app.models import Project, Task
from nodeodm.models import ProcessingNode
from django.contrib.auth.models import User

class TestApi(BootTestCase):
    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_projects_and_tasks(self):
        client = APIClient()

        user = User.objects.get(username="testuser")
        self.assertFalse(user.is_superuser)

        project = Project.objects.create(
                owner=user,
                name="test project"
            )
        other_project = Project.objects.create(
                owner=User.objects.get(username="testuser2"),
                name="another test project"
            )

        # Forbidden without credentials
        res = client.get('/api/projects/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        
        client.login(username="testuser", password="test1234")
        res = client.get('/api/projects/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data["results"]) > 0)

        res = client.get('/api/projects/{}/'.format(project.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = client.get('/api/projects/dasjkldas/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        res = client.get('/api/projects/{}/'.format(other_project.id))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # Can filter
        res = client.get('/api/projects/?owner=999')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data["results"]) == 0)

        # Cannot list somebody else's project without permission
        res = client.get('/api/projects/?id={}'.format(other_project.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data["results"]) == 0)

        # Can access individual project
        res = client.get('/api/projects/{}/'.format(project.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["id"] == project.id)

        # Cannot access project for which we have no access to
        res = client.get('/api/projects/{}/'.format(other_project.id))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


        # Create some tasks
        task = Task.objects.create(project=project)
        task2 = Task.objects.create(project=project)
        other_task = Task.objects.create(project=other_project)

        # Can list project tasks to a project we have access to
        res = client.get('/api/projects/{}/tasks/'.format(project.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data) == 2)

        # Can sort
        res = client.get('/api/projects/{}/tasks/?ordering=id'.format(project.id))
        self.assertTrue(res.data[0]['id'] == task.id)
        self.assertTrue(res.data[1]['id'] == task2.id)

        res = client.get('/api/projects/{}/tasks/?ordering=-id'.format(project.id))
        self.assertTrue(res.data[0]['id'] == task2.id)
        self.assertTrue(res.data[1]['id'] == task.id)

        # Cannot list project tasks for a project we don't have access to
        res = client.get('/api/projects/{}/tasks/'.format(other_project.id))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # Cannot list project tasks for a project that doesn't exist
        res = client.get('/api/projects/999/tasks/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        
        # Can list task details for a task belonging to a project we have access to
        res = client.get('/api/projects/{}/tasks/{}/'.format(project.id, task.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["id"] == task.id)

        # images_count field exists
        self.assertTrue(res.data["images_count"] == 0)

        # Get console output
        res = client.get('/api/projects/{}/tasks/{}/?output_only=true'.format(project.id, task.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data == "")

        task.console_output = "line1\nline2\nline3"
        task.save()

        res = client.get('/api/projects/{}/tasks/{}/?output_only=true'.format(project.id, task.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data == task.console_output)

        # Console output with line num
        res = client.get('/api/projects/{}/tasks/{}/?output_only=true&line=2'.format(project.id, task.id))
        self.assertTrue(res.data == "line3")

        # Console output with line num out of bounds
        res = client.get('/api/projects/{}/tasks/{}/?output_only=true&line=3'.format(project.id, task.id))
        self.assertTrue(res.data == "")
        res = client.get('/api/projects/{}/tasks/{}/?output_only=true&line=-1'.format(project.id, task.id))
        self.assertTrue(res.data == task.console_output)

        # Cannot list task details for a task belonging to a project we don't have access to
        res = client.get('/api/projects/{}/tasks/{}/'.format(other_project.id, other_task.id))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # As above, but by trying to trick the API by using a project we have access to
        res = client.get('/api/projects/{}/tasks/{}/'.format(project.id, other_task.id))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # Cannot access task details for a task that doesn't exist
        res = client.get('/api/projects/{}/tasks/999/'.format(project.id, other_task.id))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # Can update a task
        res = client.patch('/api/projects/{}/tasks/{}/'.format(project.id, task.id), {'name': 'updated!'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Verify the task has been updated
        res = client.get('/api/projects/{}/tasks/{}/'.format(project.id, task.id))
        self.assertTrue(res.data["name"] == "updated!")

        # Cannot update a task we have no access to
        res = client.patch('/api/projects/{}/tasks/{}/'.format(other_project.id, other_task.id), {'name': 'updated!'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


    def test_processingnodes(self):
        client = APIClient()

        pnode = ProcessingNode.objects.create(
                hostname="localhost",
                port=999
            )

        # Cannot list processing nodes as guest
        res = client.get('/api/processingnodes/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        res = client.get('/api/processingnodes/{}/'.format(pnode.id))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        client.login(username="testuser", password="test1234")

        # Can list processing nodes as normal user
        res = client.get('/api/processingnodes/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data) == 1)
        self.assertTrue(res.data[0]["hostname"] == "localhost")

        # Can use filters
        res = client.get('/api/processingnodes/?id={}'.format(pnode.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data) == 1)

        # Can filter nodes with valid options
        res = client.get('/api/processingnodes/?has_available_options=true')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data) == 0)

        res = client.get('/api/processingnodes/?has_available_options=false')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data) == 1)
        self.assertTrue(res.data[0]['hostname'] == 'localhost')


        # Can get single processing node as normal user
        res = client.get('/api/processingnodes/{}/'.format(pnode.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["hostname"] == "localhost")


        # Cannot delete a processing node as normal user
        res = client.delete('/api/processingnodes/{}/'.format(pnode.id))
        self.assertTrue(res.status_code, status.HTTP_403_FORBIDDEN)

        # Cannot create a processing node as normal user
        res = client.post('/api/processingnodes/', {'hostname': 'localhost', 'port':'1000'})
        self.assertTrue(res.status_code, status.HTTP_403_FORBIDDEN)

        client.login(username="testsuperuser", password="test1234")

        # Can delete a processing node as super user
        res = client.delete('/api/processingnodes/{}/'.format(pnode.id))
        self.assertTrue(res.status_code, status.HTTP_200_OK)

        # Can create a processing node as super user
        res = client.post('/api/processingnodes/', {'hostname': 'localhost', 'port':'1000'})
        self.assertTrue(res.status_code, status.HTTP_200_OK)

        # Verify node has been created
        res = client.get('/api/processingnodes/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data) == 1)
        self.assertTrue(res.data[0]["port"] == 1000)

