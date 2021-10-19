from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework import exceptions, permissions, parsers
from rest_framework.response import Response

class UsersList(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    parser_classes = (parsers.JSONParser, parsers.FormParser,)

    def get(self, request):
        qs = User.objects.all()

        search = self.request.query_params.get('search', None)
        if search is not None:
            qs = qs.filter(username__istartswith=search) | qs.filter(email__istartswith=search)
            
        limit = self.request.query_params.get('limit', None)
        if limit is not None:
            try:
                qs = qs[:abs(int(limit))]
            except ValueError:
                raise exceptions.ValidationError(detail="Invalid query parameters")

        return Response([{'username': u.username, 'email': u.email} for u in qs])