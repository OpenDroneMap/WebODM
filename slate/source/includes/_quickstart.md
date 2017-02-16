# Quickstart

## How To Process Images

We'll explore how to process some aerial images and retrieve the results. To do that we'll need to:

 - Authenticate
 - Create a [Project](#project). Projects are a way to group together related [Task](#task) items
 - Upload some images to create a [Task](#task)
 - Check for [Task](#task) progress. Photogrammetry can take a long time, so results could take a few minutes to a few hours to be processed.
 - Download an orthophoto from a successful [Task](#task)

<aside class="notice">Most of the examples in this document use <a href="http://docs.python-requests.org/en/latest/index.html" target="_blank">requests</a>. Make sure it's installed before running any code:<br/><br/>

<pre class="higlight shell">
$ pip install requests
</pre>
</aside>

<aside class="notice">
The <a href="https://github.com/OpenDroneMap/WebODM/tree/master/slate/examples/process_images.py" target="_blank">source code</a> for this example is available on GitHub</a>.
</aside>

```python
import requests
res = requests.post('http://localhost:8000/api/token-auth/', 
					data={'username': 'admin',
						  'password': 'admin'}).json()
token = res['token']
```

First, we <a href="#authenticate">authenticate</a> with WebODM. A `token` is returned when authentication is successful.
<div class="clear"></div>

```python
res = requests.post('http://localhost:8000/api/projects/', 
					headers={'Authorization': 'JWT {}'.format(token)},
					data={'name': 'Hello WebODM!'}).json()
project_id = res['id']
```

Then we need to create a <a href="#project">Project</a>. We pass our `token` via the `Authorization` header. If we forget to pass this header, the system will not authenticate us and will refuse to process the request. We assign a `name` to the project.
<div class="clear"></div>

```python
images = [
	('images', ('image1.jpg', open('image1.jpg', 'rb'), 'image/jpg')), 
	('images', ('image2.jpg', open('image2.jpg', 'rb'), 'image/jpg')),
	# ...
]
options = json.dumps([
	{'name': "use-opensfm-pointcloud", 'value': True},
	{'name': "orthophoto-resolution", 'value': 24},
])

res = requests.post('http://localhost:8000/api/projects/{}/tasks/'.format(project_id), 
			headers={'Authorization': 'JWT {}'.format(token)},
			files=images,
			data={
				'options': options
			}).json()

task_id = res['id']
```

We can then create a <a href="#task">Task</a>. The only required parameter is a list of multiple, multipart-encoded `images`. Processing will start automatically
as soon as a <a href="#processingnode">Processing Node</a> is available. It is possible to specify additional options by passing an `options` value, which is a JSON-encoded list of name/value pairs. Several other options are available. See the <a href="#task">Task</a> reference for more information.

