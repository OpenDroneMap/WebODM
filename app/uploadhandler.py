import tempfile

import errno
from django.core.files.uploadedfile import UploadedFile
from django.core.files.uploadhandler import FileUploadHandler

from django.conf import settings

"""
Same as Django's TemporaryFileUploadHandler, but closes the file
after the upload is completed as not to hog the number of open fd limits
(see https://github.com/OpenDroneMap/WebODM/issues/233)
"""
class TemporaryFileUploadHandler(FileUploadHandler):
    """
    Upload handler that streams data into a temporary file.
    """
    def __init__(self, *args, **kwargs):
        super(TemporaryFileUploadHandler, self).__init__(*args, **kwargs)

    def new_file(self, *args, **kwargs):
        """
        Create the file object to append to as data is coming in.
        """
        super(TemporaryFileUploadHandler, self).new_file(*args, **kwargs)
        self.file = ClosedTemporaryUploadedFile(self.file_name, self.content_type, 0, self.charset, self.content_type_extra)

    def receive_data_chunk(self, raw_data, start):
        self.file.write(raw_data)

    def file_complete(self, file_size):
        self.file.seek(0)
        self.file.size = file_size
        self.file.close() # Close the file as not to hog the number of open files descriptors
        return self.file


class ClosedTemporaryUploadedFile(UploadedFile):
    """
    A file uploaded to a temporary location (i.e. stream-to-disk).
    """
    def __init__(self, name, content_type, size, charset, content_type_extra=None):
        file = tempfile.NamedTemporaryFile(suffix='.upload', dir=settings.FILE_UPLOAD_TEMP_DIR, delete=False)
        super(ClosedTemporaryUploadedFile, self).__init__(file, name, content_type, size, charset, content_type_extra)

    def temporary_file_path(self):
        """
        Returns the full path of this file.
        """
        return self.file.name

    def close(self):
        try:
            return self.file.close()
        except OSError as e:
            if e.errno != errno.ENOENT:
                # Means the file was moved or deleted before the tempfile
                # could unlink it.  Still sets self.file.close_called and
                # calls self.file.file.close() before the exception
                raise
