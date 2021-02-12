## Task

> Example task:

```json
{
  "id": 134,
  "project": 27,
  "processing_node": 10,
  "processing_node_name": "localhost:3000",
  "images_count": 48,
  "can_rerun_from": [],
  "available_assets": [
    "all.zip",
    "orthophoto.tif",
    "orthophoto.png",
    "georeferenced_model.las",
    "georeferenced_model.ply",
    "georeferenced_model.csv",
    "textured_model.zip"
  ],
  "uuid": "4338d684-91b4-49a2-b907-8ba171894393",
  "name": "Task Name",
  "processing_time": 2197417,
  "auto_processing_node": false,
  "status": 40,
  "last_error": null,
  "options": [
    {
      "name": "use-opensfm-pointcloud",
      "value": true
    }
  ],
  "created_at": "2017-02-18T18:01:55.402551Z",
  "pending_action": null,
  "upload_progress": 1.0,
  "resize_progress": 0.0,
  "running_progress": 1.0
}
```

A [Task](#task) is the basic processing unit of WebODM. To compute an orthophoto, point cloud and textured model from a set of images, you need to create a [Task](#task).

Field | Type | Description
----- | ---- | -----------
id | int | Unique identifier
project | int | [Project](#project) ID the task belongs to
processing_node | int | The ID of the [Processing Node](#processing-node) this task has been assigned to, or `null` if no [Processing Node](#processing-node) has been assigned.
processing_node_name | string | The name of the processing node below, or `null` if no [Processing Node](#processing-node) has been assigned.
images_count | int | Number of images
can_rerun_from | string[] | List of possible "rerun-from" options that this task could restart from, given its currently assigned processing node. If this is an empty list, the task can only be restarted from the start of the pipeline.
available_assets | string[] | List of [assets](#download-assets) available for download 
uuid | string | Unique identifier assigned by a [Processing Node](#processing-node) once processing has started.
name | string | User defined name for the task
processing_time | int | Milliseconds that have elapsed since the start of processing, or `-1` if no information is available. Useful for displaying a time status report to the user.
auto_processing_node | boolean | Whether WebODM should automatically assign the next available [Processing Node](#processing-node) to process this [Task](#task). A user can set this to `false` to manually choose a [Processing Node](#processing-node).
status | int | One of [Status Codes](#status-codes), or `null` if no status is available.
last_error | string | The last error message reported by a [Processing Node](#processing-node) in case of processing failure.
options | JSON[] | JSON-encoded list of name/value pairs, where each pair represents a command line option to be passed to a [Processing Node](#processing-node).
created_at | string | Creation date and time.
pending_action | int | One of [Pending Actions](#pending-actions), or `null` if no pending action is set.
upload_progress | float | Value between 0 and 1 indicating the upload progress of this task's files to the processing node.
resize_progress | float | Value between 0 and 1 indicating the resize progress of this task's images.
running_progress | float | Value between 0 and 1 indicating the running progress (estimated) of this task.


<aside class="notice">Tasks inherit the permission settings from the <a href="#project">Project</a> they belong to.</aside>

### Create a task

`POST /api/projects/{project_id}/tasks/`

Parameter | Required | Default | Description
--------- | -------- | ------- | -----------
images[] | * | "" | List of multipart-encoded images (2 minimum)
processing_node | | null | The ID of the [Processing Node](#processing-node) this [Task](#task) should be assigned to. If not specified, and auto_processing_node is `true`, a [Processing Node](#processing-node) will be automatically assigned. 
name | | "" | User defined name for the task
auto_processing_node | | true | Whether WebODM should automatically assign the next available [Processing Node](#processing-node) to process this [Task](#task).
options | | "[]" | JSON-encoded list of name/value pairs, where each pair represents a command line option to be passed to a [Processing Node](#processing-node).

You assign a [Task](#task) to a [Project](#project) by passing the proper `project_id` path in the URL.


### Update a task

`PATCH /api/projects/{project_id}/tasks/{task_id}/`

Parameters are the same as above.

### Import Task

`POST /api/projects/{project_id}/tasks/import`

Import task that have been processed by another WebODM instance (or via [webodm.net](https://webodm.net) or NodeODM)

Parameter | Required | Default          | Description
--------- | -------- | -------          | ----------
name      |          | Imported Task    | User defined name for the task.
filename  | */       | ""               | File with assets. Must be a zip.
url       | /*       | ""               | URL to zipped zipped assets.

You have to provide either `filename` or `url` parameter (but not both) in order to import created assets.
 
Remember to set proper Content-type for the request depending on how the assets are uploaded:

Parameter | Content-Type
--------- | ---
filename  | application/zip
url       | application/x-www-form-urlencoded

### Get list of tasks

> Task list:

```json
[
    {
        "id": 6,
        "project": 2,
        "processing_node": 2,
        "processing_node_name": "localhost:3000",
        "images_count": 89,
        "uuid": "2e8b687d-c269-4e2f-91b3-5a2cd51b5321",
        "name": "Test name",
        "processing_time": 8402184,
        "auto_processing_node": true,
        "status": 40,
        "last_error": null,
        "options": [],
        "created_at": "2016-12-08T13:32:28.139474Z",
        "pending_action": null,
        "upload_progress": 1.0,
        "resize_progress": 0.0,
        "running_progress": 1.0
    }
]
```

`GET /api/projects/{project_id}/tasks/`

Retrieves all [Task](#task) items associated with `project_id`.

### Download assets

`GET /api/projects/{project_id}/tasks/{task_id}/download/{asset}`

After a task has been successfully processed, the user can download several assets from this URL. Not all assets are always available. For example if GPS information is missing from the input images, the `orthophoto.tif` asset will be missing. You can check the `available_assets` property of a [Task](#task) to see which assets are available for download.

Asset | Description
----- | -----------
all.zip   | Archive (.zip) containing all assets, including an orthophoto, TMS tiles, a textured 3D model and point cloud in various formats.
orthophoto.tif | GeoTIFF orthophoto.
orthophoto.png | PNG orthophoto.
orthophoto.mbtiles | Orthophoto MBTiles archive.
textured_model.zip | Archive containing the textured 3D model
georeferenced_model.las | Point cloud in .LAS format.
georeferenced_model.ply | Point cloud in .PLY format.
georeferenced_model.csv | Point cloud in .CSV format.

### Download assets (raw path)

`GET /api/projects/{project_id}/tasks/{task_id}/assets/{path}`

After a task has been successfully processed, its assets are stored in a directory on the file system. This API call allows direct access to the files in that directory (by default: `WebODM/app/media/project/{project_id}/task/{task_id}/assets`). This can be useful to those applications that want to stream a `Potree` dataset, or render a textured 3D model on the fly. 

<aside class="notice">
These paths could change in future versions of WebODM. If the asset you need can be reached via <b>/api/projects/{project_id}/tasks/download/{asset}</b>, use that instead.
</aside>

### Retrieve console output

> Console output example:

```bash
curl -H "Authorization: JWT <your_token>" http://localhost:8000/api/projects/2/tasks/1/output/?line=5

[DEBUG]   /var/www/data/e453747f-5fd4-4654-9622-b02727b29fc5/images\n[DEBUG]   Loaded DJI_0219.JPG | camera: dji fc300s ...
```


`GET /api/projects/{project_id}/tasks/{task_id}/output/`

As a [Task](#task) is being processed, processing nodes will return an output string that can be used for debugging and informative purposes. Output is only available after processing has started.

Parameter | Required | Default | Description
--------- | -------- | ------- | -----------
line | | 0 | Only display the output starting from a certain line number. This can be useful to display output in realtime to the user by keeping track of the number of lines that have been displayed to the user so far and thus avoiding to download all output at every request.

### Cancel task

`POST /api/projects/{project_id}/tasks/{task_id}/cancel/`

Stop processing a [Task](#task). Canceled tasks can be restarted.

### Remove task

`POST /api/projects/{project_id}/tasks/{task_id}/remove/`

All assets associated with it will be destroyed also. If the [Task](#task) is currently being processed, processing will stop.

### Restart task

`POST /api/projects/{project_id}/tasks/{task_id}/restart/`

If a [Task](#task) has been canceled or has failed processing, or has completed but the user decided to change processing options, it can be restarted. If the [Processing Node](#processing-node) assigned to the [Task](#task) has not changed, processing will happen more quickly compared to creating a new [Task](#task), since the [Processing Node](#processing-node) remembers the `uuid` of the [Task](#task) and will attempt to reuse previous results from the computation pipeline.

### Orthophoto TMS layer

`GET /api/projects/{project_id}/tasks/{task_id}/orthophoto/tiles.json`

`GET /api/projects/{project_id}/tasks/{task_id}/orthophoto/tiles/{Z}/{X}/{Y}.png`

After a task has been successfully processed, a TMS layer is made available for inclusion in programs such as [Leaflet](http://leafletjs.com/) or [Cesium](http://cesiumjs.org).

<aside class="notice">If you use <a href="http://leafletjs.com/" target="_blank">Leaflet</a>, you'll need to pass the authentication token via querystring: /api/projects/{project_id}/tasks/{task_id}/tiles/{Z}/{X}/{Y}.png?jwt=your_token</aside>

### Surface Model TMS layer

`GET /api/projects/{project_id}/tasks/{task_id}/dsm/tiles.json`

`GET /api/projects/{project_id}/tasks/{task_id}/dsm/tiles/{Z}/{X}/{Y}.png`

### Terrain Model TMS layer

`GET /api/projects/{project_id}/tasks/{task_id}/dtm/tiles.json`

`GET /api/projects/{project_id}/tasks/{task_id}/dtm/tiles/{Z}/{X}/{Y}.png`

### Pending Actions

In some circumstances, a [Task](#task) can have a pending action that requires some amount of time to be performed.

Pending Action | Code | Description
----- | ---- | -----------
CANCEL | 1 | [Task](#task) is being canceled
REMOVE | 2 | [Task](#task) is being removed
RESTART | 3 | [Task](#task) is being restarted

### Status Codes

Status | Code | Description
----- | ---- | -----------
QUEUED | 10 | [Task](#task)'s files have been uploaded to a [Processing Node](#processing-node) and are waiting to be processed.
RUNNING | 20 | [Task](#task) is currently being processed.
FAILED | 30 | [Task](#task) has failed for some reason (not enough images, out of memory, Piero forgot to close a parenthesis, etc.)
COMPLETED | 40 | [Task](#task) has completed. Assets are be ready to be downloaded.
CANCELED | 50 | [Task](#task) was manually canceled by the user.
