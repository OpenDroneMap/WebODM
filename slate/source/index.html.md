---
title: WebODM Documentation

language_tabs:
  - json

toc_footers:
  - <a href='https://github.com/OpenDroneMap/WebODM'>WebODM on GitHub</a>
  - <a href='https://github.com/OpenDroneMap/OpenDroneMap'>OpenDroneMap on GitHub</a>

search: true
---

# Introduction

[WebODM](https://github.com/OpenDroneMap/WebODM) is a free, user-friendly, extendable application and API for drone image processing. It generates georeferenced maps, point clouds and textured 3D models from aerial images.

Developers can leverage this API to extend the functionality of [WebODM](https://github.com/OpenDroneMap/WebODM) or integrate it with existing software like [QGIS](http://www.qgis.org/) or [AutoCAD](http://www.autodesk.com/products/autocad/overview).

# Authentication

To access the API, you need to provide a valid username and password. You can create users from WebODM's Administration page.

If authentication is successful, you will be issued a token. For all API calls, always include the following parameter (TODO: how?):

Parameter | Required | Default | Description
--------- | -------- | ------- | -----------
token | * | "" | Authentication Token 

> Get authentication token:

```python
# TODO
```

# Processing Images

Images are processed by creating a [Task](#task). A [Project](#project) is a way to group together related [Task](#task) items. A [Project](#project) always needs to exist before a [Task](#task) can be created.

# Project

## Definition

> Example:

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


## Create a project

`POST /api/projects/`

Parameter | Required | Default | Description
--------- | -------- | ------- | -----------
name | * | "" | Name of the project 
description | |  "" | A more in-depth description

## Get list of projects

> Example:

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

### Filtering the list

`GET /api/projects/?<field>=<value>`

Where field is one of: `id`, `name`, `description`, `created_at`. Only equality can be used, e.g. `id=3`.

### Sorting the list

`GET /api/projects/?ordering=<field>`

Where field is one of: `id`, `name`, `description`, `created_at`. Results are sorted in ascending order. Placing a minus `-` sign, e.g. `-created_at` sorts in descending order.

### Pagination

The project list is paginated. Items are stored in `results`. `count` is the total number of items. `next` and `previous` are links to retrieve the next and previous page of results, or null. Each page contains 10 items.

<aside class="notice">Only the projects visible to the current user will be displayed.</aside>

# Task

## Definition

TODO