## Admin/Users

> Example User

```json
{
    "id": 1,
    "password": "pbkdf2_sha256$120000$vkzUnKJwwaNl$95nqgBjqZ3/8Plk5soe2SjUPEF5fFNjBDfIapOXCy/Y=",
    "last_login": "2019-09-12T01:45:05Z",
    "is_superuser": true,
    "username": "admin",
    "first_name": "",
    "last_name": "",
    "email": "admin@example.com",
    "is_staff": true,
    "is_active": true,
    "date_joined": "2019-09-12T01:44:18Z",
    "groups": [
        1
    ],
    "user_permissions": [
        9,
        10,
        11,
        12
    ]
}
```

This API can only be used by admin users.

Field | Type | Description
----- | ---- | -----------
id | int | Unique identifier
password | string | Password
last_login | string | Last login date and time
is_superuser | bool | If user is superuser then true
username | string | User name
first_name | string | User first name
last_name | string | User last name
email | string | User email
is_staff | bool | If user is staff then true
is_active | bool | If user is active then true
date_joined | string | Join date and time
groups | int[] | List of groups to which the user belongs
user_permissions | int[] | List of permissions to which the user has


### Create a user

`POST /api/admin/users/`

Parameter | Required | Default | Description
--------- | -------- | ------- | -----------
password | * | "" | Password
is_superuser | | false | If user is superuser then true
username | | "" | User name
first_name | | "" | User first name
last_name | * | "" | User last name
email | | "" | User email
is_staff | | false |  If user is staff then true
is_active | | false | If user is active then true
groups | int[] | [] | List of groups to which the user belongs
user_permissions | int[] | [] | List of permissions to which the user has


### Update a user

`PUT /api/admin/users/{id}/`

Parameters are the same as above.


### Delete a user

`DELETE /api/admin/users/{id}/`


### Get a user

`GET /api/admin/users/{id}/`


### Get list of users

`GET /api/admin/users/`

Parameter | Required | Default | Description
--------- | -------- | ------- | -----------
email |  | "" | User email


#### Example: Filtering by email

`GET /api/admin/users/?email=user@example.com`

Retrieves projects that have a email of "user@example.com".


## Admin/Groups

> Example Group

```json
{
    "id": 1,
    "name": "Xyz",
    "permissions": [
        53,
        54,
        55,
        56,
        37,
        38,
        39,
        40,
        49,
        50,
        51,
        52,
        76
    ]
}
```

This API can only be used by admin users.


Field | Type | Description
----- | ---- | -----------
id | int | Unique identifier
name | string | Group name
permissions | int[] | List of permissions to which the group belongs


### Create a group

`POST /api/admin/groups/`

Parameter | Required | Default | Description
--------- | -------- | ------- | -----------
name | * | "" | Group name
permissions | int[] | [] | List of permissions to which the group belongs


### Update a group

`PUT /api/admin/groups/{id}/`

Parameters are the same as above.


### Delete a group

`DELETE /api/admin/groups/{id}/`


### Get a group

`GET /api/admin/groups/{id}/`


### Get list of group

`GET /api/admin/groups/`

Parameter | Required | Default | Description
--------- | -------- | ------- | -----------
name |  | "" | Group name

#### Example: Filtering by email

`GET /api/admin/groups/?name=Xyz`

Retrieves projects that have a name of "Xyz".
