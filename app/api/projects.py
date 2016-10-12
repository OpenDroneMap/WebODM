from django.contrib.auth.models import User
from rest_framework import serializers, viewsets, filters
from rest_framework.response import Response
from rest_framework.decorators import detail_route
from app import models
from .tasks import TaskIDsSerializer, TaskSerializer

class ProjectSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    tasks = TaskIDsSerializer(many=True)

    class Meta:
        model = models.Project


class ProjectViewSet(viewsets.ModelViewSet):
    """
    Projects the current user has access to. Projects are the building blocks
    of processing. Each project can have zero or more tasks associated with it.
    Users can fine tune the permissions on projects, including whether users/groups have 
    access to view, add, change or delete them.<br/><br/>
    - /api/projects/&lt;projectId&gt;/tasks : list all tasks belonging to a project<br/>
    - /api/projects/&lt;projectId&gt;/tasks/&lt;taskId&gt; : get task details
    
    """
    filter_fields = ('id', 'owner', 'name')
    serializer_class = ProjectSerializer
    queryset = models.Project.objects.all()

    @detail_route(methods=['get'])
    def tasks(self, request, pk=None):
        tasks = self.get_object().tasks()
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)
