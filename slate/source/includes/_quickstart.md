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

```python
import requests
res = requests.post('http://localhost:8000/api/token-auth/', 
					data={'username': 'admin',
						  'password': 'admin'}).json()
```

First, we <a href="#authenticate">authenticate</a> with WebODM. A `token` is returned when authentication is successful.
<div class="clear"></div>

```python
if 'token' in res:
	token = res['token']
	res = requests.post('http://localhost:8000/api/projects/', 
						headers={'Authorization': 'JWT {}'.format(token)},
						data={'name': 'Hello WebODM!'}).json()
```

Then we need to create a <a href="#project">Project</a>. We pass our `token` via the `Authorization` header. If we forget to pass this header, the system will not authenticate us and will refuse to process the request. `name` is the name we assign to the project.
<div class="clear"></div>