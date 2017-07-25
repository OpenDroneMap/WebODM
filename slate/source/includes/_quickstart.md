# Quickstart

## How To Process Images

In this tutorial we'll explore how to process an orthophoto from a set of aerial images using Python. To do that we'll need to:

 - Authenticate
 - Create a [Project](#project). Projects are a way to group together related [Task](#task) items
 - Upload some images to create a [Task](#task)
 - Check for [Task](#task) progress. Photogrammetry can take a long time, so results could take a few minutes to a few hours to be processed.
 - Download the resulting orthophoto.

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

Then we need to create a [Project](#project). We pass our `token` via the `Authorization` header. If we forget to pass this header, the system will not authenticate us and will refuse to process the request. We also assign a `name` to our project.
<div class="clear"></div>

```python
images = [
	('images', ('image1.jpg', open('image1.jpg', 'rb'), 'image/jpg')), 
	('images', ('image2.jpg', open('image2.jpg', 'rb'), 'image/jpg')),
	# ...
]
options = json.dumps([
	{'name': "orthophoto-resolution", 'value': 24}
])

res = requests.post('http://localhost:8000/api/projects/{}/tasks/'.format(project_id), 
			headers={'Authorization': 'JWT {}'.format(token)},
			files=images,
			data={
				'options': options
			}).json()

task_id = res['id']
```

We can then create a [Task](#task). The only required parameter is a list of multiple, multipart-encoded `images`. Processing will start automatically
as soon as a [Processing Node](#processing-node) is available. It is possible to specify additional options by passing an `options` value, which is a JSON-encoded list of name/value pairs. Several other options are available. See the [Task - Processing Options](#processing-options) reference for more information.
<div class="clear"></div>

```python
while True:
	res = requests.get('http://localhost:8000/api/projects/{}/tasks/{}/'.format(project_id, task_id), 
				headers={'Authorization': 'JWT {}'.format(token)}).json()
	
	if res['status'] == status_codes.COMPLETED:
		print("Task has completed!")
		break
	elif res['status'] == status_codes.FAILED:
		print("Task failed: {}".format(res))
		sys.exit(1)
	else:
		print("Processing, hold on...")
		time.sleep(3)
```

We periodically check for the [Task](#task) status using a loop.
<div class="clear"></div>

```python
res = requests.get("http://localhost:8000/api/projects/{}/tasks/{}/download/orthophoto.tif".format(project_id, task_id), 
						headers={'Authorization': 'JWT {}'.format(token)},
						stream=True)
with open("orthophoto.tif", 'wb') as f:
    for chunk in res.iter_content(chunk_size=1024): 
        if chunk:
            f.write(chunk)
print("Saved ./orthophoto.tif")
```

Our orthophoto is ready to be downloaded. A variety of other assets, including a dense 3D point cloud and a textured model [are also available](#download-assets).

Congratulations! You just processed some images.

![Success](https://i.imgflip.com/2/ipzhf.jpg)