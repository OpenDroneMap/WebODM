# Export a raster index after applying a band expression
import rasterio
import re
import numpy as np
import numexpr as ne
from rasterio.enums import ColorInterp
from rio_tiler.utils import has_alpha_band
from rasterio.warp import calculate_default_transform, reproject, Resampling

def extension_for_export_format(export_format):
    extensions = {
        'gtiff': 'tif',
        'gtiff-rgb': 'tif',
        'jpg': 'jpg',
        'png': 'png'
    }
    return extensions.get(export_format, 'tif')

def export_raster(input, output, **opts):
    epsg = opts.get('epsg')
    expression = opts.get('expression')

    with rasterio.open(input) as src:
        profile = src.meta.copy()

        # Define write band function
        # Reprojection needed?
        if src.crs is not None and epsg is not None and src.crs.to_epsg() != epsg:
            dst_crs = "EPSG:{}".format(epsg)

            transform, width, height = calculate_default_transform(
                src.crs, dst_crs, src.width, src.height, *src.bounds)

            profile.update(
                crs=dst_crs,
                transform=transform,
                width=width,
                height=height
            )

            def write_band(arr, dst, i):
                return reproject(source=arr, 
                        destination=rasterio.band(dst, i),
                        src_transform=src.transform,
                        src_crs=src.crs,
                        dst_transform=transform,
                        dst_crs=dst_crs,
                        resampling=Resampling.nearest)

        else:
            # No reprojection needed
            def write_band(arr, dst, i):
                dst.write(arr, i)
        
        # TODO: output format
        profile.update(driver='GTiff')

        if expression is not None:
            # Apply band math
            profile.update(
                dtype=rasterio.float32,
                count=1,
                nodata=-9999
            )

            bands_names = ["b{}".format(b) for b in tuple(sorted(set(re.findall(r"b(?P<bands>[0-9]{1,2})", expression))))]
            rgb = expression.split(",")
            indexes = tuple([int(b.replace("b", "")) for b in bands_names])

            alpha_index = None
            if has_alpha_band(src):
                try:
                    alpha_index = src.colorinterp.index(ColorInterp.alpha) + 1
                    indexes += (alpha_index, )
                except ValueError:
                    pass

            data = src.read(indexes=indexes, out_dtype=np.float32)
            arr = dict(zip(bands_names, data))
            arr = np.array([np.nan_to_num(ne.evaluate(bloc.strip(), local_dict=arr)) for bloc in rgb])

            # Set nodata values
            index_band = arr[0]
            if alpha_index is not None:
                # -1 is the last band = alpha
                index_band[data[-1] == 0] = -9999

            # Remove infinity values
            index_band[index_band>1e+30] = -9999
            index_band[index_band<-1e+30] = -9999

            # Make sure this is float32
            arr = arr.astype(np.float32)

            with rasterio.open(output, 'w', **profile) as dst:
                write_band(arr, dst, 1)
        else:
            # Copy bands as-is
            with rasterio.open(output, 'w', **profile) as dst:
                for i in range(1, src.count + 1):
                    write_band(src.read(i), dst, i)
