from django.db import transaction
from rest_framework import permissions
from rest_framework import serializers, viewsets
from django.db.models import Q
from rest_framework import status, exceptions
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.response import Response

from app.models import Preset


class PresetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Preset

        exclude = ('owner', )
        read_only_fields = ('owner', 'created_at', 'system', )


class PresetViewSet(viewsets.ModelViewSet):
    """
    Preset get/add/delete/update
    Presets represent a set of options that a user
    can save/customize for use in processing a task.
    """

    pagination_class = None
    serializer_class = PresetSerializer

    # We don't use object level permissions on presets
    permission_classes = (permissions.DjangoModelPermissions, )
    filter_backends = (DjangoFilterBackend, OrderingFilter, )

    def get_queryset(self):
        return Preset.objects.filter(Q(owner=self.request.user.id) | Q(system=True))

    def create(self, request):
        with transaction.atomic():
            preset = Preset.objects.create(owner=self.request.user)

            # Update other parameters
            serializer = PresetSerializer(preset, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()

            return Response(serializer.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None):
        preset = Preset.objects.get(pk=pk)

        # Only owners can delete their own presets (except superusers)
        if preset.owner != request.user and not request.user.is_superuser:
            raise exceptions.NotFound()

        # Even superusers cannot delete global presets via the API (must use admin backend)
        if preset.system:
            raise exceptions.PermissionDenied()

        return super().destroy(request, pk)
