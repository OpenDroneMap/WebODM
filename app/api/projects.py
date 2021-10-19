from guardian.shortcuts import get_perms, get_users_with_perms, assign_perm, remove_perm
from rest_framework import serializers, viewsets
from rest_framework.decorators import detail_route
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.contrib.auth.models import User

from app import models
from .tasks import TaskIDsSerializer
from .common import get_and_check_project
from django.utils.translation import gettext as _

def normalized_perm_names(perms):
    return list(map(lambda p: p.replace("_project", ""),perms))

class ProjectSerializer(serializers.ModelSerializer):
    tasks = TaskIDsSerializer(many=True, read_only=True)
    owner = serializers.HiddenField(
            default=serializers.CurrentUserDefault()
        )
    created_at = serializers.ReadOnlyField()
    permissions = serializers.SerializerMethodField()

    def get_permissions(self, obj):
        if 'request' in self.context:
            return normalized_perm_names(get_perms(self.context['request'].user, obj))
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

    @detail_route(methods=['get'])
    def permissions(self, request, pk=None):
        project = get_and_check_project(request, pk, ('change_project', ))

        result = []

        perms = get_users_with_perms(project, attach_perms=True, with_group_users=False)
        for user in perms:
            result.append({'username': user.username,
                           'owner': project.owner == user,
                           'permissions': normalized_perm_names(perms[user])})
        
        result.sort(key=lambda r: r['owner'], reverse=True)
        return Response(result, status=status.HTTP_200_OK)
    
    @detail_route(methods=['post'])
    def edit(self, request, pk=None):
        project = get_and_check_project(request, pk, ('change_project', ))

        try:
            with transaction.atomic():
                project.name = request.data.get('name', '')
                project.description = request.data.get('description', '')
                project.save()

                form_perms = request.data.get('permissions')
                if form_perms is not None:
                    # Build perms map (ignore owners, empty usernames)
                    perms_map = {}
                    for perm in form_perms:
                        if not perm.get('owner') and perm.get('username'):
                            perms_map[perm['username']] = perm['permissions']

                    db_perms = get_users_with_perms(project, attach_perms=True, with_group_users=False)
                    
                    # Check users to remove
                    for user in db_perms:

                        # Never modify owner permissions
                        if project.owner == user:
                            continue
                        
                        if perms_map.get(user.username) is None:
                            for p in db_perms[user]:
                                remove_perm(p, user, project)
                    
                    # Check users to add/edit
                    for username in perms_map:
                        for p in ["add", "change", "delete", "view"]:
                            perm = p + "_project"
                            user = User.objects.get(username=username)

                            # Skip owners
                            if project.owner == user:
                                continue

                            # Has permission in database but not in form?
                            if user.has_perm(perm, project) and not p in perms_map[username]:
                                remove_perm(perm, user, project)
                            
                            # Has permission in form but not in database?
                            elif p in perms_map[username] and not user.has_perm(perm, project):
                                assign_perm(perm, user, project)

        except User.DoesNotExist as e:
            return Response({'error': _("Invalid user in permissions list")}, status=status.HTTP_400_BAD_REQUEST)
        except AttributeError as e:
            return Response({'error': _("Invalid permissions")}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'success': True}, status=status.HTTP_200_OK)