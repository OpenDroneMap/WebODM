#%module
#% description: Calculate contours
#%end
#%option
#% key: dem_file
#% type: string
#% required: yes
#% multiple: no
#% description: GeoTIFF DEM containing the surface to calculate contours
#%end
#%option
#% key: interval
#% type: double
#% required: yes
#% multiple: no
#% description: Contours interval
#%end
#%option
#% key: format
#% type: string
#% required: yes
#% multiple: no
#% description: OGR output format
#%end
#%option
#% key: simplify
#% type: double
#% required: yes
#% multiple: no
#% description: OGR output format
#%end
#%option
#% key: epsg
#% type: string
#% required: yes
#% multiple: no
#% description: target EPSG code
#%end

# output: If successful, prints the full path to the contours file. Otherwise it prints "error"

import sys
import glob
import os
import shutil
from grass.pygrass.modules import Module
import grass.script as grass
import subprocess

def main():
    ext = ""
    if opts['format'] == "GeoJSON":
        ext = "json"
    elif opts['format'] == "GPKG":
        ext = "gpkg"
    elif opts['format'] == "DXF":
        ext = "dxf"
    elif opts['format'] == "ESRI Shapefile":
        ext = "shp"

    MIN_CONTOUR_LENGTH = 5
    Module("r.external", input=opts['dem_file'], output="dem", overwrite=True)
    Module("g.region", raster="dem")
    Module("r.contour", input="dem", output="contours", step=opts["interval"], overwrite=True)
    Module("v.generalize", input="contours", output="contours_smooth", method="douglas", threshold=opts["simplify"], overwrite=True)
    Module("v.generalize", input="contours_smooth", output="contours_simplified", method="chaiken", threshold=1, overwrite=True)
    Module("v.generalize", input="contours_simplified", output="contours_final", method="douglas", threshold=opts["simplify"], overwrite=True)
    Module("v.edit", map="contours_final", tool="delete", threshold=[-1,0,-MIN_CONTOUR_LENGTH], query="length")
    Module("v.out.ogr", input="contours_final", output="temp.gpkg", format="GPKG")

    subprocess.check_call(["ogr2ogr", "-t_srs", "EPSG:%s" % opts['epsg'],
                     '-overwrite', '-f', opts["format"], "output.%s" % ext, "temp.gpkg"], stdout=subprocess.DEVNULL)

    if os.path.isfile("output.%s" % ext):
        if opts["format"] == "ESRI Shapefile":
            ext="zip"
            os.makedirs("contours")
            contour_files = glob.glob("output.*")
            for cf in contour_files:
                shutil.move(cf, os.path.join("contours", os.path.basename(cf)))

            shutil.make_archive('output', 'zip', 'contours/')

        print(os.path.join(os.getcwd(), "output.%s" % ext))
    else:
        print("error")

    return 0

if __name__ == "__main__":
    opts, _ = grass.parser()
    sys.exit(main())

