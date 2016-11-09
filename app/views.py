from django.http import Http404
from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse
from nodeodm.models import ProcessingNode
from .models import Project, Task
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.utils.translation import ugettext as _

def index(request):
    return redirect('dashboard' if request.user.is_authenticated() 
                    else 'login')

@login_required
def dashboard(request):
    no_processingnodes = ProcessingNode.objects.count() == 0
    no_tasks = Task.objects.filter(project__owner=request.user).count() == 0

    # Create first project automatically
    if Project.objects.filter(owner=request.user).count() == 0:
        Project.objects.create(owner=request.user, name=_("First Project"))

    return render(request, 'app/dashboard.html', {'title': 'Dashboard', 
        'no_processingnodes': no_processingnodes,
        'no_tasks': no_tasks})


@login_required
def map(request):
    project_id = request.GET.get('project', '')
    task_id = request.GET.get('task', '')

    title = _("Map")

    if project_id != '':
        project = get_object_or_404(Project, pk=int(project_id))
        if not request.user.has_perm('projects.view_project', project):
            raise Http404()
        
        if task_id != '':
            task = get_object_or_404(Task, pk=int(task_id), project=project)
            title = task.name
        else:
            title = project.name

    return render(request, 'app/map.html', {
            'title': title,
            'params': {
                'task': request.GET.get('task', ''),
                'project': request.GET.get('project', '')
            }.items()
        })


@login_required
def processing_node(request, processing_node_id):
    pn = get_object_or_404(ProcessingNode, pk=processing_node_id)
    if not pn.update_node_info():
        messages.add_message(request, messages.constants.WARNING, '{} seems to be offline.'.format(pn))

    return render(request, 'app/processing_node.html', 
            {
                'title': 'Processing Node', 
                'processing_node': pn,
                'available_options_json': pn.get_available_options_json(pretty=True)
            })
