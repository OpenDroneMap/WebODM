import json

import numpy
from rasterio.enums import ColorInterp
import urllib
import os
from django.http import HttpResponse
from rio_tiler.errors import TileOutsideBounds
from rio_tiler.utils import has_alpha_band, \
    non_alpha_indexes
from rio_tiler.utils import _stats as raster_stats
from rio_tiler.models import ImageStatistics
from rio_tiler.models import Metadata as RioMetadata
from rio_tiler.profiles import img_profiles
from rio_tiler.colormap import cmap as colormap
from rio_tiler.io import COGReader
import numpy as np

from app.raster_utils import export_raster_index
from .hsvblend import hsv_blend
from .hillshade import LightSource
from .formulas import lookup_formula, get_algorithm_list
from .tasks import TaskNestedView
from rest_framework import exceptions
from rest_framework.response import Response
from worker.tasks import export_raster_index

ZOOM_EXTRA_LEVELS = 2

colormap = colormap.register(
    {
        "discrete_ndvi": {
            0: [174, 0, 40, 255],
            1: [174, 0, 40, 255],
            2: [174, 0, 40, 255],
            3: [174, 0, 40, 255],
            4: [174, 0, 40, 255],
            5: [174, 0, 40, 255],
            6: [174, 0, 40, 255],
            7: [174, 0, 40, 255],
            8: [174, 0, 40, 255],
            9: [174, 0, 40, 255],
            10: [174, 0, 40, 255],
            11: [174, 0, 40, 255],
            12: [174, 0, 40, 255],
            13: [174, 0, 40, 255],
            14: [174, 0, 40, 255],
            15: [174, 0, 40, 255],
            16: [174, 0, 40, 255],
            17: [174, 0, 40, 255],
            18: [174, 0, 40, 255],
            19: [174, 0, 40, 255],
            20: [174, 0, 40, 255],
            21: [174, 0, 40, 255],
            22: [174, 0, 40, 255],
            23: [174, 0, 40, 255],
            24: [174, 0, 40, 255],
            25: [174, 0, 40, 255],
            26: [174, 0, 40, 255],
            27: [174, 0, 40, 255],
            28: [174, 0, 40, 255],
            29: [174, 0, 40, 255],
            30: [174, 0, 40, 255],
            31: [174, 0, 40, 255],
            32: [174, 0, 40, 255],
            33: [174, 0, 40, 255],
            34: [174, 0, 40, 255],
            35: [174, 0, 40, 255],
            36: [174, 0, 40, 255],
            37: [174, 0, 40, 255],
            38: [174, 0, 40, 255],
            39: [174, 0, 40, 255],
            40: [174, 0, 40, 255],
            41: [174, 0, 40, 255],
            42: [174, 0, 40, 255],
            43: [174, 0, 40, 255],
            44: [174, 0, 40, 255],
            45: [174, 0, 40, 255],
            46: [174, 0, 40, 255],
            47: [174, 0, 40, 255],
            48: [174, 0, 40, 255],
            49: [174, 0, 40, 255],
            50: [174, 0, 40, 255],
            51: [254, 142, 86, 255],
            52: [254, 142, 86, 255],
            53: [254, 142, 86, 255],
            54: [254, 142, 86, 255],
            55: [254, 142, 86, 255],
            56: [254, 142, 86, 255],
            57: [254, 142, 86, 255],
            58: [254, 142, 86, 255],
            59: [254, 142, 86, 255],
            60: [254, 142, 86, 255],
            61: [254, 142, 86, 255],
            62: [254, 142, 86, 255],
            63: [254, 142, 86, 255],
            64: [254, 142, 86, 255],
            65: [254, 142, 86, 255],
            66: [254, 142, 86, 255],
            67: [254, 142, 86, 255],
            68: [254, 142, 86, 255],
            69: [254, 142, 86, 255],
            70: [254, 142, 86, 255],
            71: [254, 142, 86, 255],
            72: [254, 142, 86, 255],
            73: [254, 142, 86, 255],
            74: [254, 142, 86, 255],
            75: [254, 142, 86, 255],
            76: [254, 142, 86, 255],
            77: [254, 142, 86, 255],
            78: [254, 142, 86, 255],
            79: [254, 142, 86, 255],
            80: [254, 142, 86, 255],
            81: [254, 142, 86, 255],
            82: [254, 142, 86, 255],
            83: [254, 142, 86, 255],
            84: [254, 142, 86, 255],
            85: [254, 142, 86, 255],
            86: [254, 142, 86, 255],
            87: [254, 142, 86, 255],
            88: [254, 142, 86, 255],
            89: [254, 142, 86, 255],
            90: [254, 142, 86, 255],
            91: [254, 142, 86, 255],
            92: [254, 142, 86, 255],
            93: [254, 142, 86, 255],
            94: [254, 142, 86, 255],
            95: [254, 142, 86, 255],
            96: [254, 142, 86, 255],
            97: [254, 142, 86, 255],
            98: [254, 142, 86, 255],
            99: [254, 142, 86, 255],
            100: [254, 142, 86, 255],
            101: [254, 142, 86, 255],
            102: [236, 246, 177, 255],
            103: [236, 246, 177, 255],
            104: [236, 246, 177, 255],
            105: [236, 246, 177, 255],
            106: [236, 246, 177, 255],
            107: [236, 246, 177, 255],
            108: [236, 246, 177, 255],
            109: [236, 246, 177, 255],
            110: [236, 246, 177, 255],
            111: [236, 246, 177, 255],
            112: [236, 246, 177, 255],
            113: [236, 246, 177, 255],
            114: [236, 246, 177, 255],
            115: [236, 246, 177, 255],
            116: [236, 246, 177, 255],
            117: [236, 246, 177, 255],
            118: [236, 246, 177, 255],
            119: [236, 246, 177, 255],
            120: [236, 246, 177, 255],
            121: [236, 246, 177, 255],
            122: [236, 246, 177, 255],
            123: [236, 246, 177, 255],
            124: [236, 246, 177, 255],
            125: [236, 246, 177, 255],
            126: [236, 246, 177, 255],
            127: [236, 246, 177, 255],
            128: [236, 246, 177, 255],
            129: [236, 246, 177, 255],
            130: [236, 246, 177, 255],
            131: [236, 246, 177, 255],
            132: [236, 246, 177, 255],
            133: [236, 246, 177, 255],
            134: [236, 246, 177, 255],
            135: [236, 246, 177, 255],
            136: [236, 246, 177, 255],
            137: [236, 246, 177, 255],
            138: [236, 246, 177, 255],
            139: [236, 246, 177, 255],
            140: [236, 246, 177, 255],
            141: [236, 246, 177, 255],
            142: [236, 246, 177, 255],
            143: [236, 246, 177, 255],
            144: [236, 246, 177, 255],
            145: [236, 246, 177, 255],
            146: [236, 246, 177, 255],
            147: [236, 246, 177, 255],
            148: [236, 246, 177, 255],
            149: [236, 246, 177, 255],
            150: [236, 246, 177, 255],
            151: [236, 246, 177, 255],
            152: [236, 246, 177, 255],
            153: [84, 188, 108, 255],
            154: [1, 126, 71, 255],
            155: [1, 126, 71, 255],
            156: [1, 126, 71, 255],
            157: [1, 126, 71, 255],
            158: [1, 126, 71, 255],
            159: [1, 126, 71, 255],
            160: [1, 126, 71, 255],
            161: [1, 126, 71, 255],
            162: [1, 126, 71, 255],
            163: [1, 126, 71, 255],
            164: [1, 126, 71, 255],
            165: [1, 126, 71, 255],
            166: [1, 126, 71, 255],
            167: [1, 126, 71, 255],
            168: [1, 126, 71, 255],
            169: [1, 126, 71, 255],
            170: [1, 126, 71, 255],
            171: [1, 126, 71, 255],
            172: [1, 126, 71, 255],
            173: [1, 126, 71, 255],
            174: [1, 126, 71, 255],
            175: [1, 126, 71, 255],
            176: [1, 126, 71, 255],
            177: [1, 126, 71, 255],
            178: [1, 126, 71, 255],
            179: [1, 126, 71, 255],
            180: [1, 126, 71, 255],
            181: [1, 126, 71, 255],
            182: [1, 126, 71, 255],
            183: [1, 126, 71, 255],
            184: [1, 126, 71, 255],
            185: [1, 126, 71, 255],
            186: [1, 126, 71, 255],
            187: [1, 126, 71, 255],
            188: [1, 126, 71, 255],
            189: [1, 126, 71, 255],
            190: [1, 126, 71, 255],
            191: [1, 126, 71, 255],
            192: [1, 126, 71, 255],
            193: [1, 126, 71, 255],
            194: [1, 126, 71, 255],
            195: [1, 126, 71, 255],
            196: [1, 126, 71, 255],
            197: [1, 126, 71, 255],
            198: [1, 126, 71, 255],
            199: [1, 126, 71, 255],
            200: [1, 126, 71, 255],
            201: [1, 126, 71, 255],
            202: [1, 126, 71, 255],
            203: [1, 126, 71, 255],
            204: [1, 126, 71, 255],
            205: [1, 126, 71, 255],
            206: [1, 126, 71, 255],
            207: [1, 126, 71, 255],
            208: [1, 126, 71, 255],
            209: [1, 126, 71, 255],
            210: [1, 126, 71, 255],
            211: [1, 126, 71, 255],
            212: [1, 126, 71, 255],
            213: [1, 126, 71, 255],
            214: [1, 126, 71, 255],
            215: [1, 126, 71, 255],
            216: [1, 126, 71, 255],
            217: [1, 126, 71, 255],
            218: [1, 126, 71, 255],
            219: [1, 126, 71, 255],
            220: [1, 126, 71, 255],
            221: [1, 126, 71, 255],
            222: [1, 126, 71, 255],
            223: [1, 126, 71, 255],
            224: [1, 126, 71, 255],
            225: [1, 126, 71, 255],
            226: [1, 126, 71, 255],
            227: [1, 126, 71, 255],
            228: [1, 126, 71, 255],
            229: [1, 126, 71, 255],
            230: [1, 126, 71, 255],
            231: [1, 126, 71, 255],
            232: [1, 126, 71, 255],
            233: [1, 126, 71, 255],
            234: [1, 126, 71, 255],
            235: [1, 126, 71, 255],
            236: [1, 126, 71, 255],
            237: [1, 126, 71, 255],
            238: [1, 126, 71, 255],
            239: [1, 126, 71, 255],
            240: [1, 126, 71, 255],
            241: [1, 126, 71, 255],
            242: [1, 126, 71, 255],
            243: [1, 126, 71, 255],
            244: [1, 126, 71, 255],
            245: [1, 126, 71, 255],
            246: [1, 126, 71, 255],
            247: [1, 126, 71, 255],
            248: [1, 126, 71, 255],
            249: [1, 126, 71, 255],
            250: [1, 126, 71, 255],
            251: [1, 126, 71, 255],
            252: [1, 126, 71, 255],
            253: [1, 126, 71, 255],
            254: [1, 126, 71, 255],
            255: [1, 126, 71, 255]
        }
    }
)
colormap = colormap.register({
    "better_discrete_ndvi": {
        0: [174, 0, 40, 255],
        17: [223, 45, 44, 255],
        34: [254, 109, 72, 255],
        51: [254, 199, 125, 255],
        68: [255, 223, 146, 255],
        85: [255, 239, 173, 255],
        102: [234, 248, 171, 255],
        119: [212, 240, 148, 255],
        136: [182, 227, 136, 255],
        153: [155, 216, 114, 255],
        170: [120, 202, 111, 255],
        187: [121, 200, 115, 255],
        204: [83, 189, 108, 255],
        221: [22, 170, 94, 255],
        238: [0, 151, 84, 255],
        255: [1, 126, 71, 255],
    }
})


