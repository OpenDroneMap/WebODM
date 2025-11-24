import rasterio.warp
import numpy as np
from rasterio.crs import CRS
from rasterio.warp import transform_bounds
from osgeo import osr, gdal
from functools import lru_cache
osr.DontUseExceptions()

SUPPORTED_UNITS = ["m", "ft", "US survey foot"]
UNIT_TO_M = {
    "m": 1.0,
    "ft": 0.3048,
    "US survey foot": 1200.0 / 3937.0,
}

# GEOS has some weird bug where
# we can't simply call geom.tranform(srid)
# so we write our own

def geom_transform_wkt_bbox(geom, dataset, bbox_crs="geographic", wkt_crs="raster"):
    """
    :param geom GEOSGeometry
    :param dataset rasterio dataset | path to raster
    :param bbox_crs CRS of bbox (geographic --> lat/lon | projected --> north/east | raster --> pixels)
    :param wkt_crs CRS of WKT (raster --> pixels | projected --> north/east)
    :return (WKT, bbox)
    """
    if not geom.srid:
        raise ValueError("Geometry must have an SRID")
    
    close_ds = False
    if isinstance(dataset, str):
        dataset = rasterio.open(dataset, 'r')
        close_ds = True
    
    try:
        if not dataset.crs:
            raise ValueError("Dataset must have a CRS")

        coords = geom.tuple
        if len(coords) == 1:
            xs, ys = zip(*coords[0])
            tx, ty = rasterio.warp.transform(CRS.from_epsg(geom.srid), dataset.crs, xs, ys)
            raster_coords = [dataset.index(x, y, op=np.round) for x, y in zip(tx, ty)]

            if bbox_crs == 'geographic':
                minx = min(xs)
                maxx = max(xs)
                miny = min(ys)
                maxy = max(ys)
            elif bbox_crs == 'projected':
                minx = min(tx)
                maxx = max(tx)
                miny = min(ty)
                maxy = max(ty)
            elif bbox_crs == 'raster':
                coords = np.array(raster_coords)
                px = coords[:, 1]
                py = coords[:, 0]
                minx = px.min()
                maxx = px.max()
                miny = py.min()
                maxy = py.max()
            else:
                raise ValueError("Invalid bbox_crs")

            if wkt_crs == "raster":
                out = ", ".join(f"{x} {y}" for y, x in raster_coords)
            elif wkt_crs == "projected":
                out = ", ".join(f"{x} {y}" for x, y in zip(tx, ty))
            else:
                raise ValueError("Invalid wkt_crs")
            
            wkt = f"POLYGON (({out}))"
            return wkt, (minx, miny, maxx, maxy)
        else:
            raise ValueError("Cannot transform complex geometries to WKT")
    finally:
        if close_ds:
            dataset.close()

def geom_transform(geom, epsg):
    if not geom.srid:
        raise ValueError("Geometry must have an SRID")
    
    coords = geom.tuple
    if len(coords) == 1:
        xs, ys = zip(*coords[0])
        tx, ty = rasterio.warp.transform(CRS.from_epsg(geom.srid), CRS.from_epsg(epsg), xs, ys)
        return list(zip(tx, ty))
    else:
        raise ValueError("Cannot transform complex geometries to WKT")


def epsg_from_wkt(wkt):
    srs = osr.SpatialReference()
    if srs.ImportFromWkt(wkt) != 0:
        return None
    
    epsg = srs.GetAuthorityCode(None)
    if epsg is not None:
        return None

    # Try to get the 2D component
    if srs.IsCompound():
        if srs.DemoteTo2D() != 0:
            return None

    epsg = srs.GetAuthorityCode(None)
    if epsg is not None:
        return epsg


def get_raster_bounds_wkt(raster_path, target_srs="EPSG:4326"):
    with rasterio.open(raster_path) as src:
        if src.crs is None:
            return None

        left, bottom, right, top = src.bounds
        w, s, e, n = transform_bounds(
            src.crs, 
            target_srs, 
            left, bottom, right, top
        )

        wkt = f"POLYGON(({w} {s}, {w} {n}, {e} {n}, {e} {s}, {w} {s}))"
        return wkt

@lru_cache(maxsize=1000)
def get_srs_name_units_from_epsg(epsg):
    if epsg is None:
        return {'name': '', 'units': 'm'}
    
    srs = osr.SpatialReference()
    if srs.ImportFromEPSG(epsg) != 0:
        return {'name': '', 'units': 'm'}

    name = srs.GetAttrValue("PROJCS")
    if name is None:
        name = srs.GetAttrValue("GEOGCS")
    
    if name is None:
        return {'name': '', 'units': 'm'}
    
    units = srs.GetAttrValue('UNIT')
    if units is None:
        units = 'm'  # Default to meters
    elif units not in SUPPORTED_UNITS:
        units = 'm' # Unsupported

    return {'name': name, 'units': units}

def get_rasterio_to_meters_factor(rasterio_ds):
    if isinstance(rasterio_ds, str):
        with rasterio.open(rasterio_ds, 'r') as ds:
            return get_rasterio_to_meters_factor(ds)

    units = rasterio_ds.units
    if len(units) >= 1:
        unit = units[0]
        if unit is not None and unit != "" and unit in SUPPORTED_UNITS:
            return UNIT_TO_M.get(unit, 1.0)
    return 1.0


def get_raster_dem_to_meters_factor(raster_path):
    unit = get_raster_dem_units(raster_path)
    return UNIT_TO_M.get(unit, 1.0)

def get_raster_dem_units(raster_path):
    try:
        ds = gdal.Open(raster_path, gdal.GA_ReadOnly)
        if ds is None:
            raise IOError(f"Cannot open {raster_path}")
        
        band = ds.GetRasterBand(1)
        unit = band.GetUnitType()
        ds = None

        if unit is None or unit == "":
            return "m"
        elif unit in SUPPORTED_UNITS:
            return unit
        else:
            return "m"
    except Exception as e:
        return "m"
