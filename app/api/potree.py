from .tasks import TaskNestedView
from rest_framework.response import Response

class Scene(TaskNestedView):
    def get(self, request, pk=None, project_pk=None):
        """
        Retrieve Potree scene information
        """
        task = self.get_and_check_task(request, pk)

        return Response(task.potree_scene)