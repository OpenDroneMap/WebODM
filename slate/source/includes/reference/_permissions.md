## Permissions

WebODM comes with a standard `model level` permission system. You can
check whether users are logged-in and have privileges to act on things
model-wise (can a user add a project? can a user view projects?).

On top of that, WebODM features a powerful `row level` permission system. You can specify exactly which things a user has or has not access to, delete, change, etc.

Changes to the permissions of objects can be handled via the `Administration` page of WebODM. 

We are planning to make it easier for users and developers to handle permissions via an API. This is a work in progress.


### Permission Values

Permission | Description
----- | -----------
delete | The object can be deleted
change | The object can be edited
add | A related object can be added to the object (a task can be added to the project)
view | The object can be viewed (read-only)