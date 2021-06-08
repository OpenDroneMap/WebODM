from app.plugins import PluginBase

class Plugin(PluginBase):
    def include_js_files(self):
        return ['main.js']
