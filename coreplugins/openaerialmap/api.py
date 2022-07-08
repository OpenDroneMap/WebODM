import json
from datetime import datetime
import os
from urllib.parse import urlencode

import piexif
from PIL import Image
from rest_framework import serializers
from rest_framework import status
from rest_framework.response import Response

from app.models import ImageUpload
from app.plugins import GlobalDataStore, get_site_settings, signals as plugin_signals
from app.plugins.views import TaskView
from app.plugins.worker import task

from webodm import settings
from django.dispatch import receiver

import requests

import logging

logger = logging.getLogger('app.logger')
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


@receiver(plugin_signals.task_removed, dispatch_uid="oam_on_task_removed")
@receiver(plugin_signals.task_completed, dispatch_uid="oam_on_task_completed")
def oam_cleanup(sender, task_id, **kwargs):
    # When a task is removed, simply remove clutter
    # When a task is re-processed, make sure we can re-share it if we shared a task previously

    logger.info("Cleaning up OAM datastore for task {}".format(str(task_id)))
    ds.del_key(get_key_for(task_id, "info"))


class Info(TaskView):
    def get(self, request, pk=None):
        task = self.get_and_check_task(request, pk)

        task_info = get_task_info(task.id)

        # Populate fields from first image in task
        img = ImageUpload.objects.filter(task=task).exclude(image__iendswith='.txt').first()
        if img is not None:
            img_path = os.path.join(settings.MEDIA_ROOT, img.path())
            im = Image.open(img_path)

            # TODO: for better data we could look over all images
            # and find actual end and start time
            # Here we're picking an image at random and assuming a one hour flight
            if not 'sensor' in task_info:
                task_info['endDate'] = datetime.utcnow().timestamp() * 1000
                task_info['sensor'] = ''
                task_info['title'] = task.name
                task_info['provider'] = get_site_settings().organization_name

                if 'exif' in im.info:
                    exif_dict = piexif.load(im.info['exif'])
                    if 'Exif' in exif_dict:
                        if piexif.ExifIFD.DateTimeOriginal in exif_dict['Exif']:
                            try:
                                parsed_date = datetime.strptime(exif_dict['Exif'][piexif.ExifIFD.DateTimeOriginal].decode('ascii'),
                                                            '%Y:%m:%d %H:%M:%S')
                                task_info['endDate'] = parsed_date.timestamp() * 1000
                            except ValueError:
                                # Ignore date field if we can't parse it
                                pass
                    if '0th' in exif_dict:
                        if piexif.ImageIFD.Make in exif_dict['0th']:
                            task_info['sensor'] = exif_dict['0th'][piexif.ImageIFD.Make].decode('ascii').strip(' \t\r\n\0')

                        if piexif.ImageIFD.Model in exif_dict['0th']:
                            task_info['sensor'] = (task_info['sensor'] + " " + exif_dict['0th'][piexif.ImageIFD.Model].decode('ascii')).strip(' \t\r\n\0')

                task_info['startDate'] = task_info['endDate'] - 60 * 60 * 1000
                set_task_info(task.id, task_info)
        else:
            task_info['noImages'] = True

        return Response(task_info, status=status.HTTP_200_OK)


class JSONSerializer(serializers.Serializer):
    oamParams = serializers.JSONField(help_text="OpenAerialMap share parameters (sensor, title, provider, etc.)")


class Share(TaskView):
    def post(self, request, pk=None):
        task = self.get_and_check_task(request, pk)

        serializer = JSONSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        oam_params = serializer['oamParams'].value

        task_info = get_task_info(task.id)
        task_info['sharing'] = True
        task_info['oam_upload_id'] = ''
        task_info['error'] = ''
        set_task_info(task.id, task_info)

        upload_orthophoto_to_oam.delay(task.id,
                                       task.get_asset_download_path('orthophoto.tif'),
                                       oam_params)

        return Response(task_info, status=status.HTTP_200_OK)


@task
def upload_orthophoto_to_oam(task_id, orthophoto_path, oam_params):
    # Upload to temporary central location since
    # OAM requires a public URL and not all WebODM
    # instances are public

    res = requests.post('https://www.webodm.org/oam/upload',
                        files=[
                            ('file', ('orthophoto.tif', open(orthophoto_path, 'rb'), 'image/tiff')),
                        ]).json()

    task_info = get_task_info(task_id)

    if 'url' in res:
        orthophoto_public_url = res['url']
        logger.info("Orthophoto uploaded to intermediary public URL " + orthophoto_public_url)

        # That's OK... we :heart: dronedeploy
        res = requests.post('https://api.openaerialmap.org/dronedeploy?{}'.format(urlencode(oam_params)),
                            json={
                                'download_path': orthophoto_public_url
                            }).json()

        if 'results' in res and 'upload' in res['results']:
            task_info['oam_upload_id'] = res['results']['upload']
            task_info['shared'] = True
        else:
            task_info['error'] = 'Could not upload orthophoto to OAM. The server replied: {}'.format(json.dumps(res))

            # Attempt to cleanup intermediate results
            requests.get('https://www.webodm.org/oam/cleanup/{}'.format(os.path.basename(orthophoto_public_url)))
    else:
        err_message = res['error'] if 'error' in res else json.dumps(res)
        task_info['error'] = 'Could not upload orthophoto to intermediate location: {}.'.format(err_message)

    task_info['sharing'] = False
    set_task_info(task_id, task_info)
