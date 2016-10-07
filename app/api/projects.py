from django.contrib.auth.models import User
from rest_framework import serializers, viewsets, filters
from app import models, permissions
from guardian.shortcuts import get_objects_for_user

class ProjectSerializer(serializers.HyperlinkedModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = models.Project


class ProjectViewSet(viewsets.ModelViewSet):
    """
    Projects the current user has access to.
    """
    serializer_class = ProjectSerializer
    queryset = models.Project.objects.all()
