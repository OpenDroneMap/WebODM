# Export a raster index after applying a band expression
import rasterio
import re
import numpy as np
import numexpr as ne
from rasterio.enums import ColorInterp
from rio_tiler.utils import has_alpha_band


def export_raster_index(input, expression, output):
    with rasterio.open(input) as src:
        profile = src.profile
        profile.update(
            dtype=rasterio.float32,
            count=1,
            nodata=-9999
        )

        data = src.read().astype(np.float32)
        alpha_index = None
        if has_alpha_band(src):
            try:
                alpha_index = src.colorinterp.index(ColorInterp.alpha)
            except ValueError:
                pass

        bands_names = ["b{}".format(b) for b in tuple(set(re.findall(r"b(?P<bands>[0-9]{1,2})", expression)))]
        rgb = expression.split(",")

        arr = dict(zip(bands_names, data))
        arr = np.array([np.nan_to_num(ne.evaluate(bloc.strip(), local_dict=arr)) for bloc in rgb])

        # Set nodata values
        index_band = arr[0]
        if alpha_index is not None:
            index_band[data[alpha_index] == 0] = -9999

        # Remove infinity values
        index_band[index_band>1e+30] = -9999
        index_band[index_band<-1e+30] = -9999

        with rasterio.open(output, 'w', **profile) as dst:
            dst.write(arr)
