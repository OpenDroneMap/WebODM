# Check https://github.com/
from urllib.parse import urlparse
from os import path
from plugins.cloudimport.cloud_platform import File, Folder, CloudPlatform
from app.plugins import logger

class Platform(CloudPlatform):
    def __init__(self):
        super().__init__('GitHub', 'https://github.com/{owner}/{repo}/tree/{commit/branch/tag}/{path to folder}')

    # Cloud Platform
    def parse_url(self, url):
        parse_result = urlparse(url)
        path_split = parse_result.path.split('/')
        if len(path_split) < 5:
            raise Exception('Wrong URL format')
        _, owner, repo, _, ref, *paths = path_split
        path = '/'.join(paths)

        return [owner, repo, ref, path]

    def build_folder_api_url(self, information):
        [owner, repo, ref, path] = information
        return 'https://api.github.com/repos/{owner}/{repo}/contents/{path}?ref={ref}'.format(owner = owner, repo = repo, ref = ref, path = path)

    def parse_payload_into_folder(self, original_url, payload):
        name = original_url.split('/')[-1].title()
        return Folder(name, original_url, len(payload))

    def build_list_files_in_folder_api_url(self, information):
        # ToDo: add pagination
        [owner, repo, ref, path] = information
        return 'https://api.github.com/repos/{owner}/{repo}/contents/{path}?ref={ref}'.format(owner = owner, repo = repo, ref = ref, path = path)

    def parse_payload_into_files(self, payload):
        return [File(file['name'], file['download_url']) for file in payload]
