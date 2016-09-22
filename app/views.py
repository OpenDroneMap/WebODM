from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse
from nodeodm.models import ProcessingNode
from django.contrib import messages


def index(request):
    return redirect('dashboard' if request.user.is_authenticated() 
                    else 'login')

def dashboard(request):
    return render(request, 'app/dashboard.html', {'title': 'Dashboard'})

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
