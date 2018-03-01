import logging, os, sys
from abc import ABC

logger = logging.getLogger('app.logger')

class PluginBase(ABC):
    def __init__(self):
        self.name = self.get_module_name().split(".")[-2]

    def register(self):
        pass

    def get_path(self, *paths):
        """
        Gets the path of the directory of the plugin, optionally chained with paths
        :return: path
        """
        return os.path.join(os.path.dirname(sys.modules[self.get_module_name()].__file__), *paths)

    def get_name(self):
        """
        :return: Name of current module (reflects the directory in which this plugin is stored)
        """
        return self.name

    def get_module_name(self):
        return self.__class__.__module__

    def get_include_js_urls(self):
        return [self.public_url(js_file) for js_file in self.include_js_files()]

    def get_include_css_urls(self):
        return [self.public_url(css_file) for css_file in self.include_css_files()]

    def public_url(self, path):
        """
        :param path: unix-style path
        :return: Path that can be accessed via a URL (from the browser), relative to plugins/<yourplugin>/public
        """
        return "/plugins/{}/{}".format(self.get_name(), path)

    def template_path(self, path):
        """
        :param path: unix-style path
        :return: path used to reference Django templates for a plugin
        """
        return "plugins/{}/templates/{}".format(self.get_name(), path)

    def has_public_path(self):
        return os.path.isdir(self.get_path("public"))

    def include_js_files(self):
        """
        Should be overriden by plugins to communicate
        which JS files should be included in the WebODM interface
        All paths are relative to a plugin's /public folder.
        """
        return []

    def include_css_files(self):
        """
        Should be overriden by plugins to communicate
        which CSS files should be included in the WebODM interface
        All paths are relative to a plugin's /public folder.
        """
        return []

    def main_menu(self):
        """
        Should be overriden by plugins that want to add
        items to the side menu.
        :return: [] of Menu objects
        """
        return []

    def mount_points(self):
        """
        Should be overriden by plugins that want to connect
        custom Django views
        :return: [] of MountPoint objects
        """
        return []

    def __str__(self):
        return "[{}]".format(self.get_module_name())