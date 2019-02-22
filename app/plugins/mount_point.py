import re

class MountPoint:
    def __init__(self, url, view, *args, **kwargs):
        """
        :param url: path to mount this view to, relative to plugins directory
        :param view: Django/DjangoRestFramework view
        :param args: extra args to pass to url() call
        :param kwargs: extra kwargs to pass to url() call
        """
        super().__init__()

        self.url = re.sub(r'^/+', '', url) # remove leading slashes
        self.view = view
        self.args = args
        self.kwargs = kwargs
