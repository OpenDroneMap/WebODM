import math

from rest_framework import status
from rest_framework.response import Response
from app.plugins.views import TaskView
from app.plugins import get_current_plugin, signals as plugin_signals
from django.dispatch import receiver
from app.plugins import GlobalDataStore
from django.http import Http404
from django.shortcuts import redirect

import logging

logger = logging.getLogger('app.logger')

ds = GlobalDataStore('shortlinks')

def gen_short_string(num):
    num = int(abs(num))

    def nbase(num, numerals="abcdefghijklmnopqrstuvwxyz0123456789"):
        return ((num == 0) and numerals[0]) or (nbase(num // len(numerals), numerals).lstrip(numerals[0]) + numerals[num % len(numerals)])

    return nbase(num)


class GetShortLink(TaskView):
    def post(self, request, pk=None):
        task = self.get_and_check_task(request, pk)
        key = str(task.id)

        if ds.has_key(key):
            # Return existing short link
            return Response({'shortId': ds.get_string(key)}, status=status.HTTP_200_OK)
        else:
            # Compute short link, store it
            
            # Not atomic, but this shouldn't be a big problem
            counter = ds.get_int("counter", 0)
            ds.set_int("counter", counter + 1)

            short_id = gen_short_string(counter)

            # TaskId --> short id
            ds.set_string(key, short_id)

            # short id --> taskId
            ds.set_string(short_id, str(task.id))

            return Response({'shortId': short_id}, status=status.HTTP_200_OK)


def HandleShortLink(request, view_type, short_id):
    if ds.has_key(short_id):
        task_id = ds.get_string(short_id)
        if view_type == 'm':
            v = 'map'
        elif view_type == '3':
            v = '3d'
        
        return redirect('/public/task/{}/{}/'.format(task_id, v))
    else:
        raise Http404()

@receiver(plugin_signals.task_removed, dispatch_uid="shortlinks_on_task_removed")
def shortlinks_cleanup(sender, task_id, **kwargs):
    short_id = ds.get_string(task_id)
    if short_id:
        logger.info("Cleaning up shortlinks datastore for task {}".format(str(task_id)))
        ds.del_key(task_id)
        ds.del_key(short_id)
