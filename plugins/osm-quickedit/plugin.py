from app.plugins import PluginBase, Menu, MountPoint
from django.shortcuts import render

class Plugin(PluginBase):
    def include_js_files(self):
    	return ['main.js']

    # def include_css_files(self):
    # 	return ['test.css']



