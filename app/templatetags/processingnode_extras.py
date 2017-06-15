from django import template
from guardian.shortcuts import get_objects_for_user

from app.models import ProcessingNode

register = template.Library()


@register.assignment_tag(takes_context=True)
def get_visible_processing_nodes(context):
    return get_objects_for_user(context['request'].user, "nodeodm.view_processingnode", ProcessingNode, accept_global_perms=False)


@register.assignment_tag(takes_context=True)
def can_view_processing_nodes(context):
    return context['request'].user.has_perm("nodeodm.view_processingnode")


@register.assignment_tag(takes_context=True)
def can_add_processing_nodes(context):
    return context['request'].user.has_perm("nodeodm.add_processingnode")
