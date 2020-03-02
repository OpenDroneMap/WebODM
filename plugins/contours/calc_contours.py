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
from grass.pygrass.modules import Module
import grass.script as grass

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
    Module("r.generalize", input="contours", output="contours_smooth", method="douglas", threshold=opts["simplify"], overwrite=True)
    Module("r.generalize", input="contours_smooth", output="contours_simplified", method="chaiken", threshold=1, overwrite=True)
    Module("r.generalize", input="contours_simplified", output="contours_final", method="douglas", threshold=opts["simplify"], overwrite=True)
    Module("v.edit", input="contours_final", tool="delete", threshold="-1,0,-%s" % MIN_CONTOUR_LENGTH, query="length")
    Module("v.out.ogr", input="contours_final", output="temp.gpkg", format="GPKG")

    return 0

if __name__ == "__main__":
    opts, _ = grass.parser()
    sys.exit(main())


# TODO
# Running external commands from Python
# For information on running external commands from Python, see: http://docs.python.org/lib/module-subprocess.html

# Avoid using the older os.* functions. Section 17.1.3 lists equivalents using the Popen() interface, which is more robust (particularly on Windows).
#
# ogr2ogr -t_srs EPSG:${epsg} -overwrite -f "${format}" output.$$ext temp.gpkg > /dev/null
#
# if [ -e "output.$$ext" ]; then
#     # ESRI ShapeFile extra steps to compress into a zip archive
#     # we leverage Python's shutil in this case
#     if [ "${format}" = "ESRI Shapefile" ]; then
#         ext="zip"
#         mkdir contours/
#         mv output* contours/
#         echo "import shutil;shutil.make_archive('output', 'zip', 'contours/')" | python
#     fi
#
#     echo "$$(pwd)/output.$$ext"
# else
#     echo "error"
# fi
