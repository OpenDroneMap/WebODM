#%module
#% description: This script detectes changes by comparing two different sets of DEMs.
#%end
#%option
#% key: reference_pc
#% type: string
#% required: yes
#% multiple: no
#% description: The path for the reference point cloud file
#%end
#%option
#% key: reference_dsm
#% type: string
#% required: yes
#% multiple: no
#% description: The path for the reference dsm file
#%end
#%option
#% key: reference_dtm
#% type: string
#% required: yes
#% multiple: no
#% description: The path for the reference dtm file
#%end
#%option
#% key: compare_pc
#% type: string
#% required: yes
#% multiple: no
#% description: The path for the compare point cloud file
#%end
#%option
#% key: compare_dsm
#% type: string
#% required: yes
#% multiple: no
#% description: The path for the compare dsm file
#%end
#%option
#% key: compare_dtm
#% type: string
#% required: yes
#% multiple: no
#% description: The path for the compare dtm file
#%end
#%option
#% key: aligned_compare_dsm
#% type: string
#% required: yes
#% multiple: no
#% description: The path for the compare dtm file that should be aligned to the reference cloud
#%end
#%option
#% key: aligned_compare_dtm
#% type: string
#% required: yes
#% multiple: no
#% description: The path for the compare dtm file that should be aligned to the reference cloud
#%end
#%option
#% key: format
#% type: string
#% required: yes
#% multiple: no
#% description: OGR output format
#%end
#%option
#% key: epsg
#% type: string
#% required: yes
#% multiple: no
#% description: The epsg code that will be used for output
#%end
#%option
#% key: display_type
#% type: string
#% required: yes
#% multiple: no
#% description: Whether to display a heatmap or contours
#%end
#%option
#% key: resolution
#% type: double
#% required: yes
#% multiple: no
#% description: Target resolution in meters
#%end
#%option
#% key: min_height
#% type: double
#% required: yes
#% multiple: no
#% description: Min height in meters for a difference to be considered change
#%end
#%option
#% key: min_area
#% type: double
#% required: yes
#% multiple: no
#% description: Min area in meters for a difference to be considered change
#%end
#%option
#% key: can_align_and_rasterize
#% type: string
#% required: yes
#% multiple: no
#% description: Whether the comparison should be done after aligning the reference and compare clouds
#%end

from os import path, makedirs, getcwd
from compare import compare
import sys
import subprocess
import grass.script as grass

def main():
    # Read params
    reference_pc = opts['reference_pc']
    compare_pc = opts['compare_pc']
    reference_dsm = opts['reference_dsm']
    reference_dtm = opts['reference_dtm']
    compare_dsm = opts['compare_dsm']
    compare_dtm = opts['compare_dtm']
    aligned_compare_dsm = opts['aligned_compare_dsm']
    aligned_compare_dtm = opts['aligned_compare_dtm']
    epsg = opts['epsg']
    resolution = float(opts['resolution'])
    min_height = float(opts['min_height'])
    min_area = float(opts['min_area'])
    display_type = opts['display_type']
    format = opts['format']
    can_align_and_rasterize = opts['can_align_and_rasterize'] == 'true'

    if can_align_and_rasterize:
        handle_if_should_align_align_and_rasterize(reference_pc, compare_pc, reference_dsm, reference_dtm, aligned_compare_dsm, aligned_compare_dtm)
        result_dump = compare(reference_dsm, reference_dtm, aligned_compare_dsm, aligned_compare_dtm, epsg, resolution, display_type, min_height, min_area)
    else:
        handle_if_shouldnt_align_and_rasterize(reference_dsm, reference_dtm, compare_dsm, compare_dtm)
        result_dump = compare(reference_dsm, reference_dtm, compare_dsm, compare_dtm, epsg, resolution, display_type, min_height, min_area)

    # Write the geojson as the expected format file
    write_to_file(result_dump, format)


def handle_if_shouldnt_align_and_rasterize(reference_dsm, reference_dtm, compare_dsm, compare_dtm):
    if not path.exists(reference_dsm) or not path.exists(reference_dtm) or not path.exists(compare_dsm) or not path.exists(compare_dtm):
        raise Exception('Failed to find all four required DEMs to detect changes.')


def handle_if_should_align_align_and_rasterize(reference_pc, compare_pc, reference_dsm, reference_dtm, aligned_compare_dsm, aligned_compare_dtm):
    from align.align_and_rasterize import align, rasterize

    if not path.exists(reference_pc) or not path.exists(compare_pc):
        raise Exception('Failed to find both the reference and compare point clouds')

    # Create reference DSM if it does not exist
    if not path.exists(reference_dsm):
        make_dirs_if_necessary(reference_dsm)
        rasterize(reference_pc, 'dsm', reference_dsm)

    # Create reference DTM if it does not exist
    if not path.exists(reference_dtm):
        make_dirs_if_necessary(reference_dtm)
        rasterize(reference_pc, 'dtm', reference_dtm)

    if not path.exists(aligned_compare_dsm) or not path.exists(aligned_compare_dtm):
        aligned_compare_pc = 'aligned.laz'

        # Run ICP and align the compare point cloud
        align(reference_pc, compare_pc, aligned_compare_pc)

        # Create compare DSM if it does not exist
        if not path.exists(aligned_compare_dsm):
            make_dirs_if_necessary(aligned_compare_dsm)
            rasterize(aligned_compare_pc, 'dsm', aligned_compare_dsm)

        # Create compare DTM if it does not exist
        if not path.exists(aligned_compare_dtm):
            make_dirs_if_necessary(aligned_compare_dtm)
            rasterize(aligned_compare_pc, 'dtm', aligned_compare_dtm)


def make_dirs_if_necessary(file_path):
    dirname = path.dirname(file_path)
    makedirs(dirname, exist_ok = True)


def write_to_file(result_dump, format):
    ext = ""
    if format == "GeoJSON":
        ext = "json"
    elif format == "GPKG":
        ext = "gpkg"
    elif format == "DXF":
        ext = "dxf"
    elif format == "ESRI Shapefile":
        ext = "shp"

    with open("output.json", 'w+') as output:
        output.write(result_dump)

    if ext != "json":
        subprocess.check_call(["ogr2ogr", "-f", format, "output.%s" % ext, "output.json"], stdout=subprocess.DEVNULL)

    if path.isfile("output.%s" % ext):
        if format == "ESRI Shapefile":
            ext="zip"
            makedirs("changes")
            contour_files = glob.glob("output.*")
            for cf in contour_files:
                shutil.move(cf, path.join("changes", path.basename(cf)))

            shutil.make_archive('output', 'zip', 'changes/')

        print(path.join(getcwd(), "output.%s" % ext))
    else:
        print("error")

if __name__ == "__main__":
    opts, _ = grass.parser()
    try:
        sys.exit(main())
    except Exception as e:
        print(e)
