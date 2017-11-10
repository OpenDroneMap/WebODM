## Project

> Example project:

```json
{
    "id": 2,
    "tasks": [
        7,
        6,
        5
    ],
    "created_at": "2016-12-07T02:09:28.515319Z",
    "name": "Test",
    "description": "",
    "permissions": [
        "delete",
        "change",
        "add",
        "view"
    ]
}
```

A [Project](#project) is a collection of [Task](#task) items.

Field | Type | Description
----- | ---- | -----------
id | int | Unique identifier
tasks | int[] | List of task IDs associated with this project
created_at | string | Creation date and time
name | string | Name of the project
description | string | A more in-depth description
permissions | string[] | List of actions that the current user is allowed to perform. See [Permissions Values](#permission-values)


### Create a project

`POST /api/projects/`

Parameter | Required | Default | Description
--------- | -------- | ------- | -----------
name | * | "" | Name of the project
description | |  "" | A more in-depth description


### Update a project

`PATCH /api/projects/{id}/`

Parameters are the same as above.


### Delete a project

`DELETE /api/projects/{id}/`

Upon deletion, all [Task](#task) items associated with the [Project](#project) are deleted also. The operation is irreversible.

### Get single project

`GET /api/projects/{id}/`

### Get list of projects

> Project list:

```json
{
    "count": 1,
    "next": null,
    "previous": null,
    "results": [
        {
            "id": 2,
            "tasks": [
                7,
                6,
                5
            ],
            "created_at": "2016-12-07T02:09:28.515319Z",
            "name": "Test",
            "description": ""
        }
    ]
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


#### Example: Filtering by name

`GET /api/projects/?name=hello`

Retrieves projects that have a name of "hello".


#### Example: Sorting

`GET /api/projects/?ordering=-id`

Sort by project ID, descending order.

<aside class="notice">Only projects visible to the current user are returned.</aside>
