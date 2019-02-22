'''
This Source Code Form is subject to the terms of the Mozilla 
Public License, v. 2.0. If a copy of the MPL was not 
distributed with this file, You can obtain one at 
https://mozilla.org/MPL/2.0/.
'''

# How to authenticate and process drone images using WebODM
import requests, sys, os, glob, json, time
import status_codes

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
            {'name': "orthophoto-resolution", 'value': 5}
        ])
        res = requests.post('http://localhost:8000/api/projects/{}/tasks/'.format(project_id), 
                    headers={'Authorization': 'JWT {}'.format(token)},
                    files=images,
                    data={
                        'options': options
                    }).json()

        print("Created task: {}".format(res))
        task_id = res['id']

        while True:
            time.sleep(3)
            res = requests.get('http://localhost:8000/api/projects/{}/tasks/{}/'.format(project_id, task_id), 
                        headers={'Authorization': 'JWT {}'.format(token)}).json()
            
            if res['status'] == status_codes.COMPLETED:
                print("Task has completed!")
                break
            elif res['status'] == status_codes.FAILED:
                print("Task failed: {}".format(res))
                print("Cleaning up...")
                requests.delete("http://localhost:8000/api/projects/{}/".format(project_id), 
                    headers={'Authorization': 'JWT {}'.format(token)})
                sys.exit(1)
            else:
                seconds = res['processing_time'] / 1000
                if seconds < 0: 
                    seconds = 0
                m, s = divmod(seconds, 60)
                h, m = divmod(m, 60)
                sys.stdout.write("\rProcessing... [%02d:%02d:%02d]" % (h, m, s))
                sys.stdout.flush()

        res = requests.get("http://localhost:8000/api/projects/{}/tasks/{}/download/orthophoto.tif".format(project_id, task_id), 
                        headers={'Authorization': 'JWT {}'.format(token)},
                        stream=True)
        with open("orthophoto.tif", 'wb') as f:
            for chunk in res.iter_content(chunk_size=1024): 
                if chunk:
                    f.write(chunk)

        print("Saved ./orthophoto.tif")

        print("Cleaning up...")
        requests.delete("http://localhost:8000/api/projects/{}/".format(project_id), 
                        headers={'Authorization': 'JWT {}'.format(token)})
    else:
        print("Cannot create project: {}".format(res))
else:
    print("Invalid credentials!")

