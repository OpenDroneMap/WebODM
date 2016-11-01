import django_filters
from django_filters.rest_framework import FilterSet
from rest_framework import serializers, viewsets
from rest_framework.filters import DjangoFilterBackend
from rest_framework.permissions import DjangoModelPermissions

from nodeodm.models import ProcessingNode


class ProcessingNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessingNode
        fields = '__all__'

class ProcessingNodeFilter(FilterSet):
    has_available_options = django_filters.MethodFilter()

    # noinspection PyMethodMayBeStatic
    def filter_has_available_options(self, queryset, value):
        if value.lower() in ['true', '1']:
            return queryset.exclude(available_options=dict())
        else:
            return queryset.filter(available_options=dict())

    class Meta:
        model = ProcessingNode
        fields = ['has_available_options', 'id', 'hostname', 'port', 'api_version', 'queue_count', ]

class ProcessingNodeViewSet(viewsets.ModelViewSet):
    """
    Processing nodes available. Processing nodes are associated with 
    zero or more tasks and take care of processing input images.
    """

    # Don't need a "view node" permission. If you are logged-in, you can view nodes.
    permission_classes = (DjangoModelPermissions, )

    filter_backends = (DjangoFilterBackend, )
    filter_class = ProcessingNodeFilter

    pagination_class = None
    serializer_class = ProcessingNodeSerializer
    queryset = ProcessingNode.objects.all()