import importlib
from os import path, listdir
from app.plugins import logger
from .platform_extension import PlatformExtension

platforms = None
def get_all_platforms():
    # Cache platforms search
    global platforms
    if platforms == None:
        platforms = read_platform_from_files()
    return platforms   

def get_platform_by_name(platform_name):
    platforms = get_all_platforms()
    for platform in platforms:
        if platform.name == platform_name:
            return platform
    return None        

def get_all_extended_platforms():
    return [platform for platform in get_all_platforms() if isinstance(platform, PlatformExtension)]

def read_platform_from_files():
    platforms_path = get_platforms_path()
    platforms = []
    for platform_script in [platform for platform in listdir(platforms_path) if path.isfile(path.join(platforms_path, platform))]:
        # Each python script must have a class called Platform
        # Instantiate the platform
        try:
            module_path = "coreplugins.cloudimport.platforms.{}".format(path.splitext(platform_script)[0])
            module = importlib.import_module(module_path)
            platform = (getattr(module, "Platform"))()
            platforms.append(platform)
        except Exception as e:
            logger.warning("Failed to instantiate platform {}: {}".format(platform_script, e))

    assert_all_platforms_are_called_differently(platforms)

    return platforms        

def assert_all_platforms_are_called_differently(platforms):
    platform_names = []
    for platform in platforms:
        if platform.name in platform_names:
            # ToDo: throw an error
            logger.warning('Found multiple platforms with the name {}. This will cause problems...'.format(platform.name))
        else:
            platform_names.append(platform.name)

def get_platforms_path():
    current_path = path.dirname(path.realpath(__file__))
    return path.abspath(path.join(current_path, 'platforms'))    
