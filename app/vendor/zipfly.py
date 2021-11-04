# Modified from https://github.com/BuzonIO/zipfly
# This library was created by Buzon.io and is released under the MIT. Copyright 2021 Cardallot, Inc.

# -*- coding: utf-8 -*-
__version__ = '6.0.4'
# v

import io
import stat
import zipfile

ZIP64_LIMIT = (1 << 31) + 1

class LargePredictionSize(Exception):
    """
    Raised when Buffer is larger than ZIP64
    """

class ZipflyStream(io.RawIOBase):

    """
    The RawIOBase ABC extends IOBase. It deals with
    the reading and writing of bytes to a stream. FileIO subclasses
    RawIOBase to provide an interface to files in the machine’s file system.
    """

    def __init__(self):
        self._buffer = b''
        self._size = 0

    def writable(self):
        return True

    def write(self, b):
        if self.closed:
            raise RuntimeError("ZipFly stream was closed!")
        self._buffer += b
        return len(b)

    def get(self):
        chunk = self._buffer
        self._buffer = b''
        self._size += len(chunk)
        return chunk

    def size(self):
        return self._size


class ZipFly:

    def __init__(self,
                 mode = 'w',
                 paths = [],
                 chunksize = 0x8000,
                 compression = zipfile.ZIP_STORED,
                 allowZip64 = True,
                 compresslevel = None,
                 storesize = 0,
                 filesystem = 'fs',
                 arcname = 'n',
                 encode = 'utf-8',):

        """
        @param store size : int : size of all files
        in paths without compression
        """

        if mode not in ('w',):
            raise RuntimeError("ZipFly requires 'w' mode")

        if compression not in ( zipfile.ZIP_STORED,):
            raise RuntimeError("Not compression supported")

        if compresslevel not in (None, ):
            raise RuntimeError("Not compression level supported")

        if isinstance(chunksize, str):
            chunksize = int(chunksize, 16)



        self.comment = f'Written using WebODM'
        self.mode = mode
        self.paths = paths
        self.filesystem = filesystem
        self.arcname = arcname
        self.compression = compression
        self.chunksize = chunksize
        self.allowZip64 = allowZip64
        self.compresslevel = compresslevel
        self.storesize = storesize
        self.encode = encode
        self.ezs = int('0x8e', 16) # empty zip size in bytes

    def set_comment(self, comment):

        if not isinstance(comment, bytes):
            comment = str.encode(comment)

        if len(comment) >= zipfile.ZIP_MAX_COMMENT:

            # trunk comment
            comment = comment[:zipfile.ZIP_MAX_COMMENT]

        self.comment = comment


    def reader(self, entry):

        def get_chunk():
            return entry.read( self.chunksize )

        return get_chunk()


    def buffer_size(self):

        '''
        FOR UNIT TESTING (not used)
        using to get the buffer size
        this size is different from the size of each file added
        '''

        for i in self.generator(): pass
        return self._buffer_size


    def buffer_prediction_size(self):

        if not self.allowZip64:
            raise RuntimeError("ZIP64 extensions required")


        # End of Central Directory Record
        EOCD = int('0x16', 16)
        FILE_OFFSET = int('0x5e', 16) * len(self.paths)

        tmp_comment = self.comment
        if isinstance(self.comment, bytes):
            tmp_comment = ( self.comment ).decode()

        size_comment = len(tmp_comment.encode( self.encode ))

        # path-name

        size_paths = 0
        #for path in self.paths:
        for idx in range(len(self.paths)):

            '''
            getting bytes from character in UTF-8 format
            example:
            '传' has 3 bytes in utf-8 format ( b'\xe4\xbc\xa0' )
            '''

            #path = paths[idx]
            name = self.arcname
            if not self.arcname in self.paths[idx]:
                name = self.filesystem

            tmp_name = self.paths[idx][name]
            if (tmp_name)[0] in ('/', ):

                # is dir then trunk
                tmp_name = (tmp_name)[ 1 : len( tmp_name ) ]

            size_paths += (
                len(
                    tmp_name.encode( self.encode )
                ) - int( '0x1', 16)
            ) * int('0x2', 16)

        # zipsize
        zs = sum([
            EOCD,
            FILE_OFFSET,
            size_comment,
            size_paths,
            self.storesize,
        ])

        if zs > ZIP64_LIMIT:
            raise LargePredictionSize(
                "Prediction size for zip file greater than 2 GB not supported"
            )

        return zs


    def generator(self):

        # stream
        stream = ZipflyStream()

        with zipfile.ZipFile(
            stream,
            mode = self.mode,
            compression = self.compression,
            allowZip64 = self.allowZip64,) as zf:

            for path in self.paths:

                if not self.filesystem in path:

                    raise RuntimeError(
                        f" '{self.filesystem}' key is required "
                    )

                """
                filesystem should be the path to a file or directory on the filesystem.
                arcname is the name which it will have within the archive (by default,
                this will be the same as filename
                """

                if not self.arcname in path:

                    # arcname will be default path
                    path[self.arcname] = path[self.filesystem]

                z_info = zipfile.ZipInfo.from_file(
                    path[self.filesystem],
                    path[self.arcname]
                )

                with open( path[self.filesystem], 'rb' ) as e:
                    # Read from filesystem:

                    with zf.open( z_info, mode = self.mode ) as d:

                        """
                        buffer = b''
                        while True:

                            chunk = e.read(self.chunksize)
                            if not chunk:
                                break

                            buffer += chunk
                            elements = buffer.split(b'\0')

                            for element in elements[:-1]:
                                d.write( element )
                                yield stream.get()

                            buffer = elements[-1]

                        if buffer:
                            # d.write( buffer )
                            yield stream.get()
                        """

                        for chunk in iter( lambda: e.read( self.chunksize ), b'' ):

                            # (e.read( ... )) this get a small chunk of the file
                            # and return a callback to the next iterator

                            d.write( chunk )
                            yield stream.get()


            self.set_comment(self.comment)
            zf.comment = self.comment

        # last chunk
        yield stream.get()

        # (TESTING)
        # get the real size of the zipfile
        self._buffer_size = stream.size()

        # Flush and close this stream.
        stream.close()


    def get_size(self):

        return self._buffer_size

class ZipStream:
    def __init__(self, paths):
        self.paths = paths
        self.generator = None

    def lazy_load(self, chunksize):
        if self.generator is None:
            zfly = ZipFly(paths=self.paths, mode='w', chunksize=chunksize)
            self.generator = zfly.generator()

    def read(self, count):
        self.lazy_load(count)
        return next(self.generator)