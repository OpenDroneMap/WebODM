from zipfile import ZipFile, BadZipfile
from collections import namedtuple
import imp

Coordinate = namedtuple("Coordinate", ["lng", "lat", "height"])


def module_exists(module):
    try:
        imp.find_module(module)
        return True
    except ImportError:
        return False


def get_python_texture_min_height(zip_file):
    archive = ZipFile(zip_file, "r")
    target_obj = "odm_textured_model_geo.obj"
    if target_obj not in archive.namelist():
        raise BadZipfile(f"Cannot find georefenced file: {target_obj}")

    delimiter = b" "
    start_tag, delim_tag = ord("v"), ord(delimiter)

    min_height = float("inf")
    with archive.open(target_obj) as obj:
        for line in obj:
            if line[0] != start_tag or line[1] != delim_tag:
                continue
            temp_float = float(line.split(delimiter, 3)[3])
            if temp_float < min_height:
                min_height = temp_float

    if min_height == float("inf"):
        raise Exception("Unable to find minimum vertex")

    return min_height


def get_numpy_texture_min_height(zip_file):
    import numpy as np

    archive = ZipFile(zip_file, "r")
    target_obj = "odm_textured_model_geo.obj"
    if target_obj not in archive.namelist():
        raise BadZipfile(f"Cannot find georefenced file: {target_obj}")

    vertices = np.fromregex(
        archive.open(target_obj),
        r"v (-?\d+\.\d+) (-?\d+\.\d+) (-?\d+\.\d+).*",
        [("lat", np.float32), ("lng", np.float32), ("height", np.float32)],
    )

    if len(vertices["height"]) <= 0:
        raise Exception("Unable to find minimum vertex")

    return min(vertices["height"])


def get_texture_min_height(zip_file):
    if module_exists("numpy"):
        return get_numpy_texture_min_height(zip_file)
    else:
        return get_python_texture_min_height(zip_file)


def get_texture_model_origin(task):
    extent = None
    if task.dsm_extent is not None:
        extent = task.dsm_extent.extent
    if task.dtm_extent is not None:
        extent = task.dtm_extent.extent
    if extent is None:
        raise Exception(f"Unable to find task boundary: {task}")

    lng, lat = extent[0], extent[1]
    # texture_model_path = task.get_asset_download_path("textured_model.zip")
    # height = get_texture_min_height(texture_model_path)
    return Coordinate(lng=lng, lat=lat, height=0)
