from django import template
from guardian.shortcuts import get_objects_for_user
from webodm import settings

from nodeodm.models import ProcessingNode

register = template.Library()


@register.simple_tag(takes_context=True)
def get_visible_processing_nodes(context):
    queryset = get_objects_for_user(context['request'].user, "nodeodm.view_processingnode", ProcessingNode, accept_global_perms=False)
    if settings.UI_MAX_PROCESSING_NODES is not None:
        return queryset[:settings.UI_MAX_PROCESSING_NODES]
    else:
        return queryset


@register.simple_tag(takes_context=True)
def can_view_processing_nodes(context):
    return context['request'].user.has_perm("nodeodm.view_processingnode")


@register.simple_tag(takes_context=True)
def can_add_processing_nodes(context):
    return context['request'].user.has_perm("nodeodm.add_processingnode")
