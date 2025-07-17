import rasterio
import re
import logging
import os
import subprocess
import numpy as np
import numexpr as ne
from django.contrib.gis.geos import GEOSGeometry
from rasterio.enums import ColorInterp
from rasterio.vrt import WarpedVRT
from rasterio.windows import Window, bounds as window_bounds, from_bounds
from rio_tiler.utils import has_alpha_band, linear_rescale
from rio_tiler.colormap import cmap as colormap, apply_cmap
from rio_tiler.errors import InvalidColorMapName
from app.api.hsvblend import hsv_blend
from app.api.hillshade import LightSource
from app.geoutils import geom_transform_wkt_bbox
from rio_tiler.io import COGReader
from rasterio.warp import calculate_default_transform

logger = logging.getLogger('app.logger')

ZOOM_EXTRA_LEVELS = 3

def extension_for_export_format(export_format):
    extensions = {
        'gtiff': 'tif',
        'gtiff-rgb': 'tif',
    }
    return extensions.get(export_format, export_format)

# Based on https://github.com/uav4geo/GeoDeep/blob/main/geodeep/slidingwindow.py
def compute_subwindows(window, max_window_size, overlap_pixels=0):
    col_off = int(window.col_off)
    row_off = int(window.row_off)
    width = int(window.width)
    height = int(window.height)

    win_size_x = min(max_window_size, width)
    win_size_y = min(max_window_size, height)

    step_size_x = win_size_x - overlap_pixels
    step_size_y = win_size_y - overlap_pixels

    last_x = col_off + width - win_size_x
    last_y = row_off + height - win_size_y
    x_offsets = list(range(col_off, last_x + 1, step_size_x))
    y_offsets = list(range(row_off, last_y + 1, step_size_y))

    if len(x_offsets) == 0 or x_offsets[-1] != last_x:
        x_offsets.append(last_x)
    if len(y_offsets) == 0 or y_offsets[-1] != last_y:
        y_offsets.append(last_y)

    # Generate the list of windows
    windows = []
    for x_offset in x_offsets:
        for y_offset in y_offsets:
            w = Window(
                    x_offset,
                    y_offset,
                    win_size_x,
                    win_size_y,
                )
            dst_w = Window(
                x_offset - window.col_off, 
                y_offset - window.row_off, 
                win_size_x, win_size_y
            )
             
            windows.append((w, dst_w))

    return windows

