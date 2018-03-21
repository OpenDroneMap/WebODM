import os
import logging
import importlib
import subprocess

import django
import json
from django.conf.urls import url
from functools import reduce

from webodm import settings

logger = logging.getLogger('app.logger')

def register_plugins():
    for plugin in get_active_plugins():

        # Check for package.json in public directory
        # and run npm install if needed
        if plugin.path_exists("public/package.json") and not plugin.path_exists("public/node_modules"):
            logger.info("Running npm install for {}".format(plugin.get_name()))
            subprocess.call(['npm', 'install'], cwd=plugin.get_path("public"))

        # Check for webpack.config.js (if we need to build it)
        if plugin.path_exists("public/webpack.config.js") and not plugin.path_exists("public/build"):
            logger.info("Running webpack for {}".format(plugin.get_name()))
            subprocess.call(['webpack'], cwd=plugin.get_path("public"))

        plugin.register()
        logger.info("Registered {}".format(plugin))


def get_app_url_patterns():
    """
    @return the patterns to expose the /public directory of each plugin (if needed) and
        each mount point
    """
    url_patterns = []
    for plugin in get_active_plugins():
        for mount_point in plugin.app_mount_points():
            url_patterns.append(url('^plugins/{}/{}'.format(plugin.get_name(), mount_point.url),
                                mount_point.view,
                                *mount_point.args,
                                **mount_point.kwargs))

        if plugin.path_exists("public"):
            url_patterns.append(url('^plugins/{}/(.*)'.format(plugin.get_name()),
                                    django.views.static.serve,
                                    {'document_root': plugin.get_path("public")}))

    return url_patterns

def get_api_url_patterns():
    """
    @return the patterns to expose the plugin API mount points (if any)
    """
    url_patterns = []
    for plugin in get_active_plugins():
        for mount_point in plugin.api_mount_points():
            url_patterns.append(url('^plugins/{}/{}'.format(plugin.get_name(), mount_point.url),
                                mount_point.view,
                                *mount_point.args,
                                **mount_point.kwargs))

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

        # Do not load test plugin unless we're in test mode
        if os.path.basename(plugin_path) == 'test' and not settings.TESTING:
            continue

        if not os.path.isfile(manifest_path) or not os.path.isfile(pluginpy_path):
            logger.warning("Found invalid plugin in {}".format(plugin_path))
            continue

        # Plugins that have a "disabled" file are disabled
        if os.path.isfile(disabled_path):
            continue

        # Read manifest
        with open(manifest_path) as manifest_file:
            manifest = json.load(manifest_file)
            if 'webodmMinVersion' in manifest:
                min_version = manifest['webodmMinVersion']

                if versionToInt(min_version) > versionToInt(settings.VERSION):
                    logger.warning("In {} webodmMinVersion is set to {} but WebODM version is {}. Plugin will not be loaded. Update WebODM.".format(manifest_path, min_version, settings.VERSION))
                    continue

        # Instantiate the plugin
        try:
            module = importlib.import_module("plugins.{}".format(dir))
            cls = getattr(module, "Plugin")
            plugins.append(cls())
        except Exception as e:
            logger.warning("Failed to instantiate plugin {}: {}".format(dir, e))

    return plugins


def get_plugin_by_name(name):
    plugins = get_active_plugins()
    res = list(filter(lambda p: p.get_name() == name, plugins))
    return res[0] if res else None


def get_plugins_path():
    current_path = os.path.dirname(os.path.realpath(__file__))
    return os.path.abspath(os.path.join(current_path, "..", "..", "plugins"))


def versionToInt(version):
    """
    Converts a WebODM version string (major.minor.build) to a integer value
    for comparison
    >>> versionToInt("1.2.3")
    100203
    >>> versionToInt("1")
    100000
    >>> versionToInt("1.2.3.4")
    100203
    >>> versionToInt("wrong")
    -1
    """

    try:
        return sum([reduce(lambda mult, ver: mult * ver, i) for i in zip([100000, 100, 1], map(int, version.split(".")))])
    except:
        return -1