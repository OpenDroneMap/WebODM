import os
import logging
import importlib

import django
from django.conf.urls import url

logger = logging.getLogger('app.logger')

def register_plugins():
    for plugin in get_active_plugins():
        plugin.register()
        logger.info("Registered {}".format(plugin))


def get_url_patterns():
    """
    @return the patterns to expose the /public directory of each plugin (if needed)
    """
    url_patterns = []
    for plugin in get_active_plugins():
        if plugin.has_public_path():
            url_patterns.append(url('^plugins/{}/(.*)'.format(plugin.get_name()),
                                    django.views.static.serve,
                                    {'document_root': plugin.get_path("public")}))
    return url_patterns

plugins = None
def get_active_plugins():
    # Cache plugins search
    global plugins
    if plugins != None: return plugins

    plugins = []
    plugins_path = get_plugins_path()

    for dir in [d for d in os.listdir(plugins_path) if os.path.isdir(plugins_path)]:
        # Each plugin must have a manifest.json and a plugin.py
        plugin_path = os.path.join(plugins_path, dir)
        manifest_path = os.path.join(plugin_path, "manifest.json")
        pluginpy_path = os.path.join(plugin_path, "plugin.py")
        disabled_path = os.path.join(plugin_path, "disabled")

        if not os.path.isfile(manifest_path) or not os.path.isfile(pluginpy_path):
            logger.warning("Found invalid plugin in {}".format(plugin_path))
            continue

        # Plugins that have a "disabled" file are disabled
        if os.path.isfile(disabled_path):
            continue

        # Instantiate the plugin
        try:
            module = importlib.import_module("plugins.{}".format(dir))
            cls = getattr(module, "Plugin")
            plugins.append(cls())
        except Exception as e:
            logger.warning("Failed to instantiate plugin {}: {}".format(dir, e))

    return plugins


def get_plugins_path():
    current_path = os.path.dirname(os.path.realpath(__file__))
    return os.path.abspath(os.path.join(current_path, "..", "..", "plugins"))
