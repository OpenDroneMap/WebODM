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


### Create a task

`POST /api/projects/`

Parameter | Required | Default | Description
--------- | -------- | ------- | -----------
name | * | "" | Name of the project
description | |  "" | A more in-depth description


### Update a task

`PATCH /api/projects/{id}/`

Parameter | Required | Default | Description
--------- | -------- | ------- | -----------
name | | "" | Name of the project
description | |  "" | A more in-depth description


### Delete a task

`DELETE /api/projects/{id}/`

Upon deletion, all <a href="#task">Task</a> items associated with the <a href="#project">Project</a> are deleted also. The operation is irreversible.


### Get list of tasks

> Task list:

```json
{
}
```

`GET /api/projects/`

Parameter | Required | Default | Description
--------- | -------- | ------- | -----------
page | | 1 | Page number
id | | "" | Filter by id
name | | "" | Filter by name
description | | "" | Filter by description
created_at | | "" | Filter by created_at
ordering | | "" | Ordering field to sort results by


## Pending Actions

In some circumstances, a [Task](#task) can have a pending action. When this happens, an action is soon to be performed on it.

Pending Action | Code | Description
----- | ---- | -----------
CANCEL | 1 | About to be canceled
REMOVE | 2 | About to be removed
RESTART | 3 | About to be restarted
