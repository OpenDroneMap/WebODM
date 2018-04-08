from worker import tasks
import redis
from webodm import settings

redis_client = redis.Redis().from_url(settings.CELERY_BROKER_URL)

for task in tasks.get_pending_tasks():
    msg = "Unlocking {}... ".format(task)
    res = redis_client.delete('task_lock_{}'.format(task.id))
    print(msg + ("OK" if res else "Already unlocked"))



