import os

broker_url = os.environ.get('WO_BROKER', 'redis://localhost')
result_backend = os.environ.get('WO_BROKER', 'redis://localhost')

task_serializer = 'json'
result_serializer = 'json'
accept_content = ['json']
include=['worker.tasks']
