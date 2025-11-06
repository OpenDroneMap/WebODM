from worker import tasks
import redis
from webodm import settings

redis_client = redis.Redis().from_url(settings.CELERY_BROKER_URL)

for task_id in tasks.get_pending_tasks().values_list('id', flat=True):
    msg = "Unlocking {}... ".format(task_id)
    res = redis_client.delete('task_lock_{}'.format(task_id))
    print(msg + ("OK" if res else "Already unlocked"))



