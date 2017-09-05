from guardian.shortcuts import get_perms
from rest_framework import serializers, viewsets

from app import models
from .tasks import TaskIDsSerializer


class ProjectSerializer(serializers.ModelSerializer):
    tasks = TaskIDsSerializer(many=True, read_only=True)
    owner = serializers.HiddenField(
            default=serializers.CurrentUserDefault()
        )
    created_at = serializers.ReadOnlyField()
    permissions = serializers.SerializerMethodField()

    def get_permissions(self, obj):
        if 'request' in self.context:
            return list(map(lambda p: p.replace("_project", ""), get_perms(self.context['request'].user, obj)))
        else:
            # Cannot list permissions, no user is associated with request (happens when serializing ui test mocks)
            return []

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
    queryset = models.Project.objects.prefetch_related('task_set').filter(deleting=False).order_by('-created_at')
    ordering_fields = '__all__'
