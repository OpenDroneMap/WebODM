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
            dst.write(arr)