def get_zoom_safe(src_dst):
    minzoom, maxzoom = src_dst.spatial_info["minzoom"], src_dst.spatial_info["maxzoom"]
    if maxzoom < minzoom:
        maxzoom = minzoom
    return minzoom, maxzoom


def get_tile_url(task, tile_type, query_params):
    url = '/api/projects/{}/tasks/{}/{}/tiles/{{z}}/{{x}}/{{y}}.png'.format(task.project.id, task.id, tile_type)
    params = {}

    for k in ['formula', 'bands', 'rescale', 'color_map', 'hillshade']:
        if query_params.get(k):
            params[k] = query_params.get(k)

    if len(params) > 0:
        url = url + '?' + urllib.parse.urlencode(params)

    return url


def get_extent(task, tile_type):
    extent_map = {
        'orthophoto': task.orthophoto_extent,
        'dsm': task.dsm_extent,
        'dtm': task.dtm_extent,
    }
    if not tile_type in extent_map:
        raise exceptions.NotFound()

    extent = extent_map[tile_type]

    if extent is None:
        raise exceptions.NotFound()

    return extent


def get_raster_path(task, tile_type):
    return task.get_asset_download_path(tile_type + ".tif")


class TileJson(TaskNestedView):
    def get(self, request, pk=None, project_pk=None, tile_type=""):
        """
        Get tile.json for this tasks's asset type
        """
        task = self.get_and_check_task(request, pk)

        raster_path = get_raster_path(task, tile_type)
        if not os.path.isfile(raster_path):
            raise exceptions.NotFound()

        with COGReader(raster_path) as src:
            minzoom, maxzoom = get_zoom_safe(src)

        return Response({
            'tilejson': '2.1.0',
            'name': task.name,
            'version': '1.0.0',
            'scheme': 'xyz',
            'tiles': [get_tile_url(task, tile_type, self.request.query_params)],
            'minzoom': minzoom - ZOOM_EXTRA_LEVELS,
            'maxzoom': maxzoom + ZOOM_EXTRA_LEVELS,
            'bounds': get_extent(task, tile_type).extent
        })


