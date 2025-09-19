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

            # Generate some mock cached assets
            ta_cache_dir = task.get_task_assets_cache()
            self.assertFalse(os.path.isdir(ta_cache_dir))
            os.makedirs(ta_cache_dir)
            mock_asset = os.path.join(ta_cache_dir, "test.txt")
            with open(mock_asset, 'w', encoding='utf-8') as f:
                f.write("test")
            
            # Set modified date
            st = os.stat(ta_cache_dir)
            atime = st[ST_ATIME]
            mtime = st[ST_MTIME]
            new_mtime = mtime - (29 * 24 * 3600)  # 29 days ago
            os.utime(ta_cache_dir, (atime, new_mtime))
            worker.tasks.cleanup_cache_directory()

            # File should still be there
            self.assertTrue(os.path.isfile(mock_asset))
            self.assertTrue(os.path.isdir(ta_cache_dir))

            new_mtime = mtime - (31 * 24 * 3600)  # 31 days ago
            os.utime(ta_cache_dir, (atime, new_mtime))
            worker.tasks.cleanup_cache_directory()

            # File and cache dirs should be gone
            self.assertFalse(os.path.isfile(mock_asset))
            self.assertFalse(os.path.isdir(ta_cache_dir))

            # Regenerate...
            os.makedirs(ta_cache_dir)
            mock_asset = os.path.join(ta_cache_dir, "asset.txt")
            with open(mock_asset, 'w', encoding='utf-8') as f:
                f.write("1")

            # Remove task
            task.delete()

            # Cache dir should be gone
            self.assertFalse(os.path.isdir(ta_cache_dir))

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

