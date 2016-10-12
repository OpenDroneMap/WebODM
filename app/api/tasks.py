from django.contrib.auth.models import User
from rest_framework import serializers, viewsets, filters
from app import models
from nodeodm.models import ProcessingNode

class TaskIDsSerializer(serializers.BaseSerializer):
    def to_representation(self, obj):
        return obj.id

class TaskSerializer(serializers.ModelSerializer):
    project = serializers.PrimaryKeyRelatedField(queryset=models.Project.objects.all())
    processing_node = serializers.PrimaryKeyRelatedField(queryset=ProcessingNode.objects.all()) 
    
    class Meta:
        model = models.Task

