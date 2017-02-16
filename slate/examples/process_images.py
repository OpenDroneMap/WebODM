'''
This Source Code Form is subject to the terms of the Mozilla 
Public License, v. 2.0. If a copy of the MPL was not 
distributed with this file, You can obtain one at 
https://mozilla.org/MPL/2.0/.
'''

# How to authenticate and process drone images using WebODM
import requests, sys, os, glob, json

if len(sys.argv) < 2:
	print("Usage: ./{} <path_to_images>".format(sys.argv[0]))
	sys.exit(1)

types = ("*.jpg", "*.jpeg", "*.JPG", "*.JPEG")
images_list = []
for t in types:
	images_list.extend(glob.glob(os.path.join(sys.argv[1], t)))

if len(images_list) < 1:
	print("Need at least 2 images")
	sys.exit(1)
else:
	print("Found {} images".format(len(images_list)))

res = requests.post('http://localhost:8000/api/token-auth/', 
					data={'username': 'admin',
						  'password': 'admin'}).json()

if 'token' in res:
	print("Logged-in!")
	token = res['token']

	res = requests.post('http://localhost:8000/api/projects/', 
						headers={'Authorization': 'JWT {}'.format(token)},
						data={'name': 'Hello WebODM!'}).json()
	if 'id' in res:
		print("Created project: {}".format(res)) 
		project_id = res['id']

		images = [('images', (os.path.basename(file), open(file, 'rb'), 'image/jpg')) for file in images_list]
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

		print("Created task: {}".format(res))
		task_id = res['id']

		
	else:
		print("Cannot create project: {}".format(res))
else:
	print("Invalid credentials!")

