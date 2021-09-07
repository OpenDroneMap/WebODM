from celery import Celery
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'webodm.settings')

app = Celery('tasks')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.conf.result_backend_transport_options = {
    'retry_policy': {
       'timeout': 5.0
    }
}

app.conf.beat_schedule = {
    'update-nodes-info': {
        'task': 'worker.tasks.update_nodes_info',
        'schedule': 30,
        'options': {
        	'expires': 14,
        	'retry': False
        }
    },
    'cleanup-projects': {
        'task': 'worker.tasks.cleanup_projects',
        'schedule': 60,
        'options': {
        	'expires': 29,
        	'retry': False
        }
    },
    'cleanup-tmp-directory': {
        'task': 'worker.tasks.cleanup_tmp_directory',
        'schedule': 3600,
        'options': {
            'expires': 1799,
            'retry': False
        }
    },
    'process-pending-tasks': {
        'task': 'worker.tasks.process_pending_tasks',
        'schedule': 5,
        'options': {
        	'expires': 2,
        	'retry': False
        }
    },
}

# Mock class for handling async results during testing
class MockAsyncResult:
    def __init__(self, celery_task_id, result = None):
        self.celery_task_id = celery_task_id
        if result is None:
            if celery_task_id == 'bogus':
                self.result = None
            else:
                self.result = MockAsyncResult.results.get(celery_task_id)
        else:
            self.result = result
            MockAsyncResult.results[celery_task_id] = result

    def get(self):
        return self.result

    def ready(self):
        return self.result is not None

MockAsyncResult.results = {}
MockAsyncResult.set = lambda cti, r: MockAsyncResult(cti, r)

if __name__ == '__main__':
    app.start()