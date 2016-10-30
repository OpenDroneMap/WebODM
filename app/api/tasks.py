from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import status, serializers, viewsets, filters, exceptions, permissions, parsers
from rest_framework.response import Response
from rest_framework.decorators import parser_classes, api_view
from app import models, scheduler
from nodeodm.models import ProcessingNode

class TaskIDsSerializer(serializers.BaseSerializer):
    def to_representation(self, obj):
        return obj.id

class TaskSerializer(serializers.ModelSerializer):
    project = serializers.PrimaryKeyRelatedField(queryset=models.Project.objects.all())
    processing_node = serializers.PrimaryKeyRelatedField(queryset=ProcessingNode.objects.all()) 
    images_count = serializers.IntegerField(
            source='imageupload_set.count',
            read_only=True
        )

    class Meta:
        model = models.Task
        exclude = ('processing_lock', )

class TaskViewSet(viewsets.ViewSet):
    """
    A task represents a set of images and other input to be sent to a processing node.
    Once a processing node completes processing, results are stored in the task.
    """
    queryset = models.Task.objects.all()
    
    # We don't use object level permissions on tasks, relying on
    # project's object permissions instead (but standard model permissions still apply)
    permission_classes = (permissions.DjangoModelPermissions, )
    parser_classes = (parsers.MultiPartParser, parsers.JSONParser, )
    ordering_fields = '__all__'
    
    def get_and_check_project(self, request, project_pk, perms = ('view_project', )):
        '''
        Retrieves a project and raises an exeption if the current user
        has no access to it.
        '''
        try:
            project = models.Project.objects.get(pk=project_pk)
            for perm in perms:
                if not request.user.has_perm(perm, project): raise ObjectDoesNotExist()
        except ObjectDoesNotExist:
            raise exceptions.NotFound()
        return project

    def list(self, request, project_pk=None):
        project = self.get_and_check_project(request, project_pk)
        tasks = self.queryset.filter(project=project_pk)
        tasks = filters.OrderingFilter().filter_queryset(self.request, tasks, self)
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

    def create(self, request, project_pk=None):
        project = self.get_and_check_project(request, project_pk, ('change_project', ))
        
        # MultiValueDict in, flat array of files out
        files = [file for filesList in map(
                        lambda key: request.FILES.getlist(key), 
                        [keys for keys in request.FILES])
                    for file in filesList]

        task = models.Task.create_from_images(files, project)
        if task != None:
            return Response({"id": task.id}, status=status.HTTP_201_CREATED)
        else:
            raise exceptions.ValidationError(detail="Cannot create task, input provided is not valid.")

    def update(self, request, pk=None, project_pk=None, partial=False):
        project = self.get_and_check_project(request, project_pk, ('change_project', ))
        try:
            task = self.queryset.get(pk=pk, project=project_pk)
        except ObjectDoesNotExist:
            raise exceptions.NotFound()

        serializer = TaskSerializer(task, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Call the scheduler (speed things up)
        #scheduler.process_pending_tasks(background=True)

        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)