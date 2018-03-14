from osgeo import ogr
import gdal
import struct
import json 

def convertJson(jsdata):
  return json.dumps(jsdata)

def rings(raster, geojson):
  
  src=gdal.Open(raster)
  gtx=src.GetGeoTransform() 
  rbu=src.GetRasterBand(1)
  gdal.UseExceptions()

  geo=convertJson(geojson)

  geojsom= ogr.Open(geo)

  layer1 = geojsom.GetLayer(0)
  
  vertices = []

  for feat in layer1:
    geom = feat.GetGeometryRef()
    ring = geom.GetGeometryRef(0)
    points = ring.GetPointCount()

  for p in range(points):
    lon, lat, z = ring.GetPoint(p)
    px = int((lon - gtx[0]) / gtx[1]) #x pixel
    py = int((lat - gtx[3]) / gtx[5]) #y pixel
    try:
        structval=rbu.ReadRaster(px,py,1,1,buf_type=gdal.GDT_Float32) #Assumes 32 bit int- 'float'
        intval = struct.unpack('f' , structval) #assume float
        val=intval[0]
        vertices.append((px, py, val))
    except:
        val=-9999 #or some value to indicate a fail
  return vertices
