import os
import logging
import importlib
import subprocess

import django
import json
from django.conf.urls import url
from functools import reduce
from string import Template

from django.http import HttpResponse

from app.models import Plugin
from app.models import Setting
from webodm import settings

logger = logging.getLogger('app.logger')

def init_plugins():
    build_plugins()
    sync_plugin_db()
    register_plugins()

def sync_plugin_db():
    """
    Creates db entries for undiscovered plugins to keep track
    of enabled/disabled plugins
    """
    if settings.MIGRATING: return

    # Erase cache
    clear_plugins_cache()

    db_plugins = Plugin.objects.all()
    fs_plugins = get_plugins()

    # Remove plugins that are in the database but not on the file system
    for db_plugin in db_plugins:
        fs_found = next((fs_plugin for fs_plugin in fs_plugins if db_plugin.name == fs_plugin.get_name()), None)
        if not fs_found:
            Plugin.objects.filter(name=db_plugin.name).delete()
            logger.info("Cleaned [{}] plugin from database (not found in file system)".format(db_plugin.name))

    # Add plugins found in the file system, but not yet in the database
    for plugin in get_plugins():
        # Plugins that have a "disabled" file are disabled
        disabled_path = plugin.get_path("disabled")
        disabled =  os.path.isfile(disabled_path)
        if not disabled:
            _, created = Plugin.objects.get_or_create(
                name=plugin.get_name(),
                defaults={'enabled': not disabled},
            )
            if created:
                logger.info("Added [{}] plugin to database".format(plugin.get_name()))


def clear_plugins_cache():
    global plugins
    plugins = None


def build_plugins():
    for plugin in get_plugins():
        # Check for package.json in public directory
        # and run npm install if needed
        if plugin.path_exists("public/package.json") and not plugin.path_exists("public/node_modules"):
            logger.info("Running npm install for {}".format(plugin))
            subprocess.call(['npm', 'install'], cwd=plugin.get_path("public"))

        # Check if we need to generate a webpack.config.js
        if len(plugin.build_jsx_components()) > 0 and plugin.path_exists('public'):
            build_paths = map(lambda p: os.path.join(plugin.get_path('public'), p), plugin.build_jsx_components())
            paths_ok = not (False in map(lambda p: os.path.exists, build_paths))

            if paths_ok:
                wpc_path = os.path.join(settings.BASE_DIR, 'app', 'plugins', 'templates', 'webpack.config.js.tmpl')
                with open(wpc_path) as f:
                    tmpl = Template(f.read())

                    # Create entry configuration
                    entry = {}
                    for e in plugin.build_jsx_components():
                        entry[os.path.splitext(os.path.basename(e))[0]] = [os.path.join('.', e)]
                    wpc_content = tmpl.substitute({
                        'entry_json': json.dumps(entry)
                    })

                    with open(plugin.get_path('public/webpack.config.js'), 'w') as f:
                        f.write(wpc_content)
            else:
                logger.warning(
                    "Cannot generate webpack.config.js for {}, a path is missing: {}".format(plugin, ' '.join(build_paths)))

        # Check for webpack.config.js (if we need to build it)
        if plugin.path_exists("public/webpack.config.js") and not plugin.path_exists("public/build"):
            logger.info("Running webpack for {}".format(plugin.get_name()))
            subprocess.call(['webpack-cli'], cwd=plugin.get_path("public"))


def register_plugins():
    for plugin in get_active_plugins():
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
def get_plugins():
    """
    :return: all plugins instances (enabled or not)
    """
    # Cache plugins search
    global plugins
    if plugins != None: return plugins

    plugins_path = get_plugins_path()
    plugins = []

    for dir in [d for d in os.listdir(plugins_path) if os.path.isdir(plugins_path)]:
        # Each plugin must have a manifest.json and a plugin.py
        plugin_path = os.path.join(plugins_path, dir)
        pluginpy_path = os.path.join(plugin_path, "plugin.py")
        manifest_path = os.path.join(plugin_path, "manifest.json")

        # Do not load test plugin unless we're in test mode
        if os.path.basename(plugin_path) == 'test' and not settings.TESTING:
            continue

        # Ignore .gitignore
        if os.path.basename(plugin_path) == '.gitignore':
            continue

        # Check plugin required files
        if not os.path.isfile(manifest_path) or not os.path.isfile(pluginpy_path):
            logger.warning("Found invalid plugin in {}".format(plugin_path))
            continue

        # Instantiate the plugin
        try:
            module = importlib.import_module("plugins.{}".format(dir))
            plugin = (getattr(module, "Plugin"))()

            # Check version
            manifest = plugin.get_manifest()
            if 'webodmMinVersion' in manifest:
                min_version = manifest['webodmMinVersion']

                if versionToInt(min_version) > versionToInt(settings.VERSION):
                    logger.warning(
                        "In {} webodmMinVersion is set to {} but WebODM version is {}. Plugin will not be loaded. Update WebODM.".format(
                            manifest_path, min_version, settings.VERSION))
                    continue

            plugins.append(plugin)
        except Exception as e:
            logger.warning("Failed to instantiate plugin {}: {}".format(dir, e))

    return plugins


def get_active_plugins():
    if settings.MIGRATING: return []

    plugins = []
    try:
        enabled_plugins = [p.name for p in Plugin.objects.filter(enabled=True).all()]
        for plugin in get_plugins():
            if plugin.get_name() in enabled_plugins:
                plugins.append(plugin)
    except Exception as e:
        logger.warning("Cannot get active plugins. If running a migration this is expected: %s" % str(e))

    return plugins


def get_plugin_by_name(name, only_active=True, refresh_cache_if_none=False):
    if only_active:
        plugins = get_active_plugins()
    else:
        plugins = get_plugins()

    res = list(filter(lambda p: p.get_name() == name, plugins))
    res = res[0] if res else None

    if refresh_cache_if_none and res is None:
        # Retry after clearing the cache
        clear_plugins_cache()
        return get_plugin_by_name(name, only_active=only_active, refresh_cache_if_none=False)
    else:
        return res

def get_plugins_path():
    current_path = os.path.dirname(os.path.realpath(__file__))
    return os.path.abspath(os.path.join(current_path, "..", "..", "plugins"))


def get_dynamic_script_handler(script_path, callback=None, **kwargs):
    def handleRequest(request):
        if callback is not None:
            template_params = callback(request, **kwargs)
            if not template_params:
                return HttpResponse("")
        else:
            template_params = kwargs

        with open(script_path) as f:
            tmpl = Template(f.read())
            try:
                return HttpResponse(tmpl.substitute(template_params))
            except TypeError as e:
                return HttpResponse("Template substitution failed with params: {}. {}".format(str(template_params), e))

    return handleRequest


def get_site_settings():
    return Setting.objects.first()


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