class Bounds(TaskNestedView):
    def get(self, request, pk=None, project_pk=None, tile_type=""):
        """
        Get the bounds for this tasks's asset type
        """
        task = self.get_and_check_task(request, pk)

        return Response({
            'url': get_tile_url(task, tile_type, self.request.query_params),
            'bounds': get_extent(task, tile_type).extent
        })


class Metadata(TaskNestedView):
    def get(self, request, pk=None, project_pk=None, tile_type=""):
        """
        Get the metadata for this tasks's asset type
        """
        task = self.get_and_check_task(request, pk)
        formula = self.request.query_params.get('formula')
        bands = self.request.query_params.get('bands')

        if formula == '': formula = None
        if bands == '': bands = None

        try:
            expr, hrange = lookup_formula(formula, bands)
        except ValueError as e:
            raise exceptions.ValidationError(str(e))

        pmin, pmax = 2.0, 98.0
        raster_path = get_raster_path(task, tile_type)

        if not os.path.isfile(raster_path):
            raise exceptions.NotFound()
        try:
            with COGReader(raster_path) as src:
                band_count = src.metadata()['count']
                if has_alpha_band(src.dataset):
                    band_count -= 1
                nodata = None
                # Workaround for https://github.com/OpenDroneMap/WebODM/issues/894
                if tile_type == 'orthophoto':
                    nodata = 0

                # info = src.metadata(pmin=pmin, pmax=pmax, histogram_bins=255, histogram_range=hrange, expr=expr,
                #                      nodata=nodata)
                histogram_options = {"bins": 255, "range": hrange}
                metadata = src.metadata(pmin=pmin, pmax=pmax, hist_options=histogram_options, nodata=nodata)
                if expr is not None:
                    data, mask = src.preview(expression=expr)
                    data = numpy.ma.array(data)
                    data.mask = mask == 0
                    expression_bloc = expr.lower().split(",")
                    stats = {
                        f"{expression_bloc[b]}": raster_stats(data[b], percentiles=(2, 98))
                        for b in range(data.shape[0])
                    }
                    stats = {b: ImageStatistics(**s) for b, s in stats.items()}
                    metadata = RioMetadata(statistics=stats, **src.info().dict())
                    print(metadata)
                    print(metadata.json())
                info = json.loads(metadata.json())
        except IndexError as e:
            # Caught when trying to get an invalid raster metadata
            raise exceptions.ValidationError("Cannot retrieve raster metadata: %s" % str(e))

        # Override min/max
        if hrange:
            for b in info['statistics']:
                info['statistics'][b]['min'] = hrange[0]
                info['statistics'][b]['max'] = hrange[1]

        cmap_labels = {
            "jet": "Jet",
            "terrain": "Terrain",
            "gist_earth": "Earth",
            "rdylgn": "RdYlGn",
            "rdylgn_r": "RdYlGn (Reverse)",
            "spectral": "Spectral",
            "discrete_ndvi": "Contrast NDVI",
            "better_discrete_ndvi": "Custom NDVI Index",
            "rplumbo": "Rplumbo (Better NDVI)",
            "spectral_r": "Spectral (Reverse)",
            "pastel1": "Pastel",
        }

        colormaps = []
        algorithms = []
        if tile_type in ['dsm', 'dtm']:
            colormaps = ['jet', 'terrain', 'gist_earth', 'pastel1']
        elif formula and bands:
            colormaps = ['rdylgn', 'spectral', 'rdylgn_r', 'spectral_r', 'rplumbo', 'discrete_ndvi',
                         'better_discrete_ndvi']
            algorithms = *get_algorithm_list(band_count),

        info['color_maps'] = []
        info['algorithms'] = algorithms

        if colormaps:
            for cmap in colormaps:
                try:
                    info['color_maps'].append({
                        'key': cmap,
                        'color_map': colormap.get(cmap).values(),
                        'label': cmap_labels.get(cmap, cmap)
                    })
                except FileNotFoundError:
                    raise exceptions.ValidationError("Not a valid color_map value: %s" % cmap)

        info['name'] = task.name
        info['scheme'] = 'xyz'
        info['tiles'] = [get_tile_url(task, tile_type, self.request.query_params)]

        if info['maxzoom'] < info['minzoom']:
            info['maxzoom'] = info['minzoom']
        info['maxzoom'] += ZOOM_EXTRA_LEVELS
        info['minzoom'] -= ZOOM_EXTRA_LEVELS
        info['bounds'] = {'value': src.bounds, 'crs': src.dataset.crs}
        return Response(info)


