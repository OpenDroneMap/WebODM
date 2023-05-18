from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes

from app.plugins import PluginBase, Menu, MountPoint
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.utils.translation import gettext as _

import json, shutil, psutil

def get_memory_stats():
    """
    Get node total memory and memory usage (Linux only)
    https://stackoverflow.com/questions/17718449/determine-free-ram-in-python
    """
    try:
        with open('/proc/meminfo', 'r') as mem:
            ret = {}
            tmp = 0
            for i in mem:
                sline = i.split()
                if str(sline[0]) == 'MemTotal:':
                    ret['total'] = int(sline[1])
                elif str(sline[0]) in ('MemFree:', 'Buffers:', 'Cached:'):
                    tmp += int(sline[1])
            ret['free'] = tmp
            ret['used'] = int(ret['total']) - int(ret['free'])

            ret['total'] *= 1024
            ret['free'] *= 1024
            ret['used'] *= 1024
        return ret
    except:
        return {}

def get_diagnostic_stats():
    # Disk space
    total_disk_space, used_disk_space, free_disk_space = shutil.disk_usage('./')

    # CPU Stats
    cpu_percent_used = psutil.cpu_percent()
    cpu_percent_free = 100 - cpu_percent_used
    cpu_freq = psutil.cpu_freq()

    diagnostic_stats = {
        'total_disk_space': total_disk_space,
        'used_disk_space': used_disk_space,
        'free_disk_space': free_disk_space,
        'cpu_percent_used': round(cpu_percent_used, 2),
        'cpu_percent_free': round(cpu_percent_free, 2),
        'cpu_freq_current': round(cpu_freq.current / 1000, 2),
    }

    # Memory (Linux only)
    memory_stats = get_memory_stats()
    if 'free' in memory_stats:
        diagnostic_stats['free_memory'] = memory_stats['free']
        diagnostic_stats['used_memory'] = memory_stats['used']
        diagnostic_stats['total_memory'] = memory_stats['total']
    
    return diagnostic_stats

class Plugin(PluginBase):
    def main_menu(self):
        return [Menu(_("Diagnostic"), self.public_url(""), "fa fa-chart-pie fa-fw")]
    
    def api_mount_points(self):

        @api_view()
        @permission_classes((permissions.AllowAny,))
        def diagnostic(request):
            diagnostic_stats = get_diagnostic_stats()
            return Response(diagnostic_stats)

        return [
            MountPoint('/', diagnostic)
        ]

    def app_mount_points(self):
        @login_required
        def diagnostic(request):
            template_args = get_diagnostic_stats()
            template_args['title'] = 'Diagnostic'

            return render(request, self.template_path("diagnostic.html"), template_args)

        return [
            MountPoint('$', diagnostic)
        ]


