import os
import mimetypes

from worker.tasks import TestSafeAsyncResult
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from django.http import FileResponse
from django.http import HttpResponse
from wsgiref.util import FileWrapper

class CheckTask(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request, celery_task_id=None, **kwargs):
        res = TestSafeAsyncResult(celery_task_id)

        if not res.ready():
            return Response({'ready': False}, status=status.HTTP_200_OK)
        else:
            result = res.get()

            if result.get('error', None) is not None:
                msg = self.on_error(result)
                return Response({'ready': True, 'error': msg})

            if self.error_check(result) is not None:
                msg = self.on_error(result)
                return Response({'ready': True, 'error': msg})

            return Response({'ready': True})

    def on_error(self, result):
        return result['error']

    def error_check(self, result):
        pass

class TaskResultOutputError(Exception):
    pass

class GetTaskResult(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request, celery_task_id=None, **kwargs):
        res = TestSafeAsyncResult(celery_task_id)
        if res.ready():
            result = res.get()
            file = result.get('file', None) # File path
            output = result.get('output', None) # String/object
        else:
            return Response({'error': 'Task not ready'})

        if file is not None:
            filename = request.query_params.get('filename', os.path.basename(file))
            filesize = os.stat(file).st_size

            f = open(file, "rb")

            # More than 100mb, normal http response, otherwise stream
            # Django docs say to avoid streaming when possible
            stream = filesize > 1e8
            if stream:
                response = FileResponse(f)
            else:
                response = HttpResponse(FileWrapper(f),
                                        content_type=(mimetypes.guess_type(filename)[0] or "application/zip"))

            response['Content-Type'] = mimetypes.guess_type(filename)[0] or "application/zip"
            response['Content-Disposition'] = "attachment; filename={}".format(filename)
            response['Content-Length'] = filesize

            return response
        elif output is not None:
            try:
                output = self.handle_output(output, result, **kwargs)
            except TaskResultOutputError as e:
                return Response({'error': str(e)})

            return Response({'output': output})
        else:
            return Response({'error': 'Invalid task output (cannot find valid key)'})

    def handle_output(self, output, result, **kwargs):
        return output
