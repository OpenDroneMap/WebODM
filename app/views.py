from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse
from nodeodm.models import ProcessingNode
from .models import Project
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.utils.translation import ugettext as _

def index(request):
    return redirect('dashboard' if request.user.is_authenticated() 
                    else 'login')

@login_required
def dashboard(request):
    no_processingnodes = ProcessingNode.objects.count() == 0

    # Create first project automatically
    if Project.objects.filter(owner=request.user).count() == 0:
        proj = Project(owner=request.user, name=_("First Project"))
        proj.save()

    return render(request, 'app/dashboard.html', {'title': 'Dashboard', 
        'no_processingnodes': no_processingnodes})

@login_required
def processing_node(request, processing_node_id):
    pn = get_object_or_404(ProcessingNode, pk=processing_node_id)
    if not pn.update_node_info():
        messages.add_message(request, messages.constants.WARNING, '{} seems to be offline.'.format(pn))

    return render(request, 'app/processing_node.html', 
            {
                'title': 'Processing Node', 
                'processing_node': pn,
                'available_options_json': pn.get_available_options_json()
            })