def get_elevation_tiles(elevation, url, x, y, z, tilesize, nodata, resampling, padding):
    tile = np.full((tilesize * 3, tilesize * 3), nodata, dtype=elevation.dtype)
    with COGReader(url) as src:
        try:
            left, _ = src.tile(x - 1, y, z, indexes=1, tilesize=tilesize, nodata=nodata,
                               resampling_method=resampling, padding=padding)
            tile[tilesize:tilesize * 2, 0:tilesize] = left
        except TileOutsideBounds:
            pass

        try:
            right, _ = src.tile(x + 1, y, z, indexes=1, tilesize=tilesize, nodata=nodata,
                                resampling_method=resampling, padding=padding)
            tile[tilesize:tilesize * 2, tilesize * 2:tilesize * 3] = right
        except TileOutsideBounds:
            pass
        try:
            bottom, _ = src.tile(x, y + 1, z, indexes=1, tilesize=tilesize, nodata=nodata,
                                 resampling_method=resampling, padding=padding)
            tile[tilesize * 2:tilesize * 3, tilesize:tilesize * 2] = bottom
        except TileOutsideBounds:
            pass
        try:
            top, _ = src.tile(x, y - 1, z, indexes=1, tilesize=tilesize, nodata=nodata,
                              resampling_method=resampling, padding=padding)
            tile[0:tilesize, tilesize:tilesize * 2] = top
        except TileOutsideBounds:
            pass

    tile[tilesize:tilesize * 2, tilesize:tilesize * 2] = elevation

    return tile


