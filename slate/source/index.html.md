---
title: WebODM Documentation

language_tabs:
  - code

toc_footers:
  - <a href='https://github.com/OpenDroneMap/WebODM'>WebODM on GitHub</a>
  - <a href='https://github.com/OpenDroneMap/OpenDroneMap'>OpenDroneMap on GitHub</a>

search: true
---

# Introduction

[WebODM](https://github.com/OpenDroneMap/WebODM) is a free, user-friendly, extendable application and API for drone image processing. It generates georeferenced maps, point clouds and textured 3D models from aerial images.

Developers can leverage this API to extend the functionality of [WebODM](https://github.com/OpenDroneMap/WebODM) or integrate it with existing software like [QGIS](http://www.qgis.org/) or [AutoCAD](http://www.autodesk.com/products/autocad/overview).

# Quickstart

## How To Process Images

We'll explore how to process some aerial images and retrieve the results. To do that we'll need to:

 - Authenticate
 - Create a [Project](#project). Projects are a way to group together related [Task](#task) items
 - Upload some images to create a [Task](#task)
 - Check for [Task](#task) progress. Photogrammetry can take a long time, so results could take a few minutes to a few hours to be processed.
 - Download an orthophoto from a successful [Task](#task)

# Reference

## Authentication

> Get authentication token:

```bash
curl -X POST -d "username=testuser&password=testpass" http://localhost:8000/api/token-auth/

{"token":"eyJ0eXAiO..."}
```

> Use authentication token:

```bash
curl -H "Authorization: JWT <your_token>" http://localhost:8000/api/projects/

{"count":13, ...}
```

`POST /api/token-auth/`

Field | Type | Description
----- | ---- | -----------
username | string | Username
password | string | Password

To access the API, you need to provide a valid username and password. You can create users from WebODM's Administration page.

If authentication is successful, you will be issued a token. All API calls should include the following header:

Header |
------ |
Authorization: JWT `your_token` |

The token expires after a set amount of time. The expiration time is dependent on WebODM's settings. You will need to request another token when a token expires.

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

## Task

TODO