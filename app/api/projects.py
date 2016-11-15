from django.contrib.gis.db.models.functions import Envelope
from rest_framework import serializers, viewsets
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.gis.db.models import Extent

from app import models
from .tasks import TaskIDsSerializer
from .common import get_and_check_project, get_tiles_json


class ProjectSerializer(serializers.ModelSerializer):
    tasks = TaskIDsSerializer(many=True, read_only=True)
    owner = serializers.HiddenField(
            default=serializers.CurrentUserDefault()
        )
    created_at = serializers.ReadOnlyField()

    class Meta:
        model = models.Project
        exclude = ('deleting', )


class ProjectViewSet(viewsets.ModelViewSet):
    """
    Projects the current user has access to. Projects are the building blocks
    of processing. Each project can have zero or more tasks associated with it.
    Users can fine tune the permissions on projects, including whether users/groups have 
    access to view, add, change or delete them.<br/><br/>
    - /api/projects/&lt;projectId&gt;/tasks : list all tasks belonging to a project<br/>
    - /api/projects/&lt;projectId&gt;/tasks/&lt;taskId&gt; : get task details
    """
    filter_fields = ('id', 'name', 'description', 'created_at')
    serializer_class = ProjectSerializer
    queryset = models.Project.objects.filter(deleting=False)
    ordering_fields = '__all__'


class ProjectTilesJson(APIView):
    queryset = models.Project.objects.filter(deleting=False)

    def get(self, request, pk=None):
        """
        Returns a tiles.json file for consumption by a client
        """
        project = get_and_check_project(request, pk)
        task_ids = [task.id for task in project.tasks()]
        extent = [0, 0, 0, 0] # TODO! world extent

        if len(task_ids) > 0:
            # Extent of all orthophotos of all tasks for this project
            extent = project.task_set.only('geom').annotate(geom=Envelope('orthophoto')).aggregate(Extent('geom'))['geom__extent']

        json = get_tiles_json(project.name, [
            '/api/projects/{}/tasks/{}/tiles/{{z}}/{{x}}/{{y}}.png'.format(project.id, task_id) for task_id in task_ids
        ], extent)
        return Response(json)
