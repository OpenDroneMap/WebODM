from django import template
from app.models import ProcessingNode

register = template.Library()

@register.assignment_tag
def all_processing_nodes():
    return ProcessingNode.objects.all()