import re
from guardian.shortcuts import get_perms, get_users_with_perms, assign_perm, remove_perm
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django_filters import rest_framework as filters
from django.db import transaction
from django.contrib.auth.models import User
from django.contrib.postgres.search import SearchQuery, SearchVector
from django.contrib.postgres.aggregates import StringAgg
from django.db.models import Q

from app import models
from .tasks import TaskIDsSerializer
from .tags import TagsField, parse_tags_input
from .common import get_and_check_project
from django.utils.translation import gettext as _

def normalized_perm_names(perms):
    return list(map(lambda p: p.replace("_project", ""),perms))

class ProjectSerializer(serializers.ModelSerializer):
    tasks = TaskIDsSerializer(many=True, read_only=True)
    owner = serializers.HiddenField(
            default=serializers.CurrentUserDefault()
        )
    owned = serializers.SerializerMethodField()
    created_at = serializers.ReadOnlyField()
    permissions = serializers.SerializerMethodField()
    tags = TagsField(required=False)

    def get_permissions(self, obj):
        if 'request' in self.context:
            return normalized_perm_names(get_perms(self.context['request'].user, obj))
        else:
            # Cannot list permissions, no user is associated with request (happens when serializing ui test mocks)
            return []
    
    def get_owned(self, obj):
        if 'request' in self.context:
            user = self.context['request'].user
            return user.is_superuser or obj.owner.id == user.id
        return False

    class Meta:
        model = models.Project
        exclude = ('deleting', )


class ProjectFilter(filters.FilterSet):
    search = filters.CharFilter(method='filter_search')

    def filter_search(self, qs, name, value):
        value = value.replace(":", "#")
        tag_pattern = re.compile("#[^\s]+")
        tags = set(re.findall(tag_pattern, value))
        user_pattern = re.compile("@[^\s]+")
        users = list(set(re.findall(user_pattern, value)))

        task_tags = set([t for t in tags if t.startswith("##")])
        project_tags = tags - task_tags

        task_tags = [t.replace("##", "") for t in task_tags]
        project_tags = [t.replace("#", "") for t in project_tags]

        names = re.sub("\s+", " ", re.sub(user_pattern, "", re.sub(tag_pattern, "", value))).strip()

        if len(users) > 0:
            qs = qs.filter(owner__username__iexact=users[0][1:])
        
        if len(names) > 0:
            project_name_vec = SearchVector("name")
            task_name_vec = SearchVector(StringAgg("task__name", delimiter=' '))
            name_query = SearchQuery(names, search_type="plain")
            qs = qs.annotate(n_search=project_name_vec + task_name_vec).filter(n_search=name_query)

        if len(task_tags) > 0:
            task_tags_vec = SearchVector("task__tags")
            tags_query = SearchQuery(task_tags[0])
            for t in task_tags[1:]:
                tags_query = tags_query & SearchQuery(t)
            qs = qs.annotate(tt_search=task_tags_vec).filter(tt_search=tags_query)

        if len(project_tags) > 0:
            project_tags_vec = SearchVector("tags")
            tags_query = SearchQuery(project_tags[0])
            for t in project_tags[1:]:
                tags_query = tags_query & SearchQuery(t)
            qs = qs.annotate(pt_search=project_tags_vec).filter(pt_search=tags_query)

        return qs.distinct()

    class Meta:
        model = models.Project
        fields = ['search', 'id', 'name', 'description', 'created_at']


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
    filterset_class = ProjectFilter
    ordering_fields = '__all__'

    # Disable pagination when not requesting any page
    def paginate_queryset(self, queryset):
        if self.paginator and self.request.query_params.get(self.paginator.page_query_param, None) is None:
            return None
        return super().paginate_queryset(queryset)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """
        Duplicate a task
        """
        project = get_and_check_project(request, pk, ('change_project', ))

        new_project = project.duplicate(new_owner=request.user)
        if new_project:
            return Response({'success': True, 'project': ProjectSerializer(new_project).data}, status=status.HTTP_200_OK)
        else:
            return Response({'error': _("Cannot duplicate project")}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
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
    
    @action(detail=True, methods=['post'])
    def edit(self, request, pk=None):
        project = get_and_check_project(request, pk, ('change_project', ))

        try:
            with transaction.atomic():
                project.name = request.data.get('name', '')
                project.description = request.data.get('description', '')
                project.tags = TagsField().to_internal_value(parse_tags_input(request.data.get('tags', [])))
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

    def destroy(self, request, pk=None):
        project = get_and_check_project(request, pk, ('view_project', ))

        # Owner? Delete the project
        if project.owner == request.user or request.user.is_superuser:
            get_and_check_project(request, pk, ('delete_project', ))

            return super().destroy(self, request, pk=pk)
        else:
            # Do not remove the project, simply remove all user's permissions to the project
            # to avoid shared projects from being accidentally deleted
            for p in ["add", "change", "delete", "view"]:
                perm = p + "_project"
                remove_perm(perm, request.user, project)
            return Response(status=status.HTTP_204_NO_CONTENT)
        