from abc import abstractmethod
from django import forms
from rest_framework.response import Response
from rest_framework import status
from app.plugins import get_current_plugin, logger
from app.plugins.views import TaskView
from ..platform_helper import get_platform_by_name
from ..platform_extension import PlatformExtension, StringField
    
class CloudLibrary(PlatformExtension):
    """A Cloud Library is an online platform that has images organized in folders or albums.
       It differs from a Cloud Platform, in the way that it can also list all folders it contains, so that a user can
       choose to import a specific folder from a list, instead of a URL."""

    def __init__(self, name, folder_url_example):
        super().__init__(name, folder_url_example)
    
    def get_form_fields(self):
        return [self.get_server_url_field()]
    
    def get_api_views(self):
        return [("cloudlibrary/(?P<platform_name>[^/.]+)/listfolders", GetAllFoldersTaskView.as_view())]
        
    def serialize(self, **kwargs):
        base_payload = {'name': self.name, 'folder_url_example': self.folder_url_example}
        if kwargs['user'] != None:
            ds = get_current_plugin().get_user_data_store(kwargs['user'])
            server_url_field = self.get_server_url_field()
            stored_value = server_url_field.get_stored_value(ds)
            if stored_value != server_url_field.default_value:
                # If the user is set, and there is a server url set, then consider this platform as 
                # a library. Otherwise, consider it a plain platform
                base_payload['type'] = 'library'
                base_payload[server_url_field.key] = stored_value
                return base_payload
                
        base_payload['type'] = 'platform'        
        return base_payload   
    
    def get_server_url_field(self):
        return ServerURLField(self.name)
    
    def verify_server_url(self, server_url):
        try:
            # Define the API url we will call to get all the folders in the server
            folder_list_api_url = self.build_folder_list_api_url(server_url)
            # Call the API
            payload = self.call_api(folder_list_api_url)
            # Parse the payload into File instances
            self.parse_payload_into_folders(payload)
            # If I could parse it, then everything is ok
            return "OK"
        except Exception as e:
            logger.error(str(e))
            return "Error. Invalid server URL."

    def list_folders_in_server(self, server_url):
        # Define the API url we will call to get all the folders in the server
        folder_list_api_url = self.build_folder_list_api_url(server_url)
        # Call the API
        payload = self.call_api(folder_list_api_url)
        # Parse the payload into File instances
        folders = self.parse_payload_into_folders(payload)
        # Let the specific platform do some processing with the folders (if necessary)
        folders = self.library_folder_processing(folders)
        # Return all folders
        return folders
    
    def library_folder_processing(self, files):
        """This method does nothing, but each platform might want to do some processing of the folders and they can, by overriding this method"""
        return files
  
    @abstractmethod
    def build_folder_list_api_url(self, server_url):
        """Build the url of the API that lists all the folders in the server"""
  
    @abstractmethod
    def parse_payload_into_folders(self, payload):
        """Parse the api payload and return Folder instances"""

class ServerURLField(StringField):
    def __init__(self, platform_name):
        super().__init__('server_url', platform_name, '')
        self.platform_name = platform_name

    def get_django_field(self, user_data_store):
        return forms.URLField(
            label="Server URL",
            help_text="Please insert the URL of the Piwigo server",
            required=False,
            max_length=1024,
            widget=forms.URLInput(attrs={"placeholder": "http://piwigo-server.com"}),
            initial=self.get_stored_value(user_data_store),
            validators=[self.validate_server_url])

    def validate_server_url(self, server_url_to_validate):
        result = get_platform_by_name(self.platform_name).verify_server_url(server_url_to_validate)
        if result != "OK":
            raise forms.ValidationError(result)

class GetAllFoldersTaskView(TaskView):
    def get(self, request, platform_name):
        platform = get_platform_by_name(platform_name)
        
        if platform == None:
            return Response({'error': 'Failed to find a platform with the name \'{}\''.format(platform_name)}, status=status.HTTP_400_BAD_REQUEST)
        
        ds = get_current_plugin().get_user_data_store(request.user)
        
        server_url_field = platform.get_server_url_field()
        server_url = server_url_field.get_stored_value(ds)
        
        if server_url == server_url_field.default_value:
            return Response({'error': 'You can\'t ask for the folders when there is no server configured'}, status=status.HTTP_412_PRECONDITION_FAILED)
        
        folders = platform.list_folders_in_server(server_url)
        
        return Response({'folders': [folder.serialize() for folder in folders]}, status=status.HTTP_200_OK)     