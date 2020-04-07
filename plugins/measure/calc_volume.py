#%module
#% description: Calculate volume of area and prints the volume to stdout
#%end
#%option
#% key: area_file
#% type: string
#% required: yes
#% multiple: no
#% description: Geospatial file containing the area to measure
#%end
#%option
#% key: points_file
#% type: string
#% required: yes
#% multiple: no
#% description: Geospatial file containing the points defining the area
#%end
#%option
#% key: dsm_file
#% type: string
#% required: yes
#% multiple: no
#% description: GeoTIFF DEM containing the surface
#%end

import sys
from grass.pygrass.modules import Module
import grass.script as grass

def main():
    # Import raster and vector
    Module("v.import", input=opts['area_file'], output="polygon_area", overwrite=True)
    Module("v.import", input=opts['points_file'], output="polygon_points", overwrite=True)
    Module("v.buffer", input="polygon_area", s=True, type="area", output="region", distance=1, minordistance=1, overwrite=True)
    Module("r.external", input=opts['dsm_file'], output="dsm", overwrite=True)

    # Set Grass region and resolution to DSM
    Module("g.region", raster="dsm") 
    
    # Set Grass region to vector bbox
    Module("g.region", vector="region")

    # Create a mask to speed up computation
    Module("r.mask", vector="region")

    # Transfer dsm raster data to vector
    Module("v.what.rast", map="polygon_points", raster="dsm", column="height")

    # Decimate DSM and generate interpolation of new terrain
    Module("v.surf.rst", input="polygon_points", zcolumn="height", elevation="dsm_below_pile", overwrite=True)

    # Compute difference between dsm and new dsm
    Module("r.mapcalc", expression='pile_height_above_dsm=dsm-dsm_below_pile', overwrite=True)

    # Set region to polygon area to calculate volume
    Module("g.region", vector="polygon_area")

    # Volume output from difference
    Module("r.volume", input="pile_height_above_dsm", f=True)

    return 0

if __name__ == "__main__":
    opts, _ = grass.parser()
    sys.exit(main())
