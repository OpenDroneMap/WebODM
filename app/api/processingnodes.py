import django_filters
from django_filters.rest_framework import FilterSet
from guardian.shortcuts import get_objects_for_user
from rest_framework import serializers, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from nodeodm.models import ProcessingNode


class ProcessingNodeSerializer(serializers.ModelSerializer):
    online = serializers.SerializerMethodField()

    def get_online(self, obj):
        return obj.is_online()

    class Meta:
        model = ProcessingNode
        fields = '__all__'

class ProcessingNodeFilter(FilterSet):
    has_available_options = django_filters.CharFilter(method='filter_has_available_options')

    # noinspection PyMethodMayBeStatic
    def filter_has_available_options(self, queryset, name, value):
        if value.lower() in ['true', '1']:
            return queryset.exclude(available_options=dict())
        else:
            return queryset.filter(available_options=dict())

    class Meta:
        model = ProcessingNode
        fields = ['has_available_options', 'id', 'hostname', 'port', 'api_version', 'queue_count', ]

class ProcessingNodeViewSet(viewsets.ModelViewSet):
    """
    Processing node get/add/delete/update
    Processing nodes are associated with zero or more tasks and
    take care of processing input images.
    """

    filter_class = ProcessingNodeFilter

    pagination_class = None
    serializer_class = ProcessingNodeSerializer
    queryset = ProcessingNode.objects.all()


class ProcessingNodeOptionsView(APIView):
    """
    Display the common options available among all online processing nodes. This is calculated by intersecting the available_options field of all online processing nodes visible to the current user.
    """

    queryset = ProcessingNode.objects.all()

    def get(self, request):

        nodes = get_objects_for_user(request.user, 'view_processingnode', ProcessingNode, accept_global_perms=False)
        common_options = []

        for node in nodes:
            # Skip offline nodes
            if not node.is_online():
                continue

            # First? Just populate
            if len(common_options) == 0 and len(node.available_options) > 0:
                common_options = node.available_options
            else:
                # Remove all options that are in common_options,
                # but that are not in node.available_options
                for common_option in common_options:
                    found = False
                    for option in node.available_options:
                        if common_option['name'] == option['name']:
                            found = True
                            break

                    # Mark for deletion
                    if not found:
                        common_option['_delete'] = True

        common_options = [co for co in common_options if not '_delete' in co]

        return Response(common_options)