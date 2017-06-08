import json

from django.contrib.auth import login
from django.contrib.auth.models import User
from django.http import Http404
from django.shortcuts import render, redirect, get_object_or_404
from guardian.shortcuts import get_objects_for_user

from nodeodm.models import ProcessingNode
from .models import Project, Task
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.utils.translation import ugettext as _
from django import forms

def index(request):
    # Check first access where the user is expected to
    # create an admin account
    if User.objects.filter(is_superuser=True).count() == 0:
        return redirect('welcome')

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
        'no_tasks': no_tasks,
        **get_view_params(request),
    })


@login_required
def map(request, project_pk=None, task_pk=None):
    title = _("Map")
    tiles = []

    if project_pk is not None:
        project = get_object_or_404(Project, pk=project_pk)
        if not request.user.has_perm('app.view_project', project):
            raise Http404()
        
        if task_pk is not None:
            task = get_object_or_404(Task.objects.defer('orthophoto'), pk=task_pk, project=project)
            title = task.name
            tiles = [task.get_tile_json_data()]
        else:
            title = project.name
            tiles = project.get_tile_json_data()

    return render(request, 'app/map.html', {
            'title': title,
            'params': {
                'tiles': json.dumps(tiles)
            }.items(),
            **get_view_params(request),
        })


@login_required
def model_display(request, project_pk=None, task_pk=None):
    title = _("3D Model Display")

    if project_pk is not None:
        project = get_object_or_404(Project, pk=project_pk)
        if not request.user.has_perm('app.view_project', project):
            raise Http404()

        if task_pk is not None:
            task = get_object_or_404(Task.objects.defer('orthophoto'), pk=task_pk, project=project)
            title = task.name
        else:
            raise Http404()

    return render(request, 'app/3d_model_display.html', {
        'title': title,
        'params': {
            'task': json.dumps({
                'id': task.id,
                'project': project.id,
                'available_assets': task.get_available_assets()
            })
        }.items(),
        **get_view_params(request),
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
                'available_options_json': pn.get_available_options_json(pretty=True),
                **get_view_params(request),
            })

class FirstUserForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ('username', 'password', )
        widgets = {
            'password': forms.PasswordInput(),
        }


def welcome(request):
    if User.objects.filter(is_superuser=True).count() > 0:
        return redirect('index')

    fuf = FirstUserForm(prefix='user')

    if request.method == 'POST':
        fuf = FirstUserForm(request.POST, prefix='user')
        if fuf.is_valid():
            admin_user = fuf.save(commit=False)
            admin_user.is_superuser = admin_user.is_staff = True
            admin_user.save()

            # Log-in automatically
            login(request, admin_user, 'django.contrib.auth.backends.ModelBackend')
            return redirect('dashboard')

    return render(request, 'app/welcome.html',
                  {
                      'title': 'Welcome',
                      'firstuserform': fuf
                  })


def get_view_params(request):
    """
    Returns common parameters to pass to a view
    """
    processingnodes = get_objects_for_user(request.user, "nodeodm.view_processingnode", ProcessingNode)

    return {
        'can_view_processingnode': request.user.has_perm("nodeodm.view_processingnode"),
        'can_add_processingnode': request.user.has_perm("nodeodm.add_processingnode"),
        'processingnodes': processingnodes,
    }