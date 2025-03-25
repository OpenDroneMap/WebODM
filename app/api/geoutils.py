import rasterio.warp
from rasterio.crs import CRS

# GEOS has some weird bug where
# we can't simply call geom.tranform(srid)
# so we write our own

def geom_transform_wkt_bbox(geom, dataset):
    """
    :param geom GEOSGeometry
    :param dataset rasterio dataset
    :return (WKT, bbox)
    """
    if not geom.srid:
        raise ValueError("Geometry must have an SRID")
    if not dataset.crs:
        raise ValueError("Dataset must have a CRS")

    coords = geom.tuple
    if len(coords) == 1:
        xs, ys = zip(*coords[0])
        minx = min(xs)
        maxx = max(xs)
        miny = min(ys)
        maxy = max(ys)

        tx, ty = rasterio.warp.transform(CRS.from_epsg(geom.srid), dataset.crs, xs, ys)
        raster_coords = [dataset.index(x, y) for x, y in zip(tx, ty)]

        out = ", ".join(f"{x} {y}" for y, x in raster_coords)
        wkt = f"POLYGON (({out}))"
        return wkt, (minx, miny, maxx, maxy)
    else:
        raise ValueError("Cannot transform complex geometries to WKT")
