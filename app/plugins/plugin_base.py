import json
import logging, os, sys
from abc import ABC
from app.plugins import UserDataStore, GlobalDataStore

logger = logging.getLogger('app.logger')

class PluginBase(ABC):
    def __init__(self):
        self.name = self.get_module_name().split(".")[-2]
        self.manifest = None

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

    def get_user_data_store(self, user):
        """
        Helper function to instantiate a user data store associated
        with this plugin
        :return: UserDataStore
        """
        return UserDataStore(self.get_name(), user)

    def get_global_data_store(self):
        """
        Helper function to instantiate a user data store associated
        with this plugin
        :return: GlobalDataStore
        """
        return GlobalDataStore(self.get_name())

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

    def path_exists(self, path):
        return os.path.exists(self.get_path(path))

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

    def build_jsx_components(self):
        """
        Experimental
        Should be overriden by plugins that want to automatically
        build JSX files.
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

    def app_mount_points(self):
        """
        Should be overriden by plugins that want to connect
        custom Django views
        :return: [] of MountPoint objects
        """
        return []

    def api_mount_points(self):
        """
        Should be overriden by plugins that want to add
        new API mount points
        :return: [] of MountPoint objects
        """
        return []

    def get_dynamic_script(self, script_path, callback = None, **template_args):
        """
        Retrieves a view handler that serves a dynamic script from
        the plugin's directory. Dynamic scripts are normal Javascript
        files that optionally support Template variable substitution
        via ${vars}, computed on the server.
        :param script_path: path to script relative to plugin's directory.
        :param callback: optional callback. The callback can prevent the script from being returned if it returns False.
            If it returns a dictionary, the dictionary items are used for variable substitution.
        :param template_args: Parameters to use for variable substitution (unless a callback is specified)
        :return: Django view
        """
        from app.plugins import get_dynamic_script_handler
        return get_dynamic_script_handler(self.get_path(script_path), callback, **template_args)

    def get_manifest(self):
        # Lazy loading
        if self.manifest: return self.manifest

        manifest_path = self.get_path("manifest.json")

        # Read manifest
        with open(manifest_path) as manifest_file:
            self.manifest = json.load(manifest_file)

        return self.manifest

    def __str__(self):
        return "[{}]".format(self.get_module_name())