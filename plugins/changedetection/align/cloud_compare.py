import subprocess, shlex, os, glob

def run_icp(reference_pcl_path, pcl_to_modify_path, output_path):
    command = __icp_command(reference_pcl_path, pcl_to_modify_path, output_path)
    __execute(command)
    for txt in glob.glob(os.path.dirname(pcl_to_modify_path) + '/*.txt'):
        os.remove(txt)

def __execute(command):
    # subprocess.call(shlex.split(command), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.call(shlex.split(command))

def __icp_command(reference_pcl_path, pcl_to_modify_path, output_path):
    return """CloudCompare \
            -SILENT \
            -AUTO_SAVE OFF \
            -C_EXPORT_FMT LAS \
            -O {moving} \
            -O {reference} \
            -ICP \
            -SAVE_CLOUDS FILE '{output_path}'""".format(
                reference=reference_pcl_path,
                moving=pcl_to_modify_path,
                output_path=output_path)
