from abc import ABC, abstractmethod
import requests
from os import path
from app.plugins import logger

VALID_IMAGE_EXTENSIONS = ['.tiff', '.tif', '.png', '.jpeg', '.jpg']

class CloudPlatform(ABC):
    """A Cloud Platform is an online platform that can store files. For example Piwigo, Dropbox, Google Drive.
       Platforms have the concept of a folder or album, where files are stored. We will use the platform's API to 
       retrieve all the images in those folders, and import them into WebODM"""

    def __init__(self, name, folder_url_example):
        self.name = name
        self.folder_url_example = folder_url_example
  
    def verify_folder_url(self, folder_url):
        try:
            # Parse the url and get all necessary information
            information = self.parse_url(folder_url)
            # Define the API url we will call to assert that the folder exists and is valid
            folder_api_url = self.build_folder_api_url(information)
            # Call the API
            payload = self.call_api(folder_api_url)
            # Parse payload into a Folder instance
            return self.parse_payload_into_folder(folder_url, payload)
        except Exception as e:
            logger.error(str(e))
            return None
        
  
    def import_from_folder(self, folder_url):
        # Verify the url
        if self.verify_folder_url(folder_url) == None:
            raise Exception('Invalid URL')

        # Parse the url and get all necessary information
        information = self.parse_url(folder_url)
        # Define the API url we will call to get all the files in the folder
        folder_api_url = self.build_list_files_in_folder_api_url(information)
        # Call the API
        payload = self.call_api(folder_api_url)
        # Parse the payload into File instances
        files = self.parse_payload_into_files(payload)
        # Let the specific platform do some processing with the files (if necessary)
        files = self.platform_file_processing(files)
        # Return all the valid files
        return [file for file in files if file.is_valid()]
  
    def call_api(self, api_url):
        response = requests.get(api_url, timeout=10)
        response.raise_for_status()
        return response.json()

    def platform_file_processing(self, files):
        """This method does nothing, but each platform might want to do some processing of the files and they can, by overriding this method"""
        return files
  
    def serialize(self, **kwargs):
        return {'name': self.name, 'folder_url_example': self.folder_url_example, 'type': 'platform'} 
  
    @abstractmethod
    def parse_url(self, url):
        """Parse the given url and return necessary information to prepare the next requests"""

    @abstractmethod
    def build_list_files_in_folder_api_url(self, information):
        """Build the api url from the parsed information. This API should list all the files in the folder"""

    @abstractmethod
    def build_folder_api_url(self, information):
        """Build the api url from the parsed information. This API should return the name (and maybe amount of files) for the folder"""

    @abstractmethod
    def parse_payload_into_folder(self, original_url, payload):
        """Parse the api payload and return a Folder instance"""
  
    @abstractmethod
    def parse_payload_into_files(self, payload):
        """Parse the api payload and return File instances"""

class Folder:
    def __init__(self, name, url, images_count = -1, **kwargs):
        self.name = name
        self.url = url
        self.images_count = images_count
        self.other = kwargs
    
    def serialize(self):
        return {'name': self.name, 'url': self.url, 'images_count': self.images_count}

class File:
    def __init__(self, name, url, **kwargs):
        self.name = name
        self.url = url
        self.other = kwargs
    
    def is_valid(self):
        """Only keep files that are images, or that are named 'gcp_list.txt'"""
        _, file_extension = path.splitext(self.name)
        return file_extension.lower() in VALID_IMAGE_EXTENSIONS or self.name == 'gcp_list.txt'
    
    def serialize(self):
        return {'name': self.name, 'url': self.url}    
    