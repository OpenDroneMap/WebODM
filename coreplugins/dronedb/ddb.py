import requests
from os import path
from app.plugins import logger
import validators
from urllib.parse import urlparse

VALID_IMAGE_EXTENSIONS = ['.tiff', '.tif', '.png', '.jpeg', '.jpg']

class Logger:    
    def info(self, text):
        print(text)
        
    def error(self, text):
        print(text)
        
logger = Logger()

class DroneDB:
  
    def __init__(self, registry_url, username, password):

        if not validators.url(registry_url):
            raise ValueError("Invalid registry URL.")

        self.username = username
        self.password = password
        self.token = None
        self.public = False if username else True
        
        self.__registry_url = registry_url[:-1] if registry_url.endswith('/') else registry_url
        self.__authenticate_url = self.__registry_url + "/users/authenticate"
        self.__refresh_url = self.__registry_url + "/users/authenticate/refresh"
        self.__get_organizations_url = self.__registry_url + "/orgs"
        self.__get_datasets_url = self.__registry_url + "/orgs/{0}/ds"
        self.__get_folders_url = self.__registry_url + "/orgs/{0}/ds/{1}/search"
        self.__get_files_list_url = self.__registry_url + "/orgs/{0}/ds/{1}/list"
        self.__download_file_url = self.__registry_url + "/orgs/{0}/ds/{1}/download?path={2}&inline=1"
 
    def login(self):

        if (self.public):
            logger.info("No need to login to DroneDB.")
            return True

        # Authenticate
        payload = {'username': self.username, 'password': self.password}
        response = requests.post(self.__authenticate_url, data=payload)

        if response.status_code != 200:
            return False

        # Get the token
        self.token = response.json()['token']

        logger.info("Logged in to DroneDB as user " + self.username + ".")    

        return True            

    def get_organizations(self):
        
        headers = {}

        if not self.public and self.token is None and not self.login():
            raise ValueError("Could not authenticate to DroneDB.")
        
        if self.token is not None:
            headers = {'Authorization': 'Bearer ' + self.token }
        
        # Get the organizations
        response = requests.get(self.__get_organizations_url, headers=headers)
        if response.status_code != 200:
            raise Exception("Failed to get organizations.")

        return [{'slug': o['slug'], 'name': o['name']} for o in response.json()]

    def get_datasets(self, orgSlug):
        
        headers = {}

        if not self.public and self.token is None and not self.login():
            raise ValueError("Could not authenticate to DroneDB.")
        
        if self.token is not None:
            headers = {'Authorization': 'Bearer ' + self.token }
        
        # Get the datasets
        response = requests.get(self.__get_datasets_url.format(orgSlug), headers=headers)
        if response.status_code != 200:
            raise Exception("Failed to get datasets.")

        return [
            {'slug': o['slug'], 
             'name': o['name'], 
             'public': o['properties'].get('public'), 
             'size': o['size'], 
             'entries': o['properties'].get('entries')
            } for o in response.json()]
    
    def get_folders(self, orgSlug, dsSlug):
        
        headers = {}

        if not self.public and self.token is None and not self.login():
            raise ValueError("Could not authenticate to DroneDB.")
        
        if self.token is not None:
            headers = {'Authorization': 'Bearer ' + self.token }

        # Type 1 is folder
        payload = {'query': '*', 'recursive': True, 'type': 1}

        # Get the folders
        response = requests.post(self.__get_folders_url.format(orgSlug, dsSlug), data=payload, headers=headers)
        if response.status_code != 200:
            raise Exception("Failed to get folders.")

        return [o['path'] for o in response.json()]

    def get_files_list(self, orgSlug, dsSlug, folder=None):
        
        headers = {}

        if not self.public and self.token is None and not self.login():
            raise ValueError("Could not authenticate to DroneDB.")
        
        if self.token is not None:
            headers = {'Authorization': 'Bearer ' + self.token }
        
        # Type 1 is folder
        params = {'path': '' if folder is None else folder}

        # Get the folders
        response = requests.get(self.__get_files_list_url.format(orgSlug, dsSlug), params=params, headers=headers)
        if response.status_code != 200:
            raise Exception("Failed to get files list.")

        return [{'path': o['path'], 
             'type': o['type'], 
             'size': o['size'],
             'url': self.__download_file_url.format(orgSlug, dsSlug, o['path'])
             } for o in response.json()]

def verify_url(url, username=None, password=None):
    try:

        info = parse_url(url)

        ddb = DroneDB(info['registryUrl'], username, password)
        files = ddb.get_files_list(info['orgSlug'], info['dsSlug'], info['folder'])

        # return files count
        return len(files)

    except Exception as e:
        logger.error(e)
        return False

def parse_url(url):

    # Check if the url is valid
    # Root folder of dataset:       ddb://localhost:5001/admin/4uyyyaxcbvahd7qb
    # 'test' folder of dataset:     ddb://localhost:5001/admin/4uyyyaxcbvahd7qb/test
    # using http instead of https:  ddb+unsafe://localhost:5001/admin/4uyyyaxcbvahd7qb
    # using hub url:                https://localhost:5001/r/admin/4uyyyaxcbvahd7qb

    p = urlparse(url)
    segments = p.path.split('/')

    if p.scheme not in ['ddb', 'ddb+unsafe', 'http', 'https']:
        raise ValueError("Invalid URL scheme.")

    if p.netloc == '':
        raise ValueError("Invalid URL.")
    
    scheme = p.scheme

    # used to skip the /r/: if ddb url we have no /r/ instead if http we have it
    if p.scheme == 'ddb':
        scheme = 'https'
        offset = 0
    elif p.scheme == 'ddb+unsafe':
        scheme = 'http'
        offset = 0
    else:
        offset = 1    
        
    if (len(segments) < offset + 3):
        raise ValueError("Invalid URL.")

    return {
        'registryUrl': scheme + '://' + p.netloc,
        'orgSlug': segments[1 + offset],
        'dsSlug': segments[2 + offset],
        'folder': '/'.join(segments[3 + offset:])
    }
    
    # def verify_folder_url(self, folder_url):
    #     try:
    #         # Parse the url and get all necessary information
    #         information = self.parse_url(folder_url)
    #         # Define the API url we will call to assert that the folder exists and is valid
    #         folder_api_url = self.build_folder_api_url(information)
    #         # Call the API
    #         payload = self.call_api(folder_api_url)
    #         # Parse payload into a Folder instance
    #         return self.parse_payload_into_folder(folder_url, payload)
    #     except Exception as e:
    #         logger.error(str(e))
    #         return None
        
  
    # def import_from_folder(self, folder_url):
    #     # Verify the url
    #     if self.verify_folder_url(folder_url) == None:
    #         raise Exception('Invalid URL')

    #     # Parse the url and get all necessary information
    #     information = self.parse_url(folder_url)
    #     # Define the API url we will call to get all the files in the folder
    #     folder_api_url = self.build_list_files_in_folder_api_url(information)
    #     # Call the API
    #     payload = self.call_api(folder_api_url)
    #     # Parse the payload into File instances
    #     files = self.parse_payload_into_files(payload)
    #     # Let the specific platform do some processing with the files (if necessary)
    #     files = self.platform_file_processing(files)
    #     # Return all the valid files
    #     return [file for file in files if file.is_valid()]


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
    