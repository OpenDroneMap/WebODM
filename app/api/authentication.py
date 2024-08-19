# from rest_framework_jwt.authentication import BaseJSONWebTokenAuthentication
#
# jwt_decode_handler = api_settings.JWT_DECODE_HANDLER
# jwt_get_username_from_payload_handler = api_settings.JWT_PAYLOAD_GET_USERNAME_HANDLER
#
# class JSONWebTokenAuthenticationQS(BaseJSONWebTokenAuthentication):
#     def get_jwt_value(self, request):
#          return request.query_params.get('jwt')