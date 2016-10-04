from django.contrib.auth.models import User
from rest_framework import serializers, viewsets
from app import models

class ProjectSerializer(serializers.HyperlinkedModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = models.Project


class ProjectViewSet(viewsets.ModelViewSet):
    """
    Projects the current user has access to, including the ability to create new ones.
    """
    queryset = models.Project.objects.all()
    serializer_class = ProjectSerializer