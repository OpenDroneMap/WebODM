from rest_framework import serializers, viewsets
from rest_framework.response import Response
from rest_framework.decorators import permission_classes
from rest_framework.permissions import DjangoModelPermissions
from rest_framework.filters import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from nodeodm.models import ProcessingNode
import django_filters
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q


class ProcessingNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessingNode
        fields = '__all__'

class ProcessingNodeFilter(FilterSet):
    has_available_options = django_filters.MethodFilter()

    def filter_has_available_options(self, queryset, value):
        return queryset.filter(available_options__isnull=(not value.lower() in ['true', '1']))

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