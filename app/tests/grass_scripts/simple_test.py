#%module
#% description: greets the user and prints the information of a spatial file
#%end
#%option
#% key: test
#% type: string
#% required: yes
#% multiple: no
#% description: Geospatial test file
#%end

import sys
from grass.pygrass.modules import Module
import grass.script as grass

def main():
    # Import raster and vector
    Module("v.in.ogr", input=opts['test'], layer="test", output="test", overwrite=True)
    info = grass.vector_info("test")
    print("Number of points: %s" % info['points'])

if __name__ == "__main__":
    opts, _ = grass.parser()
    sys.exit(main())

