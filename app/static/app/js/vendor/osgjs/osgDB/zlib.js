var notify = require( 'osg/notify' );

var isBufferGZIP = function ( arrayBuffer ) {
    var typedArray = new Uint8Array( arrayBuffer );
    return ( typedArray[ 0 ] === 0x1f && typedArray[ 1 ] === 0x8b );
};

var gunzip = function ( arrayBuffer ) {

    var typedArray = new Uint8Array( arrayBuffer );
    var zlib = require( 'zlib' );

    if ( !zlib ) {
        notify.error( 'osg failed to use a gunzip.min.js to uncompress a gz file.\n You can add this vendors to enable this feature or get it at https://github.com/imaya/zlib.js/blob/master/bin/gunzip.min.js' );
    }

    var zdec = new zlib.Gunzip( typedArray );
    var result = zdec.decompress();
    return result.buffer;

};

module.exports = {
    isGunzipBuffer: isBufferGZIP,
    gunzip: gunzip
};
