from django.contrib.auth.models import User, Group
from app.models import Profile
from rest_framework import serializers, viewsets, generics, status, exceptions
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.hashers import make_password
from app import models

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = '__all__' 

class AdminUserViewSet(viewsets.ModelViewSet):
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

class AdminGroupViewSet(viewsets.ModelViewSet):
    serializer_class = GroupSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        queryset = Group.objects.all()
        name = self.request.query_params.get('name', None)
        if name is not None:
            queryset = queryset.filter(name=name)
        return queryset


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Profile
        exclude = ('id', ) 

        read_only_fields = ('user', )

class AdminProfileViewSet(viewsets.ModelViewSet):
    pagination_class = None
    serializer_class = ProfileSerializer
    permission_classes = [IsAdminUser]
    lookup_field = 'user'
    
    def get_queryset(self):
        return Profile.objects.all()

    
    @action(detail=True, methods=['post'])
    def update_quota_deadline(self, request, user=None):
        try:
            hours = float(request.data.get('hours', ''))
            if hours < 0:
                raise ValueError("hours must be >= 0")
        except ValueError as e:
            raise exceptions.ValidationError(str(e))

        try:
            p = Profile.objects.get(user=user)
        except ObjectDoesNotExist:
            raise exceptions.NotFound()
        
        return Response({'deadline': p.set_quota_deadline(hours)}, status=status.HTTP_200_OK)
