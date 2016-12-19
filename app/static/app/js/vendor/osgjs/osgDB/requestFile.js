var P = require( 'bluebird' );

var requestFile = function ( url, options ) {

    var defer = P.defer();

    var req = new XMLHttpRequest();
    req.open( 'GET', url, true );

    // handle responseType
    if ( options && options.responseType )
        req.responseType = options.responseType;

    if ( options && options.progress ) {
        req.addEventListener( 'progress', options.progress, false );
    }

    req.addEventListener( 'error', function () {
        defer.reject();
    }, false );

    req.addEventListener( 'load', function () {

        if ( req.responseType === 'arraybuffer' || req.responseType === 'blob' )
            defer.resolve( req.response );
        else
            defer.resolve( req.responseText );

    } );

    req.send( null );
    return defer.promise;
};

module.exports = requestFile;
