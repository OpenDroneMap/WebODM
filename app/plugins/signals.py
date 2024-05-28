import django.dispatch

task_completed = django.dispatch.Signal(providing_args=["task_id"])
task_removing = django.dispatch.Signal(providing_args=["task_id"])
task_removed = django.dispatch.Signal(providing_args=["task_id"])
task_failed = django.dispatch.Signal(providing_args=["task_id"])
task_resizing_images = django.dispatch.Signal(providing_args=["task_id"])
task_duplicated = django.dispatch.Signal(providing_args=["task_id"])

processing_node_removed = django.dispatch.Signal(providing_args=["processing_node_id"])
