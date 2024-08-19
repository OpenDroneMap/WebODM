from os import path, mkdir, walk, remove as removeFile
from zipfile import ZipFile, ZIP_DEFLATED
from shutil import rmtree
from tempfile import mkdtemp


DELETE_EXTENSIONS = (".conf", ".vec", ".spt")
OBJ_FILE_EXTENSION = ".obj"
MTL_FILE_EXTENSION = ".mtl"


class IonInvalidZip(Exception):
    pass


def file_walk(directory):
    for root, _, file_names in walk(directory):
        for file_name in file_names:
            yield path.join(root, file_name)


def zip_dir(zip_name, directory, destructive=False):
    with ZipFile(zip_name, mode="w", compression=ZIP_DEFLATED) as zipfile:
        for file_path in file_walk(directory):
            relpath = path.relpath(file_path, directory)
            zipfile.write(file_path, relpath)
            if destructive:
                removeFile(file_path)


def to_ion_texture_model(texture_model_path, dest_directory=None, minimize_space=True):
    is_tmp = False
    if dest_directory is None:
        is_tmp = True
        dest_directory = mkdtemp()
    dest_file = path.join(dest_directory, path.basename(texture_model_path))
    try:
        unzip_dir = path.join(dest_directory, "_tmp")
        mkdir(unzip_dir)
        with ZipFile(texture_model_path) as zipfile:
            zipfile.extractall(unzip_dir)

        files_to_delete = set()
        found_geo = False
        for file_name in file_walk(unzip_dir):
            if file_name.endswith(DELETE_EXTENSIONS):
                files_to_delete.add(file_name)
            elif file_name.endswith(".obj"):
                if "_geo" in path.basename(file_name):
                    found_geo = True
                else:
                    file_name = path.splitext(file_name)[0]
                    files_to_delete.add(file_name + OBJ_FILE_EXTENSION)
                    files_to_delete.add(file_name + MTL_FILE_EXTENSION)

        if not found_geo:
            raise IonInvalidZip("Unable to find geo file")

        for file_name in files_to_delete:
            if not path.isfile(file_name):
                continue
            removeFile(file_name)

        zip_dir(dest_file, unzip_dir, destructive=minimize_space)
        rmtree(unzip_dir)
    except Exception as e:
        if is_tmp:
            rmtree(dest_directory)
        raise e

    return dest_file, dest_directory