def export_raster(input, output, **opts):
    epsg = opts.get('epsg')
    expression = opts.get('expression')
    export_format = opts.get('format')
    rescale = opts.get('rescale')
    color_map = opts.get('color_map')
    hillshade = opts.get('hillshade')
    asset_type = opts.get('asset_type')
    name = opts.get('name', 'raster') # KMZ specific
    crop_wkt = opts.get('crop')

    dem = asset_type in ['dsm', 'dtm']

    import time
    now = time.time()

    if crop_wkt is not None:
        with rasterio.open(input) as ds:
            crop = GEOSGeometry(crop_wkt)
            crop.srid = 4326
            cutline, bounds = geom_transform_wkt_bbox(crop, ds, 'raster')
            vrt_options = {'cutline': cutline, 'nodata': 0}
    else:
        vrt_options = None
    
    with COGReader(input, vrt_options=vrt_options) as ds_src:
        src = ds_src.dataset
        profile = src.meta.copy()
        win_bounds = None
        src_transform = None
        dst_width = src.width
        dst_height = src.height

        if vrt_options is None:
            reader = src
            win = Window(0, 0, dst_width, dst_height)
            src_transform = src.transform
        else:
            reader = WarpedVRT(src, **vrt_options)
            dst_width = bounds[2] - bounds[0]
            dst_height = bounds[3] - bounds[1]
            win = Window(bounds[0], bounds[1], dst_width, dst_height)
            win_bounds = window_bounds(win, profile['transform'])

            src_transform, width, height = calculate_default_transform(
                src.crs, src.crs, src.width, src.height,
                left=win_bounds[0],
                bottom=win_bounds[1],
                right=win_bounds[2],
                top=win_bounds[3],
                dst_width=dst_width,
                dst_height=dst_height)

            profile.update(
                transform=src_transform,
                width=width,
                height=height
            )
            
        # Output format
        driver = "GTiff"
        compress = None
        max_bands = 9999
        window_size = 512
        with_alpha = True
        rgb = False
        indexes = src.indexes
        output_raster = output
        jpg_background = 255 # white
        reproject = src.crs is not None and epsg is not None and src.crs.to_epsg() != epsg
        path_base, _ = os.path.splitext(output)

        # KMZ is special, we just export it as GeoTIFF
        # and then call GDAL to tile/package it
        kmz = export_format == "kmz"
        if kmz:
            export_format = "gtiff-rgb"
            output_raster = path_base + ".kmz.tif"

        # JPG and PNG are exported to GeoTIFF only if reprojection is needed
        jpg = export_format == "jpg"
        png = export_format == "png"
        if reproject:
            if jpg:
                export_format = 'gtiff-rgb'
                path_base, _ = os.path.splitext(output)
                output_raster = path_base + ".jpg.tif"
            if png:
                export_format = 'gtiff-rgb'
                path_base, _ = os.path.splitext(output)
                output_raster = path_base + ".png.tif"

        if export_format == "jpg":
            driver = "JPEG"
            profile.update(quality=90)
            band_count = 3
            with_alpha = False
            rgb = True
        elif export_format == "png":
            driver = "PNG"
            band_count = 4
            rgb = True
        elif export_format == "gtiff-rgb":
            compress = "JPEG"
            profile.update(jpeg_quality=90)
            profile.update(BIGTIFF='IF_SAFER')
            band_count = 4
            rgb = True
            if jpg:
                band_count = 3
                with_alpha = False
        else:
            compress = "DEFLATE"
            profile.update(BIGTIFF='IF_SAFER')
            band_count = src.count

        if reproject:
            path_base, _ = os.path.splitext(output_raster)
            output_raster = path_base + ".base.tif"

        if compress is not None:
            profile.update(compress=compress)
            profile.update(predictor=2 if compress == "DEFLATE" else 1)

        if rgb and rescale is None:
            # Compute min max
            nodata = None
            if asset_type == 'orthophoto':
                nodata = 0
            md = ds_src.metadata(pmin=2.0, pmax=98.0, hist_options={"bins": 255}, nodata=nodata, vrt_options=vrt_options)
            rescale = [md['statistics']['1']['min'], md['statistics']['1']['max']]

        ci = src.colorinterp
        alpha_index = None
        if has_alpha_band(src):
            alpha_index = src.colorinterp.index(ColorInterp.alpha) + 1
        
        subwins = compute_subwindows(win, window_size)

        if rgb and expression is None:
            # More than 4 bands?
            if len(ci) > 4:
                # Try to find RGBA band order
                if ColorInterp.red in ci and \
                        ColorInterp.green in ci and \
                        ColorInterp.blue in ci and \
                        ColorInterp.alpha in ci:
                    indexes = (ci.index(ColorInterp.red) + 1,
                                ci.index(ColorInterp.green) + 1,
                                ci.index(ColorInterp.blue) + 1,
                                ci.index(ColorInterp.alpha) + 1)
            
            # Only 2 bands (common with thermal)?
            elif len(ci) == 2 and ColorInterp.gray in ci and ColorInterp.alpha in ci:
                indexes = (ci.index(ColorInterp.gray) + 1,) * 3 + \
                           (ci.index(ColorInterp.alpha) + 1, )

        cmap = None
        if color_map:
            try:
                cmap = colormap.get(color_map)
            except InvalidColorMapName:
                logger.warning("Invalid colormap {}".format(color_map))


        def process(arr, skip_rescale=False, skip_background=False, skip_type=False, mask=None, includes_alpha=True, drop_last_band=False):
            if not skip_rescale and rescale is not None:
                arr = linear_rescale(arr, in_range=rescale)
            if not skip_background and (mask is not None or includes_alpha):
                if mask is not None:
                    background = mask==0
                elif includes_alpha:
                    background = arr[-1]==0
                if includes_alpha:
                    arr[:-1, :, :][:, background] = jpg_background
                else:
                    arr[:, background] = jpg_background
            if not skip_type and rgb and arr.dtype != np.uint8:
                arr = arr.astype(np.uint8)
            
            if drop_last_band:
                return arr[:-1, :, :]
            else:
                return arr

        def update_rgb_colorinterp(dst):
            if with_alpha:
                dst.colorinterp = [ColorInterp.red, ColorInterp.green, ColorInterp.blue, ColorInterp.alpha]
            else:
                dst.colorinterp = [ColorInterp.red, ColorInterp.green, ColorInterp.blue]

        profile.update(driver=driver, count=band_count)
        if rgb:
            profile.update(dtype=rasterio.uint8)

        if dem and rgb and profile.get('nodata') is not None:
            profile.update(nodata=None)

        if expression is not None:
            # Apply band math
            if rgb:
                profile.update(dtype=rasterio.uint8, count=band_count)
            else:
                profile.update(dtype=rasterio.float32, count=1, nodata=-9999)

            bands_names = ["b{}".format(b) for b in tuple(sorted(set(re.findall(r"b(?P<bands>[0-9]{1,2})", expression))))]
            rgb_expr = expression.split(",")
            indexes = tuple([int(b.replace("b", "")) for b in bands_names])

            if alpha_index is not None:
                indexes += (alpha_index, )

            with rasterio.open(output_raster, 'w', **profile) as dst:
                for w, dst_w in subwins:
                    data = reader.read(indexes=indexes, window=w, out_dtype=np.float32)
                    arr = dict(zip(bands_names, data))
                    arr = np.array([np.nan_to_num(ne.evaluate(bloc.strip(), local_dict=arr)) for bloc in rgb_expr])

                    # Set nodata values
                    index_band = arr[0]
                    mask = None
                    if alpha_index is not None:
                        # -1 is the last band = alpha
                        mask = data[-1] != 0
                        index_band[~mask] = -9999

                    # Remove infinity values
                    index_band[index_band>1e+30] = -9999
                    index_band[index_band<-1e+30] = -9999

                    # Make sure this is float32
                    arr = arr.astype(np.float32)

                    # Apply colormap?
                    if rgb and cmap is not None:
                        rgb_data, _ = apply_cmap(process(arr, skip_background=True, includes_alpha=False), cmap)
                        dst.write(process(rgb_data, skip_rescale=True, mask=mask, includes_alpha=False), window=dst_w, indexes=(1,2,3))

                        if with_alpha:
                            dst.write(mask.astype(np.uint8) * 255, 4, window=dst_w)

                        update_rgb_colorinterp(dst)
                    else:
                        # Raw
                        # write_band(process(arr)[0], dst, 1)
                        dst.write(process(arr)[0], window=dst_w) 
        elif dem:
            # Apply hillshading, colormaps to elevation
            with rasterio.open(output_raster, 'w', **profile) as dst:
                arr = reader.read(window=win)

                intensity = None
                if hillshade is not None and hillshade > 0:
                    delta_scale = ZOOM_EXTRA_LEVELS ** 2
                    dx = src.meta["transform"][0] * delta_scale
                    dy = src.meta["transform"][4] * delta_scale
                    ls = LightSource(azdeg=315, altdeg=45)
                    intensity = ls.hillshade(arr[0], dx=dx, dy=dy, vert_exag=hillshade)
                    intensity = intensity * 255.0

                # Apply colormap?
                if rgb and cmap is not None:
                    rgb_data, _ = apply_cmap(process(arr, skip_background=True), cmap)
                    arr = None

                    if intensity is not None:
                        rgb_data = hsv_blend(rgb_data, intensity)
                        
                    band_num = 1
                    for b in rgb_data:
                        write_band(process(b, skip_rescale=True), dst, band_num)
                        band_num += 1
                    
                    if with_alpha:
                        write_band(mask, dst, band_num)

                    update_rgb_colorinterp(dst)
                else:
                    # Raw
                    write_band(process(arr)[0], dst, 1)
        else:
            # Copy bands as-is
            with rasterio.open(output_raster, 'w', **profile) as dst:
                for w, dst_w in subwins:
                    arr = reader.read(indexes=indexes, window=w)
                    dst.write(process(arr, drop_last_band=not with_alpha), window=dst_w)

                new_ci = [src.colorinterp[idx - 1] for idx in indexes]
                if not with_alpha:
                    new_ci = [ci for ci in new_ci if ci != ColorInterp.alpha]
                    
                dst.colorinterp = new_ci
        
        # Close warped vrt
        if vrt_options is not None:
            reader.close()

        if kmz:
            subprocess.check_output(["gdal_translate", "-of", "KMLSUPEROVERLAY", 
                                        "-co", "Name={}".format(name),
                                        "-co", "FORMAT=AUTO", output_raster, output])
        elif reproject:
            # TODO: we could use A VRT for better compression
            # https://gdal.org/en/stable/programs/gdalwarp.html#compressed-output
            subprocess.check_output(["gdalwarp", "-r", "near", 
                                    "-multi",
                                    "-wo", "NUM_THREADS=4",
                                    "-t_srs", f"EPSG:{epsg}",
                                    "--config", "GDAL_CACHEMAX", "25%",
                                    output_raster, output])

        logger.info(f"Finished in {time.time() - now}s")
        
