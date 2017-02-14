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
    "description": ""
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


### Create a project

`POST /api/projects/`

Parameter | Required | Default | Description
--------- | -------- | ------- | -----------
name | * | "" | Name of the project 
description | |  "" | A more in-depth description

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

`GET /api/projects/?page=N`

If `N` is omitted, defaults to 1.

#### Filtering

`GET /api/projects/?<field>=<value>`

Where field is one of: `id`, `name`, `description`, `created_at`.

#### Sorting

`GET /api/projects/?ordering=<field>`

Where field is one of: `id`, `name`, `description`, `created_at`. Results are sorted in ascending order. Placing a minus `-` sign, e.g. `-created_at` sorts in descending order.

#### Pagination

The project list is paginated. Items are stored in `results`. `count` is the total number of items. `next` and `previous` are links to retrieve the next and previous page of results, or null.

<aside class="notice">Only the projects visible to the current user will be displayed.</aside>
