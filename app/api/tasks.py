from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers, viewsets, filters, exceptions, permissions
from rest_framework.response import Response
from app import models
from nodeodm.models import ProcessingNode

class TaskIDsSerializer(serializers.BaseSerializer):
    def to_representation(self, obj):
        return obj.id

class TaskSerializer(serializers.ModelSerializer):
    project = serializers.PrimaryKeyRelatedField(queryset=models.Project.objects.all())
    processing_node = serializers.PrimaryKeyRelatedField(queryset=ProcessingNode.objects.all()) 
    
    class Meta:
        model = models.Task


class TaskViewSet(viewsets.ViewSet):
    """
    TODO: permissions!
    """
    queryset = models.Task.objects.all()

    # We don't use object level permissions on tasks, relying on
    # project's object permissions instead (but standard model permissions still apply)
    permission_classes = (permissions.DjangoModelPermissions, )

    def get_and_check_project(self, request, project_pk):
        '''
        Retrieves a project and raises an exeption if the current user
        has no access to it.
        '''
        try:
            project = models.Project.objects.get(pk=project_pk)
            if not request.user.has_perm('view_project', project): raise ObjectDoesNotExist()
        except ObjectDoesNotExist:
            raise exceptions.NotFound()
        return project
    
    def list(self, request, project_pk=None):
        project = self.get_and_check_project(request, project_pk)
        tasks = self.queryset.filter(project=project_pk)
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None, project_pk=None):
        self.get_and_check_project(request, project_pk)
        try:
            task = self.queryset.get(pk=pk, project=project_pk)
        except ObjectDoesNotExist:
            raise exceptions.NotFound()
        serializer = TaskSerializer(task)
        return Response(serializer.data)