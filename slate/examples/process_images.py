'''
This Source Code Form is subject to the terms of the Mozilla 
Public License, v. 2.0. If a copy of the MPL was not 
distributed with this file, You can obtain one at 
https://mozilla.org/MPL/2.0/.
'''

# How to authenticate and process drone images using WebODM
import requests
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
	else:
		print("Cannot create project: {}".format(res))
else:
	print("Invalid credentials!")

