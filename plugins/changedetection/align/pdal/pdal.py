import os, tempfile
from string import Template
import subprocess

def rasterize_dtm(input_pcl, output_tif, resolution = 0.1):
    __run('dtm_rasterize', fin=input_pcl, output_tif=output_tif, resolution=resolution)

def rasterize_dsm(input_pcl, output_tif, resolution = 0.1):
    __run('dsm_rasterize', fin=input_pcl, output_tif=output_tif, resolution=resolution)

def info(input_pcl):
    command = 'pdal info -i \'{}\' --enumerate Classification'.format(input_pcl)
    output = subprocess.check_output(command, shell=True)
    return output

def __run(template_name, **kwparams):
    template = __get_template(template_name)
    pipeline_definition = template.substitute(kwparams)
    with tempfile.NamedTemporaryFile(suffix='.json', mode='w') as pipeline:
        pipeline.write(pipeline_definition)
        pipeline.flush()
        command = 'pdal pipeline \'{}\''.format(pipeline.name)
        output = subprocess.check_output(command, shell=True)


def __get_template(template_name):
    dir = os.path.dirname(os.path.realpath(__file__))
    with open(os.path.join(dir, 'pipelines', template_name + '.json')) as pipeline_template:
        return Template(pipeline_template.read())
