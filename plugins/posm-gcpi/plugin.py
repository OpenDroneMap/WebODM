from app.plugins import PluginBase, Menu, MountPoint
from django.shortcuts import render

class Plugin(PluginBase):

    def register(self):
    	pass

    def main_menu(self):
    	return [Menu("GCP Editor", self.url("index.html"), "fa fa-map-marker fa-fw")]

    def mount_points(self):
    	return [
    		MountPoint("/test", test)
    	]


def test(request):
    return render(request, 'app/dashboard.html', {'title': 'PLUGIN!!'})