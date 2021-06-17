from .tasks import TaskNestedView
from .common import get_and_check_project
from rest_framework.response import Response
from rest_framework import exceptions

class Scene(TaskNestedView):
    def get(self, request, pk=None, project_pk=None):
        """
        Retrieve Potree scene information
        """
        task = self.get_and_check_task(request, pk)

        return Response(task.potree_scene)
    
    def post(self, request, pk=None, project_pk=None):
        """
        Store potree scene information (except camera view)
        """
        get_and_check_project(request, project_pk, perms=("change_project", ))
        task = self.get_and_check_task(request, pk)
        scene = request.data

        # Quick type check
        if scene.get('type') != 'Potree':
            raise exceptions.ValidationError(detail="Invalid potree scene")
        
        for k in scene:
            if not k in ["view", "pointclouds", "settings"]:
                task.potree_scene[k] = scene[k]

        task.save()
        return Response({'success': True})

class CameraView(TaskNestedView):
    def post(self, request, pk=None, project_pk=None):
        """
        Store camera view information
        """
        get_and_check_project(request, project_pk, perms=("change_project", ))
        task = self.get_and_check_task(request, pk)

        view = request.data
        if not view:
            raise exceptions.ValidationError(detail="view parameter missing")

        if not task.potree_scene:
            init_p = {
                'type': 'Potree',
                'version': 1.7
            } 
            task.potree_scene = init_p
        
        task.potree_scene['view'] = view
        task.save()
            
        return Response({'success': True})