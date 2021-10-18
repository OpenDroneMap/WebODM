from django.contrib.auth.models import User
from rest_framework import serializers, viewsets, mixins, status, exceptions, permissions

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ['username', 'email'] 

class UserViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Disable pagination when not requesting any page
    def paginate_queryset(self, queryset):
        if self.paginator and self.request.query_params.get(self.paginator.page_query_param, None) is None:
            return None
        return super().paginate_queryset(queryset)

    def get_queryset(self):
        queryset = User.objects.all()

        search = self.request.query_params.get('search', None)
        if search is not None:
            queryset = queryset.filter(username__istartswith=search) | queryset.filter(email__istartswith=search)
        
        limit = self.request.query_params.get('limit', None)
        if limit is not None:
            try:
                queryset = queryset[:abs(int(limit))]
            except ValueError:
                raise exceptions.ValidationError(detail="Invalid query parameters")

        return queryset