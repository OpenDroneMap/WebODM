from django.contrib.auth.models import Group
from rest_framework.views import APIView
from rest_framework import exceptions, permissions, parsers
from rest_framework.response import Response

class GroupsList(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    parser_classes = (parsers.JSONParser, parsers.FormParser,)

    def get(self, request):
        qs = Group.objects.all().order_by('name')

        search = self.request.query_params.get('search', None)
        if search is not None:
            qs = qs.filter(name__istartswith=search)

        limit = self.request.query_params.get('limit', None)
        if limit is not None:
            try:
                qs = qs[:abs(int(limit))]
            except ValueError:
                raise exceptions.ValidationError(detail="Invalid query parameters")

        return Response([{'name': g.name, 'id': g.id} for g in qs])
