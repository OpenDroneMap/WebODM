from genericpath import isfile
import importlib
import json
from posixpath import join
import time
import requests
import os
from os import listdir, path

from app import models, pending_actions
from app.plugins.views import TaskView
from app.plugins.worker import run_function_async, task
from app.plugins import get_current_plugin
from app.models import ImageUpload
from app.plugins import GlobalDataStore, get_site_settings, signals as plugin_signals

from coreplugins.dronedb.ddb import DEFAULT_HUB_URL, DroneDB, parse_url, verify_url

from django.dispatch import receiver

from worker.celery import app
from rest_framework.response import Response
from rest_framework import status

VALID_IMAGE_EXTENSIONS = ['.tiff', '.tif', '.png', '.jpeg', '.jpg']

def is_valid(file):
    _, file_extension = path.splitext(file)
    return file_extension.lower() in VALID_IMAGE_EXTENSIONS or file == 'gcp_list.txt' or file == 'geo.txt'

def get_settings(request):
    ds = get_current_plugin().get_user_data_store(request.user)
    
    registry_url = ds.get_string('registry_url') or DEFAULT_HUB_URL
    username = ds.get_string('username') or None
    password = ds.get_string('password') or None
    token = ds.get_string('token') or None

    return registry_url, username, password, token
    

def update_token(request, token):
    ds = get_current_plugin().get_user_data_store(request.user)
    ds.set_string('token', token)

def get_ddb(request):
    registry_url, username, password, token = get_settings(request)

    if registry_url == None or username == None or password == None:
        raise ValueError('Credentials must be set.')

    return DroneDB(registry_url, username, password, token, lambda token: update_token(request, token))

def to_web_protocol(registry_url):
    return registry_url.replace('ddb+unsafe://', 'http://').replace('ddb://', 'https://').rstrip('/')

