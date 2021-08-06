from guardian.shortcuts import get_perms
from rest_framework import serializers, viewsets
from rest_framework.decorators import detail_route
from rest_framework.response import Response
from rest_framework import status

from app import models
from .tasks import TaskIDsSerializer
from .common import get_and_check_project
from django.utils.translation import gettext as _

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

    # Disable pagination when not requesting any page
    def paginate_queryset(self, queryset):
        if self.paginator and self.request.query_params.get(self.paginator.page_query_param, None) is None:
            return None
        return super().paginate_queryset(queryset)
    
    @detail_route(methods=['post'])
    def duplicate(self, request, pk=None):
        """
        Duplicate a task
        """
        project = get_and_check_project(request, pk, ('change_project', ))

        new_project = project.duplicate()
        if new_project:
            return Response({'success': True, 'project': ProjectSerializer(new_project).data}, status=status.HTTP_200_OK)
        else:
            return Response({'error': _("Cannot duplicate project")}, status=status.HTTP_200_OK)
