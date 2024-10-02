from rest_framework_jwt.authentication import JSONWebTokenAuthentication


class JSONWebTokenAuthenticationQS(JSONWebTokenAuthentication):
    def get_jwt_value(self, request):
         return request.query_params.get('jwt')