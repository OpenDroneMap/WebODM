"""
An interface to 
"""
import requests

class ApiClient:
    def __init__(self, host, port):
        self.host = host
        self.port = port

    def url(self, url):
        return "http://{}:{}{}".format(self.host, self.port, url)

    def info(self):
        return requests.get(self.url('/info')).json()

    def options(self):
        return requests.get(self.url('/options')).json()

    def new_task(self):
        pass
        #print(dir(self.client.task.post_task_new))
        #return self.client.task.post_task_new(images=dict(images="../Gruntfile.js")).result()

#a = ApiClient("localhostaa", 3000)
#print(a.info())