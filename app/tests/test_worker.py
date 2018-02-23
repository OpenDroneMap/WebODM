import worker
from app import pending_actions
from app.models import Project
from app.models import Task
from nodeodm.models import ProcessingNode
from .classes import BootTestCase
from .utils import start_processing_node

class TestWorker(BootTestCase):
    def setUp(self):
        super().setUp()

    def tearDown(self):
        pass

    def test_worker_tasks(self):
        project = Project.objects.get(name="User Test Project")

        pnode = ProcessingNode.objects.create(hostname="localhost", port=11223)
        self.assertTrue(pnode.api_version is None)

        pnserver = start_processing_node()

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

        pnserver.terminate()
