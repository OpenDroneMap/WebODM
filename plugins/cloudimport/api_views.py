import importlib
import requests
import os
from os import path

from app import models, pending_actions
from app.plugins.views import TaskView
from app.plugins.worker import run_function_async
from app.plugins import get_current_plugin

from worker.celery import app
from rest_framework.response import Response
from rest_framework import status

from .platform_helper import get_all_platforms, get_platform_by_name

class ImportFolderTaskView(TaskView):
    def post(self, request, project_pk=None, pk=None):
        task = self.get_and_check_task(request, pk)
        
        # Read form data
        folder_url = request.data.get('selectedFolderUrl', None)
        platform_name = request.data.get('platform', None)
        
        # Make sure both values are set
        if folder_url == None or platform_name == None:
            return Response({'error': 'Folder URL and platform name must be set.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Fetch the platform by name    
        platform = get_platform_by_name(platform_name)
        
        # Make sure that the platform actually exists
        if platform == None:
            return Response({'error': 'Failed to find a platform with the name \'{}\''.format(platform_name)}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify that the folder url is valid    
        if platform.verify_folder_url(folder_url) == None:
            return Response({'error': 'Invalid URL'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the files from the folder
        files = platform.import_from_folder(folder_url)
        
        # Update the task with the new information
        task.console_output += "Importing {} images...\n".format(len(files))
        task.images_count = len(files)
        task.pending_action = pending_actions.IMPORT
        task.save()
        
        # Associate the folder url with the project and task
        combined_id = "{}_{}".format(project_pk, pk)
        get_current_plugin().get_global_data_store().set_string(combined_id, folder_url)

        # Start importing the files in the background
        serialized = [file.serialize() for file in files]
        run_function_async(import_files, task.id, serialized)

        return Response({}, status=status.HTTP_200_OK)

class CheckUrlTaskView(TaskView):
    def get(self, request, project_pk=None, pk=None):

        # Assert that task exists
        self.get_and_check_task(request, pk)

        # Check if there is an imported url associated with the project and task
        combined_id = "{}_{}".format(project_pk, pk)
        folder_url = get_current_plugin().get_global_data_store().get_string(combined_id, default = None)

        if folder_url == None:
            return Response({}, status=status.HTTP_200_OK)
        else:
            return Response({'folder_url': folder_url}, status=status.HTTP_200_OK)

class PlatformsVerifyTaskView(TaskView):
    def get(self, request, platform_name):
        # Read the form data
        folder_url = request.GET.get('folderUrl', None)
        
        # Fetch the platform by name
        platform = get_platform_by_name(platform_name)
        
        # Make sure that the platform actually exists
        if platform == None:
            return Response({'error': 'Failed to find a platform with the name \'{}\''.format(platform_name)}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify that the folder url is valid    
        folder = platform.verify_folder_url(folder_url)
        if folder == None:
            return Response({'error': 'Invalid URL'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Return the folder
        return Response({'folder': folder.serialize()}, status=status.HTTP_200_OK)


class PlatformsTaskView(TaskView):
    def get(self, request):
        # Fetch and return all platforms
        platforms = get_all_platforms()
        return Response({'platforms': [platform.serialize(user = request.user) for platform in platforms]}, status=status.HTTP_200_OK)


def import_files(task_id, files):
    import requests
    from app import models
    from app.plugins import logger

    def download_file(task, file):
        path = task.task_path(file['name'])
        download_stream = requests.get(file['url'], stream=True, timeout=60)

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
