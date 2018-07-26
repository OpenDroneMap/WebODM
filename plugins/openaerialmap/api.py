from rest_framework import status
from rest_framework.response import Response

from app.plugins import GlobalDataStore
from app.plugins.views import TaskView
from app.plugins.worker import task

import requests

ds = GlobalDataStore('openaerialmap')


def get_key_for(task_id, key):
    return "task_{}_{}".format(str(task_id), key)


def get_task_info(task_id):
    return ds.get_json(get_key_for(task_id, "info"), {
        'sharing': False,
        'shared': False,
        'error': ''
    })

def set_task_info(task_id, json):
    return ds.set_json(get_key_for(task_id, "info"), json)


# TODO: task info cleanup when task is deleted via signal


class ShareInfo(TaskView):
    def get(self, request, pk=None):
        task = self.get_and_check_task(request, pk)
        return Response(get_task_info(task.id), status=status.HTTP_200_OK)


class Share(TaskView):
    def post(self, request, pk=None):
        task = self.get_and_check_task(request, pk)

        upload_orthophoto_to_oam.delay(task.id, task.get_asset_download_path('orthophoto.tif'))

        task_info = get_task_info(task.id)
        task_info['sharing'] = True
        set_task_info(task.id, task_info)

        return Response(task_info, status=status.HTTP_200_OK)


@task
def upload_orthophoto_to_oam(task_id, orthophoto_path):
    # Upload to temporary central location since
    # OAM requires a public URL and not all WebODM
    # instances are public

    res = requests.post('https://www.webodm.org/oam/upload',
                        files=[
                            ('file', ('orthophoto.tif', open(orthophoto_path, 'rb'), 'image/tiff')),
                        ]).json()

    if 'url' in res:
        orthophoto_public_url = res['url']

        import logging
        logger = logging.getLogger('app.logger')

        logger.info("UPLOADED TO " + orthophoto_public_url)
    else:
        task_info = get_task_info(task_id)
        task_info['sharing'] = False
        task_info['error'] = 'Could not upload orthophoto to intermediate location.'
        set_task_info(task_id, task_info)
