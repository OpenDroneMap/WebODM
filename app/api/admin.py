from django.contrib.auth.models import User, Group
from rest_framework import serializers, viewsets, generics, status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from django.contrib.auth.hashers import make_password
from app import models

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
    def create(self, request):
        data = request.data.copy()
        password = data.get('password')
        data['password'] = make_password(password)
        user = UserSerializer(data=data)
        user.is_valid(raise_exception=True)
        user.save()
        return Response(user.data, status=status.HTTP_201_CREATED)

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
