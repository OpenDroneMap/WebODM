import os
import json
import shutil
import hashlib
import tempfile
import zipfile
import urllib.request

from django.db import migrations
from webodm import settings

REPO_URL = "https://plugins.webodm.org"
MOVED_PLUGINS = [
    "align-service",
    "cesiumion",
    "dronedb",
    "editshortlinks",
    "gpslocation",
    "osm-quickedit",
    "projects-charts",
    "shortlinks",
    "task-manager",
    "tasknotification",
]


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "WebODM/{}".format(settings.VERSION)})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def install_plugin(p, plugins_path):
    if shutil.which("webpack") is not None:
        url, sha256 = p.get("url"), p.get("sha256")
    else:
        url, sha256 = p.get("prebuilt_url"), p.get("prebuilt_sha256")
    if not url:
        raise ValueError("No download URL")
    if not url.startswith("http"):
        url = REPO_URL + url

    data = fetch(url)
    if sha256 and hashlib.sha256(data).hexdigest() != sha256.lower():
        raise ValueError("Checksum mismatch")

    os.makedirs(settings.MEDIA_TMP, exist_ok=True)
    tmp_path = tempfile.mkdtemp("plugin", dir=settings.MEDIA_TMP)
    try:
        zip_path = os.path.join(tmp_path, "plugin.zip")
        extract_path = os.path.join(tmp_path, "extract")
        with open(zip_path, "wb") as f:
            f.write(data)
        with zipfile.ZipFile(zip_path, "r") as z:
            z.extractall(extract_path)

        folders = os.listdir(extract_path)
        if folders != [p["id"]]:
            raise ValueError("Unexpected archive layout: {}".format(folders))
        plugin_path = os.path.join(extract_path, p["id"])
        for f in ["plugin.py", "manifest.json"]:
            if not os.path.isfile(os.path.join(plugin_path, f)):
                raise ValueError("Missing {}".format(f))

        shutil.move(plugin_path, plugins_path)
    finally:
        shutil.rmtree(tmp_path, ignore_errors=True)


def update_plugins(apps, schema_editor):
    Plugin = apps.get_model('app', 'Plugin')

    coreplugins_path = os.path.join(settings.BASE_DIR, "coreplugins")
    plugins_path = os.path.join(settings.MEDIA_ROOT, "plugins")

    names = [p.name for p in Plugin.objects.filter(enabled=True, name__in=MOVED_PLUGINS)
             if not os.path.exists(os.path.join(coreplugins_path, p.name))
             and not os.path.exists(os.path.join(plugins_path, p.name))]
    if not names:
        return

    try:
        index = {p.get("id"): p for p in json.loads(fetch(REPO_URL + "/index.json")).get("plugins", [])}
    except Exception as e:
        print("Cannot fetch plugin index from {}: {}. Plugins {} will need to be installed manually.".format(REPO_URL, str(e), ", ".join(names)))
        return

    os.makedirs(plugins_path, exist_ok=True)

    for name in names:
        if name not in index:
            print("Plugin {} not found in {}, skipping".format(name, REPO_URL))
            continue
        try:
            install_plugin(index[name], plugins_path)
            print("Installed plugin {} from {}".format(name, REPO_URL))
        except Exception as e:
            print("Cannot install plugin {}: {}. It will need to be installed manually.".format(name, str(e)))


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0052_grid_shift_correction'),
    ]

    operations = [
        migrations.RunPython(update_plugins, migrations.RunPython.noop),
    ]