class Tiles(TaskNestedView):
    def get(self, request, pk=None, project_pk=None, tile_type="", z="", x="", y="", scale=1):
        """
        Get a tile image
        """
        task = self.get_and_check_task(request, pk)

        z = int(z)
        x = int(x)
        y = int(y)

        scale = int(scale)
        ext = "png"
        driver = "jpeg" if ext == "jpg" else ext

        indexes = None
        nodata = None

        formula = self.request.query_params.get('formula')
        bands = self.request.query_params.get('bands')
        rescale = self.request.query_params.get('rescale')
        color_map = self.request.query_params.get('color_map')
        hillshade = self.request.query_params.get('hillshade')

        if formula == '': formula = None
        if bands == '': bands = None
        if rescale == '': rescale = None
        if color_map == '': color_map = None
        if hillshade == '' or hillshade == '0': hillshade = None

        try:
            expr, _ = lookup_formula(formula, bands)
        except ValueError as e:
            raise exceptions.ValidationError(str(e))

        if tile_type in ['dsm', 'dtm'] and rescale is None:
            rescale = "0,1000"

        if tile_type in ['dsm', 'dtm'] and color_map is None:
            color_map = "gray"

        if tile_type == 'orthophoto' and formula is not None:
            if color_map is None:
                color_map = "gray"
            if rescale is None:
                rescale = "-1,1"

        if nodata is not None:
            nodata = np.nan if nodata == "nan" else float(nodata)
        tilesize = scale * 256
        url = get_raster_path(task, tile_type)
        with COGReader(url) as src:
            if not src.tile_exists(z, x, y):
                raise exceptions.NotFound("Outside of bounds")

        if not os.path.isfile(url):
            raise exceptions.NotFound()

        with COGReader(url) as src:
            minzoom, maxzoom = get_zoom_safe(src)
            has_alpha = has_alpha_band(src.dataset)
            if z < minzoom - ZOOM_EXTRA_LEVELS or z > maxzoom + ZOOM_EXTRA_LEVELS:
                raise exceptions.NotFound()
            # Handle N-bands datasets for orthophotos (not plant health)
            if tile_type == 'orthophoto' and expr is None:
                ci = src.dataset.colorinterp
                # More than 4 bands?
                if len(ci) > 4:
                    # Try to find RGBA band order
                    if ColorInterp.red in ci and \
                            ColorInterp.green in ci and \
                            ColorInterp.blue in ci:
                        indexes = (ci.index(ColorInterp.red) + 1,
                                   ci.index(ColorInterp.green) + 1,
                                   ci.index(ColorInterp.blue) + 1,)
                    else:
                        # Fallback to first three
                        indexes = (1, 2, 3,)
                elif has_alpha:
                    indexes = non_alpha_indexes(src.dataset)

            # Workaround for https://github.com/OpenDroneMap/WebODM/issues/894
            if nodata is None and tile_type == 'orthophoto':
                nodata = 0

        resampling = "nearest"
        padding = 0
        if tile_type in ["dsm", "dtm"]:
            resampling = "bilinear"
            padding = 16
        try:
            with COGReader(url) as src:
                if expr is not None:
                    tile = src.tile(x, y, z, expression=expr, tilesize=tilesize, nodata=nodata,
                                    padding=padding,
                                    resampling_method=resampling)
                else:
                    tile = src.tile(x, y, z, indexes=indexes, tilesize=tilesize, nodata=nodata,
                                    padding=padding, resampling_method=resampling)
        except TileOutsideBounds:
            raise exceptions.NotFound("Outside of bounds")
        if color_map:
            try:
                colormap.get(color_map)
            except FileNotFoundError:
                raise exceptions.ValidationError("Not a valid color_map value")
        intensity = None
        if hillshade is not None:
            try:
                hillshade = float(hillshade)
                if hillshade <= 0:
                    hillshade = 1.0
            except ValueError:
                raise exceptions.ValidationError("Invalid hillshade value")

            if tile.shape[0] != 1:
                raise exceptions.ValidationError(
                    "Cannot compute hillshade of non-elevation raster (multiple bands found)")

            delta_scale = (maxzoom + ZOOM_EXTRA_LEVELS + 1 - z) * 4
            dx = src.meta["transform"][0] * delta_scale
            dy = -src.meta["transform"][4] * delta_scale

            ls = LightSource(azdeg=315, altdeg=45)

            # Hillshading is not a local tile operation and
            # requires neighbor tiles to be rendered seamlessly
            elevation = get_elevation_tiles(tile[0], url, x, y, z, tilesize, nodata, resampling, padding)
            intensity = ls.hillshade(elevation, dx=dx, dy=dy, vert_exag=hillshade)
            intensity = intensity[tilesize:tilesize * 2, tilesize:tilesize * 2]
        if intensity is not None:
            # Quick check
            if tile.data.shape[0] != 3:
                raise exceptions.ValidationError(
                    "Cannot process tile: intensity image provided, but no RGB data was computed.")

            intensity = intensity * 255.0
            rgb = hsv_blend(tile.data, intensity)
        options = img_profiles.get(driver, {})
        rescale_arr = tuple(map(float, rescale.split(",")))
        if color_map is not None and isinstance(color_map, dict):
            return HttpResponse(
                tile.post_process(in_range=(rescale_arr,)).render(img_format=driver, colormap=color_map, **options),
                content_type="image/{}".format(ext)
            )
        elif color_map is not None:
            return HttpResponse(
                tile.post_process(in_range=(rescale_arr,)).render(img_format=driver, colormap=colormap.get(color_map),
                                                                  **options),
                content_type="image/{}".format(ext)
            )
        return HttpResponse(
            tile.post_process(in_range=(rescale_arr,)).render(img_format=driver, **options),
            content_type="image/{}".format(ext)
        )


class Export(TaskNestedView):
    def post(self, request, pk=None, project_pk=None):
        """
        Export an orthophoto after applying a formula
        """
        task = self.get_and_check_task(request, pk)

        formula = request.data.get('formula')
        bands = request.data.get('bands')
        # rescale = request.data.get('rescale')

        if formula == '': formula = None
        if bands == '': bands = None
        # if rescale == '': rescale = None

        if not formula:
            raise exceptions.ValidationError("You need to specify a formula parameter")

        if not bands:
            raise exceptions.ValidationError("You need to specify a bands parameter")

        try:
            expr, _ = lookup_formula(formula, bands)
        except ValueError as e:
            raise exceptions.ValidationError(str(e))

        # if formula is not None and rescale is None:
        #     rescale = "-1,1"

        url = get_raster_path(task, "orthophoto")

        if not os.path.isfile(url):
            raise exceptions.NotFound()

        celery_task_id = export_raster_index.delay(url, expr).task_id
        return Response({'celery_task_id': celery_task_id})
