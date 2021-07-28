import math
import re 

from rest_framework import status
from rest_framework.response import Response
from app.plugins.views import TaskView
from app.plugins import get_current_plugin, signals as plugin_signals
from django.dispatch import receiver
from app.plugins import GlobalDataStore
from django.http import Http404
from django.shortcuts import redirect
from django.utils.translation import ugettext_lazy as _

import logging

logger = logging.getLogger('app.logger')

ds = GlobalDataStore('editshortlinks')

def gen_short_string(num):
    num = int(abs(num))

    def nbase(num, numerals="abcdefghijklmnopqrstuvwxyz0123456789"):
        return ((num == 0) and numerals[0]) or (nbase(num // len(numerals), numerals).lstrip(numerals[0]) + numerals[num % len(numerals)])

    return nbase(num)

def getShortLinks(username):
    return ds.get_json(username + "_shortlinks", {
            't': {}, # task --> short id
            'i': {} # short id --> task
        })

class DeleteShortLink(TaskView):
    def post(self, request, pk=None):
        task = self.get_and_check_task(request, pk)
        task_id  = str(task.id)
        username = str(request.user)

        shortlinks = getShortLinks(username)

        short_id = shortlinks['t'].get(task_id)
        if short_id is not None:
            del shortlinks['i'][short_id]
            del shortlinks['t'][task_id]
        
        ds.set_json(username + "_shortlinks", shortlinks)

        return Response({'success': True}, status=status.HTTP_200_OK)


class EditShortLink(TaskView):
    def post(self, request, pk=None):
        task = self.get_and_check_task(request, pk)
        task_id  = str(task.id)
        username = str(request.user)
        short_id = request.data.get("shortId")
        if not re.match(r'^[A-Za-z0-9_-]+$', short_id):
            return Response({'error': _("Short URLs can only include letters, numbers, underscore and dash characters (A-Z, 0-9, _, -).")})

        shortlinks = getShortLinks(username)
        if shortlinks['i'].get(short_id, task_id) != task_id:
            return Response({'error': _("This short URL is already taken.")})

        # Replace previous if any
        prev_short_id = shortlinks['t'].get(task_id)
        shortlinks['t'][task_id] = short_id

        if prev_short_id is not None:
            del shortlinks['i'][prev_short_id]

        shortlinks['i'][short_id] = task_id

        ds.set_json(username + "_shortlinks", shortlinks)

        return Response({'username': username, 'shortId': short_id}, status=status.HTTP_200_OK)

class GetShortLink(TaskView):
    def post(self, request, pk=None):
        task = self.get_and_check_task(request, pk)
        task_id  = str(task.id)
        username = str(request.user)
        shortlinks = getShortLinks(username)

        if task_id in shortlinks['t']:
            # Return existing short link
            return Response({'username': username, 'shortId': shortlinks['t'][task_id]}, status=status.HTTP_200_OK)
        else:
            # Compute short link, store it
            
            # Not atomic, but this shouldn't be a big problem
            counter = ds.get_int(username + "_counter", 0)
            ds.set_int(username + "_counter", counter + 1)

            short_id = gen_short_string(counter)

            # Check for conflicts
            while shortlinks['i'].get(short_id) is not None:
                counter += 1
                short_id = gen_short_string(counter)

            # task_id --> short id
            shortlinks['t'][task_id] = short_id

            # short id --> task_id
            shortlinks['i'][short_id] = task_id

            ds.set_json(username + "_shortlinks", shortlinks)

            return Response({'username': username, 'shortId': short_id}, status=status.HTTP_200_OK)


def HandleShortLink(request, view_type, username, short_id):
    shortlinks = getShortLinks(username)
    if short_id in shortlinks['i']:
        task_id = shortlinks['i'][short_id]
        if view_type == 'm':
            v = 'map'
        elif view_type == '3':
            v = '3d'
        
        return redirect('/public/task/{}/{}/'.format(task_id, v))
    else:
        raise Http404()