class CheckCredentialsTaskView(TaskView):
    def post(self, request):

        # Read form data
        hub_url = request.data.get('hubUrl', None)
        username = request.data.get('userName', None)
        password = request.data.get('password', None)

        # Make sure both values are set
        if hub_url == None or username == None or password == None:
            return Response({'error': 'All fields must be set.'}, status=status.HTTP_400_BAD_REQUEST)

        try:

            ddb = DroneDB(hub_url, username, password)

            return Response({'success': ddb.login()}, status=status.HTTP_200_OK)      

        except(Exception) as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class OrganizationsTaskView(TaskView):
    def get(self, request):

        try:

            ddb = get_ddb(request)

            orgs = ddb.get_organizations()

            return Response(orgs, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class DatasetsTaskView(TaskView):
    def get(self, request, org=None):

        if org == None:
            return Response({'error': 'Organization must be set.'}, status=status.HTTP_400_BAD_REQUEST)

        try:

            ddb = get_ddb(request)

            dss = ddb.get_datasets(org)

            return Response(dss, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class FoldersTaskView(TaskView):
    def get(self, request, org=None, ds=None):

        if org == None or ds == None:
            return Response({'error': 'Organization and dataset must be set.'}, status=status.HTTP_400_BAD_REQUEST)

        try:

            ddb = get_ddb(request)

            folders = ddb.get_folders(org, ds)

            return Response(folders, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class VerifyUrlTaskView(TaskView):
    def post(self, request):

        # Read form data
        url = request.data.get('url', None)

        if url == None:
            return Response({'error': 'Url must be set.'}, status=status.HTTP_400_BAD_REQUEST)

        _, username, password, _ = get_settings(request)

        try:

            result, org, ds, folder, count, size = verify_url(url, username, password).values() 

            if (not result):
                return Response({'error': 'Invalid url.'}, status=status.HTTP_400_BAD_REQUEST)         

            return Response({'count': count, 'success': result, 'ds' : ds, 'org': org, 'folder': folder or None, 'size': size} 
                    if org else {'success': False}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)    

class InfoTaskView(TaskView):
    def get(self, request):
            
        registry_url, username, _, _ = get_settings(request)
     
        return Response({ 'hubUrl': registry_url, 'username': username }, status=status.HTTP_200_OK)
           

class ImportDatasetTaskView(TaskView):
    def post(self, request, project_pk=None, pk=None):
                        
        task = self.get_and_check_task(request, pk)

        # Read form data
        ddb_url = request.data.get('ddb_url', None)
                      
        if ddb_url == None:
            return Response({'error': 'DroneDB url must be set.'}, status=status.HTTP_400_BAD_REQUEST)
        
        registry_url, orgSlug, dsSlug, folder = parse_url(ddb_url).values()

        _, username, password, token = get_settings(request)
        ddb = DroneDB(registry_url, username, password, token, lambda token: update_token(request, token))

        # Get the files from the folder
        rawfiles = ddb.get_files_list(orgSlug, dsSlug, folder)
        files = [file for file in rawfiles if is_valid(file['path'])]
                        
        # Verify that the folder url is valid    
        if len(files) == 0:
            return Response({'error': 'Empty dataset or folder.'}, status=status.HTTP_400_BAD_REQUEST)
              
        # Update the task with the new information
        task.console_output += "Importing {} images...\n".format(len(files))
        task.images_count = len(files)
        task.pending_action = pending_actions.IMPORT
        task.save()
        
        # Associate the folder url with the project and task
        combined_id = "{}_{}".format(project_pk, pk)
        
        datastore = get_current_plugin().get_global_data_store()
        datastore.set_json(combined_id, {
            "ddbUrl": ddb_url, 
            "token": ddb.token, 
            "ddbWebUrl": "{}/r/{}/{}/{}".format(to_web_protocol(registry_url), orgSlug, dsSlug, folder.rstrip('/'))
        })
        
        #ddb.refresh_token()

        # Start importing the files in the background
        serialized = {'token': ddb.token, 'files': files}
        run_function_async(import_files, task.id, serialized)

        return Response({}, status=status.HTTP_200_OK)

def import_files(task_id, carrier):
    import requests
    from app import models
    from app.plugins import logger

    files = carrier['files']
    
    #headers = CaseInsensitiveDict()
    headers = {}

    if carrier['token'] != None:
        headers['Authorization'] = 'Bearer ' + carrier['token']

    def download_file(task, file):
        path = task.task_path(file['name'])
        logger.info("Downloading file: " + file['url'])
        download_stream = requests.get(file['url'], stream=True, timeout=60, headers=headers)

        with open(path, 'wb') as fd:
            for chunk in download_stream.iter_content(4096):
                fd.write(chunk)
        
        models.ImageUpload.objects.create(task=task, image=path)

    logger.info("Will import {} files".format(len(files)))
    task = models.Task.objects.get(pk=task_id)
    task.create_task_directories()
    task.save()
    
    try:
        downloaded_total = 0
        for file in files: 
            download_file(task, file)
            task.check_if_canceled()
            models.Task.objects.filter(pk=task.id).update(upload_progress=(float(downloaded_total) / float(len(files))))
            downloaded_total += 1

    except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
        raise NodeServerError(e)

    task.refresh_from_db()
    task.pending_action = None
    task.processing_time = 0
    task.partial = False
    task.save()

class CheckUrlTaskView(TaskView):
    def get(self, request, project_pk=None, pk=None):

        # Assert that task exists
        self.get_and_check_task(request, pk)

        # Check if there is an imported url associated with the project and task
        combined_id = "{}_{}".format(project_pk, pk)
        data = get_current_plugin().get_global_data_store().get_json(combined_id, default = None)

        if data == None or 'ddbWebUrl' not in data:
            return Response({'ddbWebUrl': None}, status=status.HTTP_200_OK)
        else:
            return Response({'ddbUrl': data['ddbWebUrl']}, status=status.HTTP_200_OK)

def get_status_key(task_id):
    return '{}_ddb'.format(task_id)

@receiver(plugin_signals.task_removed, dispatch_uid="ddb_on_task_removed")
@receiver(plugin_signals.task_completed, dispatch_uid="ddb_on_task_completed")
def ddb_cleanup(sender, task_id, **kwargs):

    from app.plugins import logger

    # When a task is removed, simply remove clutter
    # When a task is re-processed, make sure we can re-share it if we shared a task previously

    logger.info("Cleaning up DroneDB datastore for task {}".format(str(task_id)))

    datastore = get_current_plugin().get_global_data_store()
    status_key = get_status_key(task_id)

    logger.info("Info task {0} ({1})".format(str(task_id), status_key))

    datastore.del_key(status_key)
    

class StatusTaskView(TaskView):
    def get(self, request, pk):

        task = self.get_and_check_task(request, pk)

        # Associate the folder url with the project and task
        status_key = get_status_key(pk)
        
        datastore = get_current_plugin().get_global_data_store()

        task_info = datastore.get_json(status_key, {
            'status': 0, # Idle
            'shareUrl': None,
            'uploadedFiles': 0,
            'totalFiles': 0,
            'uploadedSize': 0,
            'totalSize': 0,
            'error': None
        })

        return Response(task_info, status=status.HTTP_200_OK)

DRONEDB_ASSETS = [
    'orthophoto.tif', 
    'orthophoto.png',
    'georeferenced_model.laz',
    'dtm.tif',
    'dsm.tif',
    'shots.geojson',
    'report.pdf',
    'ground_control_points.geojson'
]

class ShareTaskView(TaskView): 
    def post(self, request, pk):

        from app.plugins import logger

        task = self.get_and_check_task(request, pk)

        status_key = get_status_key(pk)
        
        datastore = get_current_plugin().get_global_data_store()

        data = {
            'status': 1, # Running
            'shareUrl': None,
            'uploadedFiles': 0,
            'totalFiles': 0,
            'uploadedSize': 0,
            'totalSize': 0,
            'error': None
        }

        datastore.set_json(status_key, data)

        settings = get_settings(request)

        available_assets = [task.get_asset_file_or_zipstream(f)[0] for f in list(set(task.available_assets) & set(DRONEDB_ASSETS))]

        if 'textured_model.zip' in task.available_assets:            
            texture_files = [join(task.assets_path('odm_texturing'), f) for f in listdir(task.assets_path('odm_texturing')) if isfile(join(task.assets_path('odm_texturing'), f))]
            available_assets.extend(texture_files)

        assets_path = task.assets_path()

        files = [{'path': f, 'name': f[len(assets_path)+1:], 'size': os.path.getsize(f)} for f in available_assets]

        share_to_ddb.delay(pk, settings, files)

        return Response(data, status=status.HTTP_200_OK)        


@task
def share_to_ddb(pk, settings, files):
    
    from app.plugins import logger
  
    status_key = get_status_key(pk)        
    datastore = get_current_plugin().get_global_data_store()

    registry_url, username, password, token = settings
    
    ddb = DroneDB(registry_url, username, password, token)

    # Init share (to check)
    share_token = ddb.share_init()

    status = datastore.get_json(status_key)

    status['totalFiles'] = len(files)
    status['totalSize'] = sum(i['size'] for i in files)

    datastore.set_json(status_key, status)

    for file in files:

        # check that file exists
        if not os.path.exists(file['path']):
            logger.info("File {} does not exist".format(file['path']))
            continue

        attempt = 0

        while attempt < 3:
            try:
                
                attempt += 1
                
                up = ddb.share_upload(share_token, file['path'], file['name'])

                logger.info("Uploaded " + file['name'] + " to Dronedb (hash: " + up['hash'] + ")")

                status['uploadedFiles'] += 1
                status['uploadedSize'] += file['size']

                datastore.set_json(status_key, status)
            
                break

            except Exception as e:

                if (attempt == 3):
                    logger.error("Error uploading file {}: {}".format(file['name'], str(e)))
                    status['error'] = "Error uploading file {}: {}".format(file['name'], str(e))
                    status['status'] = 2 # Error
                    datastore.set_json(status_key, status)
                    return
                else:
                    logger.info("Error uploading file {}: {}. Retrying...".format(file['name'], str(e)))
                    time.sleep(5)
                    continue


    res = ddb.share_commit(share_token)
    
    status['status'] = 3 # Done
    status['shareUrl'] = registry_url + res['url']

    logger.info("Shared on url " + status['shareUrl'])

    datastore.set_json(status_key, status)

