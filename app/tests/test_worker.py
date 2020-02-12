import os
from stat import ST_ATIME, ST_MTIME

import json

import worker
from app.models import Project
from app.models import Task
from nodeodm.models import ProcessingNode
from webodm import settings
from .classes import BootTestCase
from .utils import start_processing_node
from worker.tasks import redis_client
from rest_framework.test import APIClient
from rest_framework import status

class TestWorker(BootTestCase):
    def setUp(self):
        super().setUp()

    def tearDown(self):
        pass

    def test_redis(self):
        # We can connect to redis. Other parts of the WebODM test suite
        # rely on a valid redis connection.
        self.assertTrue(redis_client.ping())

    def test_worker_tasks(self):
        project = Project.objects.get(name="User Test Project")

        pnode = ProcessingNode.objects.create(hostname="localhost", port=11223)
        self.assertTrue(pnode.api_version is None)

        with start_processing_node():
            worker.tasks.update_nodes_info()

            pnode.refresh_from_db()
            self.assertTrue(pnode.api_version is not None)

            # Create task
            task = Task.objects.create(project=project)

            # Delete project
            project.deleting = True
            project.save()

            worker.tasks.cleanup_projects()

            # Task and project should still be here (since task still exists)
            self.assertTrue(Task.objects.filter(pk=task.id).exists())
            self.assertTrue(Project.objects.filter(pk=project.id).exists())

            # Remove task
            task.delete()

            worker.tasks.cleanup_projects()

            # Task and project should have been removed (now that task count is zero)
            self.assertFalse(Task.objects.filter(pk=task.id).exists())
            self.assertFalse(Project.objects.filter(pk=project.id).exists())

        tmpdir = os.path.join(settings.MEDIA_TMP, 'test')
        os.mkdir(tmpdir)

        # Dir is new and should not be removed
        worker.tasks.cleanup_tmp_directory()
        self.assertTrue(os.path.exists(tmpdir))

        st = os.stat(tmpdir)
        atime = st[ST_ATIME]  # access time
        mtime = st[ST_MTIME]  # modification time
        new_mtime = mtime - (23 * 3600)  # new modification time
        os.utime(tmpdir, (atime, new_mtime))

        # 23 hours in it should still be there
        worker.tasks.cleanup_tmp_directory()
        self.assertTrue(os.path.exists(tmpdir))

        new_mtime = mtime - (24 * 3600 + 100)  # new modification time
        os.utime(tmpdir, (atime, new_mtime))

        # After 24 hours it should get removed
        worker.tasks.cleanup_tmp_directory()
        self.assertFalse(os.path.exists(tmpdir))

    def test_workers_api(self):
        client = APIClient()

        # Can check bogus worker task status
        res = client.get("/api/workers/check/bogus")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        reply = json.loads(res.content.decode("utf-8"))
        self.assertEqual(reply["ready"], False)

        # Can get bogus worker task status
        res = client.get("/api/workers/get/bogus")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        reply = json.loads(res.content.decode("utf-8"))
        self.assertEqual(reply["error"], "Task not ready")

