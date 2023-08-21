import requests
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.models import User
from nodeodm.models import ProcessingNode
from webodm.settings import EXTERNAL_AUTH_ENDPOINT, USE_EXTERNAL_AUTH
from guardian.shortcuts import assign_perm
import logging

logger = logging.getLogger('app.logger')

class ExternalBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None):
        if not USE_EXTERNAL_AUTH:
            return None
        
        try:
            r = requests.post(EXTERNAL_AUTH_ENDPOINT, {
                'username': username,
                'password': password
            }, headers={'Accept': 'application/json'})
            res = r.json()

            if 'message' in res or 'error' in res:
                return None
            
            logger.info(res)

            if 'user_id' in res:
                try:
                    user = User.objects.get(pk=res['user_id'])

                    # Update user info
                    if user.username != username:
                        user.username = username
                        user.save()
                except User.DoesNotExist:
                    user = User(pk=res['user_id'], username=username)
                    user.save()

                # Setup/update processing node
                if ('api_key' in res or 'token' in res) and 'node' in res:
                    hostname = res['node']['hostname']
                    port = res['node']['port']
                    token = res['api_key'] if 'api_key' in res else res['token']

                    try:
                        node = ProcessingNode.objects.get(token=token)
                        if node.hostname != hostname or node.port != port:
                            node.hostname = hostname
                            node.port = port
                            node.save()
                        
                    except ProcessingNode.DoesNotExist:
                        node = ProcessingNode(hostname=hostname, port=port, token=token)
                        node.save()
                    
                    if not user.has_perm('view_processingnode', node):
                        assign_perm('view_processingnode', user, node)

                return user
            else:
                return None
        except:
            return None
    
    def get_user(self, user_id):
        if not USE_EXTERNAL_AUTH:
            return None

        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None