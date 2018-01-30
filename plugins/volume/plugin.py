from app.plugins import PluginBase

class Plugin(PluginBase):

    def register(self):
        print("I'm registering!!!")