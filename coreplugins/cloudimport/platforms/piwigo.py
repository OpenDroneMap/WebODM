# Check http://piwigo.com/
from urllib.parse import urlparse
from os import path
from coreplugins.cloudimport.cloud_platform import File, Folder
from coreplugins.cloudimport.extensions.cloud_library import CloudLibrary

class Platform(CloudLibrary):
    def __init__(self):
        super().__init__('Piwigo', 'http://{server_url}/index.php?/category/{category_id}')
    
    # Cloud Platform
    def platform_file_processing(self, files):
        # Piwigo has the concept of physical albums, that basically expose the actual folders in the file system.
        # So it might happen that if the File Uploader plugin is used for GCP files, that the files will need to be renamed to store multiple GCP files.
        # So basically we are taking any file that contains the string 'gcp_list' and has the extension '.txt' and rename it to 'gcp_list.txt'
        return [self._map_gcp_file_if_necessary(file) for file in files]

    def parse_url(self, url):
        parse_result = urlparse(url)
        paths = parse_result.query.split('/')
        if not 'category' in paths or paths.index('category') >= len(paths) - 1:
            raise Exception('Wrong URL format')
        else:
            category_id = paths[paths.index('category') + 1]
            path = parse_result.path
            if not 'index.php' in path:
                 raise Exception('Wrong URL format')
            
            path = path[0:path.index('index.php')]
            server = parse_result.scheme + '://' + parse_result.netloc + '/' + path
            return [server, category_id]

    def build_folder_api_url(self, information):
        [server_url, folder_id] = information
        return '{server_url}/ws.php?format=json&method=pwg.categories.getList&cat_id={folder_id}&recursive=false'.format(server_url = server_url, folder_id = folder_id)

    def parse_payload_into_folder(self, original_url, payload):
        result = payload['result']['categories'][0]
        return Folder(result['name'], result['url'], result['nb_images'])

    def build_list_files_in_folder_api_url(self, information):
        # ToDo: add pagination
        [server_url, folder_id] = information
        return '{server_url}/ws.php?format=json&method=pwg.categories.getImages&cat_id={folder_id}&recursive=false&per_page=500'.format(server_url = server_url, folder_id = folder_id)
  
    def parse_payload_into_files(self, payload):
        result = payload['result']
        return [File(image['file'], image['element_url']) for image in result['images']]
    
    def _map_gcp_file_if_necessary(self, file):
        _, file_extension = path.splitext(file.name)
        if file_extension.lower() == ".txt" and 'gcp_list' in file.name:
            return File('gcp_list.txt', file.url, file.other)
        return file
    
    # Cloud Library
    def build_folder_list_api_url(self, server_url):
        return '{}/ws.php?format=json&method=pwg.categories.getList&recursive=true&tree_output=true'.format(server_url)
  
    def parse_payload_into_folders(self, payload):
        categories = payload['result']
        return self._flatten_list([self._build_category(cat) for cat in categories])

    def _build_category(self, category):
        name = category['name']
        images = category['nb_images']
        url = category['url']
        subcategories = self._flatten_list([self._build_category(subcat) for subcat in category['sub_categories']]) if category['nb_categories'] > 0 else []
        for subcategory in subcategories:
            subcategory.name = name + ' > ' + subcategory.name
        folder = [Folder(name, url, images)] if images > 0 else []
        return folder + subcategories
    
    def _flatten_list(self, list_of_lists):
        return [item for sublist in list_of_lists for item in sublist]  
