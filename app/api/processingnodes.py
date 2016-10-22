from rest_framework import serializers, viewsets
from rest_framework.response import Response
from rest_framework.decorators import permission_classes
from rest_framework.permissions import DjangoModelPermissions
from rest_framework.filters import DjangoFilterBackend
from nodeodm.models import ProcessingNode

class ProcessingNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessingNode
        fields = '__all__'

class ProcessingNodeViewSet(viewsets.ModelViewSet):
    """
    Processing nodes available. Processing nodes are associated with 
    zero or more tasks and take care of processing input images.
    """

    # Don't need a "view node" permission. If you are logged-in, you can view nodes.
    permission_classes = (DjangoModelPermissions, )
    filter_backends = (DjangoFilterBackend, )
    pagination_class = None
    serializer_class = ProcessingNodeSerializer
    queryset = ProcessingNode.objects.all()
