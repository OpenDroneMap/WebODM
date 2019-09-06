## Processing Node

> Example processing node:

```json
{
    "id": 2,
    "online": true,
    "hostname": "nodeodm.masseranolabs.com",
    "port": 80,
    "api_version": "1.0.1",
    "engine_version": "0.6.0",
    "engine": "odm",
    "last_refreshed": "2017-03-01T21:14:49.918276Z",
    "queue_count": 0,
    "max_images": null,
    "label": "nodeodm.masseranolabs.com:80",
    "available_options": [
        {
            "help": "Oct-tree depth at which the Laplacian equation is solved in the surface reconstruction step. Increasing this value increases computation times slightly but helps reduce memory usage. Default: 9",
            "name": "mesh-solver-divide",
            "type": "int",
            "value": "9",
            "domain": "positive integer"
        },
    ...
```

Processing nodes are associated with zero or more tasks and
take care of processing input images. Processing nodes are computers or virtual machines running [NodeODM](https://github.com/OpenDroneMap/NodeODM) or any other API compatible with it.

Field | Type | Description
----- | ---- | -----------
id | int | Unique Identifier
online | bool | Whether the processing node could be reached in the last 5 minutes
hostname | string | Hostname/IP address
port | int | Port
api_version | string | Version of NodeODM currently running
engine_version | string | Version of processing engine currently being used
engine | string | Lowercase identifier of processing engine
last_refreshed | string | Date and time this node was last seen online. This value is typically refreshed every 15-30 seconds and is used to decide whether a node is offline or not
queue_count | int | Number of [Task](#task) items currently being processed/queued on this node.
max_images | int | Optional maximum number of images this processing node can accept. null indicates no limit.
label | string | Label for the node
available_options | JSON[] | JSON-encoded list of options that this node is capable of handling. See [Available Options](#available-options) for more information


#### Available Options

Name | Description
---- | -----------
help | Description of the option
name | Name that identifies the option. This is the value you pass in the `name` key/value pair when creating a set of options for a new [Task](#task)
type | Possible values are `int`, `float`, `string`, `bool`
value | Default value if the option is not specified
domain | Restriction of the range of values that this option allows. Examples are `float`, `negative integer`, `percent`, `float: 0 <= x <= 10`, etc. for all possible values, check [NodeODM's odmOptions.js code](https://github.com/OpenDroneMap/NodeODM/blob/master/libs/odmOptions.js#L135)


### Add a processing node

`POST /api/processingnodes/`

Parameter | Required | Default | Description
--------- | -------- | ------- | -----------
hostname | * | "" | Hostname/IP address
port | * |  | Port

All other fields are automatically populated, and shouldn't generally be specified.

### Update a processing node

`PATCH /api/processingnodes/`

Parameters are the same as above.

### Delete a processing node

`DELETE /api/processingnodes/`

Upon deletion, all [Task](#task) items associated with the node will continue to exist. You might get errors (duh!) if you delete a processing node in the middle of processing a [Task](#task).


### Get list of processing nodes

`GET /api/processingnodes/`

Parameter | Required | Default | Description
--------- | -------- | ------- | -----------
id | | "" | Filter by id
hostname | | "" | Filter by hostname
port | | "" | Filter by port
api_version | | "" | Filter by API version
queue_count | | "" | Filter by queue count
max_images | | "" | Filter by max images
engine_version | | "" | Filter by engine version
engine | | "" | Filter by engine identifier
ordering | | "" | Ordering field to sort results by
has_available_options | | "" | Return only processing nodes that have a valid set of processing options (check that the `available_options` field is populated). Either `true` or `false`.

#### Example: Show only nodes that have a valid set of options

`GET /api/processingnodes/?has_available_options=true`

#### Example: Sorting

`GET /api/processingnodes/?ordering=-hostname`

Sort by hostname, descending order.

<aside class="notice">Only processing nodes visible to the current user are returned. If you added a processing node, but your non-admin users can't see it, make sure that they have been assigned the proper permissions. Administration -- Processing Nodes -- Select Node -- Object Permissions -- Add User/Group and check CAN VIEW PROCESSING NODE.</aside>


### Processing Options

> Processing options example:

```json
[
    {
        "help": "Oct-tree depth at which the Laplacian equation is solved in the surface reconstruction step. Increasing this value increases computation times slightly but helps reduce memory usage. Default: 9",
        "name": "mesh-solver-divide",
        "type": "int",
        "value": "9",
        "domain": "positive integer"
    },
    {
        "help": "Ignore matched keypoints if the two images share less than <float> percent of keypoints. Default: 2",
        "name": "matcher-threshold",
        "type": "float",
        "value": "2",
        "domain": "percent"
    },
    ...
```

`GET /api/processingnodes/options/`

Display the common options available among all online processing nodes. This is calculated by intersecting the `available_options` field of all online processing nodes visible to the current user.

Use this list of options to check whether a particular option is supported by all online processing nodes. If you use the automatic processing node assignment feature for processing tasks, this is the list you want to display to the user for choosing the options to use during processing.

<aside class="notice">While WebODM is capable of handling processing nodes running different versions of NodeODM, we don't recommend doing so. When all processing nodes use the same NodeODM version, the output of this API call will be identical to the <b>available_options</b> field of any node.</aside>

