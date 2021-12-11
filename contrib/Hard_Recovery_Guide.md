### Hard Recovery Guide

If you still have the source files in the media dir folder, 
but you forgot to make a backup according to the instructions in the main readme - you can perform a hard recovery process.

##### DISCLAIMER 1) ALL OPERATIONS AND HARM FROM THIS SCRIPT - YOUR OWN RESPONSIBILITY!
##### DISCLAIMER 2) USE THIS SCRIPT ONLY IF THERE AREN`T ANOTHER WAY!

### Preparation steps
You need to have a setup WebODM admin account before starting recovery.
If you already create admin account - skip this step.

## Step 0. Enter the `manage.py` shell of webODM for HARD RECOVERY
From inside the webodm_webapp container:
List the container of WebODM with usage of `docker ps` command, or using Docker Desktop.
Connect into the webodm container using:
```
docker exec -ti webodm_webapp bash
python manage.py shell
```


## Step 1. Copy and paste imports and functions to py shell

```python
# START COPY FIRST PART
from django.contrib.auth.models import User
from app.models import Project, Task, ImageUpload
import os
from django.contrib.gis.gdal import GDALRaster
from django.contrib.gis.gdal import OGRGeometry
from django.contrib.gis.geos import GEOSGeometry
from django.db import connection
from django.utils.translation import gettext_lazy as _, gettext
from nodeodm import status_codes
from app.cogeo import assure_cogeo
import json

def process_task(creating_task):
    images_json = creating_task.assets_path("images.json")
    if os.path.exists(images_json):
        try:
            with open(images_json) as f:
                images = json.load(f)
                creating_task.images_count = len(images)
        except:
            print("Cannot read images count from imported task {}".format(creating_task))
            pass
    extent_fields = [
        (os.path.realpath(creating_task.assets_path("odm_orthophoto", "odm_orthophoto.tif")),
         'orthophoto_extent'),
        (os.path.realpath(creating_task.assets_path("odm_dem", "dsm.tif")),
         'dsm_extent'),
        (os.path.realpath(creating_task.assets_path("odm_dem", "dtm.tif")),
         'dtm_extent'),
    ]
    for raster_path, field in extent_fields:
        if os.path.exists(raster_path):
            # Make sure this is a Cloud Optimized GeoTIFF
            # if not, it will be created
            try:
                assure_cogeo(raster_path)
            except IOError as e:
                print(
                    "Cannot create Cloud Optimized GeoTIFF for %s (%s). This will result in degraded visualization performance." % (
                    raster_path, str(e)))
            # Read extent and SRID
            raster = GDALRaster(raster_path)
            extent = OGRGeometry.from_bbox(raster.extent)
            # Make sure PostGIS supports it
            with connection.cursor() as cursor:
                cursor.execute("SELECT SRID FROM spatial_ref_sys WHERE SRID = %s", [raster.srid])
                if cursor.rowcount == 0:
                    raise Exception()
            # It will be implicitly transformed into the SRID of the model’s field
            # task.field = GEOSGeometry(...)
            setattr(creating_task, field, GEOSGeometry(extent.wkt, srid=raster.srid))
            print("Populated extent field with {} for {}".format(raster_path, creating_task))
            creating_task.update_available_assets_field()
            creating_task.potree_scene = {}
            creating_task.running_progress = 1.0
            creating_task.console_output += gettext("Done!") + "\n"
            creating_task.status = status_codes.COMPLETED
            creating_task.save()

def create_project(project_id, user):
    project = Project()
    project.name = project_id
    project.owner = user
    project.id = int(project_id)
    return project
def reindex_shots(projectID, taskID):
    project_and_task_path = f'project/{projectID}/task/{taskID}'
    try:
        with open(f"/webodm/app/media/{project_and_task_path}/assets/images.json", 'r') as file:
            camera_shots = json.load(file)
            for image_shot in camera_shots:
                ImageUpload.objects.update_or_create(task=Task.objects.get(pk=taskID),
                                                 image=f"{project_and_task_path}/{image_shot['filename']}")
                print(f"Succesfully indexed file {image_shot['filename']}")
    except Exception as e:
        print(e)

# END COPY FIRST PART
```
## Step 2. Specify the username of admin which will have acess to the imported projects
```python
# START COPY SECOND PART
user = User.objects.get(username="YOUR NEW CREATED ADMIN USERNAME HERE")
# END COPY COPY SECOND PART
```

## Step 3. This is the main part of script which make the main magic of the project. It will read media dir and create tasks and projects from the sources, also it will reindex photo sources, if avaliable
```python
# START COPY THIRD PART
for project_id in os.listdir("/webodm/app/media/project"):
    if not Project.objects.filter(id=int(project_id)).exists():
        project = create_project(project_id, user)
        project.save()
    else:
        project = Project.objects.get(pk=(project_id))
    for task_id in os.listdir(f"/webodm/app/media/project/{project_id}/task"):
        if not Task.objects.filter(id=task_id).exists():
            task = Task(project=project)
            task.id = task_id
            process_task(task)
            reindex_shots(project_id, task_id)
# END COPY THIRD PART
```
## Step 4. You must update project ID sequence for new created tasks
```python
with connection.cursor() as cursor:
                cursor.execute("SELECT setval('app_project_id_seq', (SELECT MAX(id) FROM app_project)+1)")
```
If all is ok - you will get recreated structure of projects inside WebODM database, and WebODM GUI.
Congratulations - you are great!
