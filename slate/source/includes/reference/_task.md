## Task

> Example task:

```json
{
  "id": 134,
  "project": 27,
  "processing_node": 10,
  "images_count": 48,
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
  "ground_control_points": null,
  "created_at": "2017-02-18T18:01:55.402551Z",
  "pending_action": null
}
```

A [Task](#task) is the basic processing unit of WebODM. To compute an orthophoto, point cloud and textured model from a set of images, you need to create a [Task](#task).

Field | Type | Description
----- | ---- | -----------
id | int | Unique identifier
project | int | [Project](#project) ID the task belongs to
processing_node | int | The ID of the [Processing Node](#processingnode) this task has been assigned to, or `null` if no [Processing Node](#processingnode) has been assigned.
images_count | int | Number of images
uuid | string | Unique identifier assigned by a [Processing Node](#processingnode) once processing has started.
name | string | User defined name for the task
processing_time | int | Milliseconds that have elapsed since the start of processing, or `-1` if no information is available. Useful for displaying a time status report to the user.
auto_processing_node | boolean | Whether WebODM should automatically assign the next available [Processing Node](#processingnode) to process this [Task](#task). A user can set this to `false` to manually choose a [Processing Node](#processingnode).
status | int | One of [Status Codes](#status-codes), or `null` if no status is available.
last_error | string | The last error message reported by a [Processing Node](#processingnode) in case of processing failure.
options | JSON[] | JSON-encoded list of name/value pairs, where each pair represents a command line option to be passed to a [Processing Node](#processingnode).
ground_control_points | string | Currently unused. See [#37](https://github.com/OpenDroneMap/WebODM/issues/37)
created_at | string | Creation date and time
pending_action | int | One of [Pending Actions](#pending-actions), or `null` if no pending action is set.

<aside class="notice">Tasks inherit the permission settings from the <a href="#project">Project</a> they belong to.</aside>

### Create a task

`POST /api/projects/{project_id}/tasks/`

Parameter | Required | Default | Description
--------- | -------- | ------- | -----------
images[] | * | "" | List of multipart-encoded images (2 minimum)
processing_node | | null | The ID of the [Processing Node](#processingnode) this [Task](#task) should be assigned to. If not specified, and auto_processing_node is `true`, a [Processing Node](#processingnode) will be automatically assigned. 
name | | "" | User defined name for the task
auto_processing_node | | true | Whether WebODM should automatically assign the next available [Processing Node](#processingnode) to process this [Task](#task).
options | | "[]" | JSON-encoded list of name/value pairs, where each pair represents a command line option to be passed to a [Processing Node](#processingnode).

You assign a [Task](#task) to a [Project](#project) by passing the proper `project_id` path in the URL.


### Update a task

`PATCH /api/projects/{project_id}/tasks/{task_id}/`

Parameters are the same as above.


### Delete a task

`DELETE /api/projects/{project_id}/tasks/{task_id}/`

Upon deletion, all images and assets associated with the [Task](#task) are deleted also. The operation is irreversible.


### Get list of tasks

> Task list:

```json
[
    {
        "id": 6,
        "project": 2,
        "processing_node": 2,
        "images_count": 89,
        "uuid": "2e8b687d-c269-4e2f-91b3-5a2cd51b5321",
        "name": "Test name",
        "processing_time": 8402184,
        "auto_processing_node": true,
        "status": 40,
        "last_error": null,
        "options": [],
        "ground_control_points": null,
        "created_at": "2016-12-08T13:32:28.139474Z",
        "pending_action": null
    }
]
```

`GET /api/projects/{project_id}/tasks/`

Retrieves all [Task](#task) items associated with `project_id`.

### Download assets

TODO

### Download assets (raw)

TODO

### Retrieve console output

TODO

### Cancel task

TODO

### Remove task

TODO

### Restart task

TODO

### Orthophoto TMS layer

TODO

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
QUEUED | 10 | [Task](#task)'s files have been uploaded to a [ProcessingNode](#processingnode) and are waiting to be processed.
RUNNING | 20 | [Task](#task) is currently being processed.
FAILED | 30 | [Task](#task) has failed for some reason (not enough images, out of memory, Piero forgot to close a parenthesis, etc.)
COMPLETED | 40 | [Task](#task) has completed. Assets are be ready to be downloaded.
CANCELED | 50 | [Task](#task) was manually canceled by the user.
