import datetime

from django.contrib.auth.models import User
from guardian.shortcuts import assign_perm
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_jwt.settings import api_settings

from app import pending_actions
from app.models import Project, Task
from nodeodm.models import ProcessingNode
from .classes import BootTestCase


class TestApi(BootTestCase):
    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_projects_and_tasks(self):
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

        # Forbidden without credentials
        res = client.get('/api/projects/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        
        client.login(username="testuser", password="test1234")
        res = client.get('/api/projects/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data["results"]) > 0)

        # Can sort
        res = client.get('/api/projects/?ordering=-created_at')
        last_project = Project.objects.filter(owner=user).latest('created_at')
        self.assertTrue(res.data["results"][0]['id'] == last_project.id)

        res = client.get('/api/projects/{}/'.format(project.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = client.get('/api/projects/dasjkldas/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        res = client.get('/api/projects/{}/'.format(other_project.id))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # Can filter
        res = client.get('/api/projects/?name=999')
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

        # Can create project, but owner cannot be set
        res = client.post('/api/projects/', {'name': 'test', 'description': 'test descr'})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Project.objects.get(pk=res.data['id']).owner.id == user.id)

        # Cannot leave name empty
        res = client.post('/api/projects/', {'description': 'test descr'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


        # Create some tasks
        task = Task.objects.create(project=project)
        task2 = Task.objects.create(project=project, created_at=task.created_at + datetime.timedelta(0, 1))
        other_task = Task.objects.create(project=other_project)

        # Can list project tasks to a project we have access to
        res = client.get('/api/projects/{}/tasks/'.format(project.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data) == 2)

        # Can sort
        res = client.get('/api/projects/{}/tasks/?ordering=created_at'.format(project.id))
        self.assertTrue(res.data[0]['id'] == task.id)
        self.assertTrue(res.data[1]['id'] == task2.id)

        res = client.get('/api/projects/{}/tasks/?ordering=-created_at'.format(project.id))
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
        res = client.get('/api/projects/{}/tasks/{}/output/'.format(project.id, task.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data == "")

        task.console_output = "line1\nline2\nline3"
        task.save()

        res = client.get('/api/projects/{}/tasks/{}/output/'.format(project.id, task.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data == task.console_output)

        # Console output with line num
        res = client.get('/api/projects/{}/tasks/{}/output/?line=2'.format(project.id, task.id))
        self.assertTrue(res.data == "line3")

        # Console output with line num out of bounds
        res = client.get('/api/projects/{}/tasks/{}/output/?line=3'.format(project.id, task.id))
        self.assertTrue(res.data == "")
        res = client.get('/api/projects/{}/tasks/{}/output/?line=-1'.format(project.id, task.id))
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

        # Can cancel a task for which we have permission
        self.assertTrue(task.pending_action is None)
        res = client.post('/api/projects/{}/tasks/{}/cancel/'.format(project.id, task.id))
        self.assertTrue(res.data["success"])
        task.refresh_from_db()
        self.assertTrue(task.last_error is None)
        self.assertTrue(task.pending_action == pending_actions.CANCEL)

        res = client.post('/api/projects/{}/tasks/{}/restart/'.format(project.id, task.id))
        self.assertTrue(res.data["success"])
        task.refresh_from_db()
        self.assertTrue(task.last_error is None)
        self.assertTrue(task.pending_action == pending_actions.RESTART)

        # Cannot cancel, restart or delete a task for which we don't have permission
        for action in ['cancel', 'remove', 'restart']:
            res = client.post('/api/projects/{}/tasks/{}/{}/'.format(other_project.id, other_task.id, action))
            self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # Can delete
        res = client.post('/api/projects/{}/tasks/{}/remove/'.format(project.id, task.id))
        self.assertTrue(res.data["success"])
        task.refresh_from_db()
        self.assertTrue(task.last_error is None)
        self.assertTrue(task.pending_action == pending_actions.REMOVE)

        # Can delete project that we we own
        temp_project = Project.objects.create(owner=user)
        res = client.delete('/api/projects/{}/'.format(temp_project.id))
        self.assertTrue(res.status_code == status.HTTP_204_NO_CONTENT)
        self.assertTrue(Project.objects.filter(id=temp_project.id).count() == 0) # Really deleted

        # Cannot delete a project we don't own
        other_temp_project = Project.objects.create(owner=other_user)
        res = client.delete('/api/projects/{}/'.format(other_temp_project.id))
        self.assertTrue(res.status_code == status.HTTP_404_NOT_FOUND)

        # Can't delete a project for which we just have view permissions
        assign_perm('view_project', user, other_temp_project)
        res = client.delete('/api/projects/{}/'.format(other_temp_project.id))
        self.assertTrue(res.status_code == status.HTTP_403_FORBIDDEN)

        # Can delete a project for which we have delete permissions
        assign_perm('delete_project', user, other_temp_project)
        res = client.delete('/api/projects/{}/'.format(other_temp_project.id))
        self.assertTrue(res.status_code == status.HTTP_204_NO_CONTENT)


    def test_processingnodes(self):
        client = APIClient()

        pnode = ProcessingNode.objects.create(
                hostname="localhost",
                port=999
            )

        another_pnode = ProcessingNode.objects.create(
            hostname="localhost",
            port=998
        )

        # Cannot list processing nodes as guest
        res = client.get('/api/processingnodes/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        res = client.get('/api/processingnodes/{}/'.format(pnode.id))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        client.login(username="testuser", password="test1234")

        # Cannot list processing nodes, unless permissions have been granted
        res = client.get('/api/processingnodes/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data) == 0)

        user = User.objects.get(username="testuser")
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertFalse(user.has_perm('view_processingnode', pnode))
        assign_perm('view_processingnode', user, pnode)
        self.assertTrue(user.has_perm('view_processingnode', pnode))

        # Now we can list processing nodes as normal user
        res = client.get('/api/processingnodes/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data) == 1)
        self.assertTrue(res.data[0]["hostname"] == "localhost")

        # Can use filters
        res = client.get('/api/processingnodes/?id={}'.format(pnode.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data) == 1)

        res = client.get('/api/processingnodes/?id={}'.format(another_pnode.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data) == 0)

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
        self.assertTrue(len(res.data) == 2)
        self.assertTrue(res.data[1]["port"] == 1000)

    def test_token_auth(self):
        client = APIClient()

        pnode = ProcessingNode.objects.create(
            hostname="localhost",
            port=999
        )

        # Cannot access resources
        res = client.get('/api/processingnodes/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Cannot generate token with invalid credentials
        res = client.post('/api/token-auth/', {
            'username': 'testuser',
            'password': 'wrongpwd'
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Can generate token with valid credentials
        res = client.post('/api/token-auth/', {
            'username': 'testuser',
            'password': 'test1234'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        token = res.data['token']
        self.assertTrue(len(token) > 0)

        # Can access resources by passing token
        client = APIClient(HTTP_AUTHORIZATION="{0} {1}".format(api_settings.JWT_AUTH_HEADER_PREFIX, token))
        res = client.get('/api/processingnodes/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

