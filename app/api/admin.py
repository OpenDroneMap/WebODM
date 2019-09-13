from django.contrib.auth.models import User, Group
from rest_framework import serializers, viewsets, generics
from rest_framework.permissions import IsAdminUser


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = '__all__' 

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        queryset = User.objects.all()
        email = self.request.query_params.get('email', None)
        if email is not None:
            queryset = queryset.filter(email=email)
        return queryset


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Group
        fields = '__all__'

class GroupViewSet(viewsets.ModelViewSet):
    serializer_class = GroupSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        queryset = Group.objects.all()
        name = self.request.query_params.get('name', None)
        if name is not None:
            queryset = queryset.filter(name=name)
        return queryset
