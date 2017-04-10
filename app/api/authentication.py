from rest_framework_jwt.authentication import BaseJSONWebTokenAuthentication


class JSONWebTokenAuthenticationQS(BaseJSONWebTokenAuthentication):
    def get_jwt_value(self, request):
         return request.query_params.get('jwt')