from rest_framework import serializers, viewsets

from app import models
from .tasks import TaskIDsSerializer


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
    Project get/add/delete/update
    Projects are the building blocks
    of processing. Each project can have zero or more tasks associated with it.
    Users can fine tune the permissions on projects, including whether users/groups have 
    access to view, add, change or delete them.
    """
    filter_fields = ('id', 'name', 'description', 'created_at')
    serializer_class = ProjectSerializer
    queryset = models.Project.objects.filter(deleting=False)
    ordering_fields = '__all__'
