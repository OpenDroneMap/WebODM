'use strict';
var P = require( 'bluebird' );
var TransformEnums = require( 'osg/transformEnums' );

var osgWrapper = {};

osgWrapper.Object = function ( input, obj ) {
    var jsonObj = input.getJSON();

    if ( jsonObj.Name ) obj.setName( jsonObj.Name );

    if ( jsonObj.UserDataContainer ) {
        var userdata = input.setJSON( jsonObj.UserDataContainer ).readUserDataContainer();
        if ( userdata !== undefined ) {
            obj.setUserData( userdata );
        }
    }

    return obj;
};
/* jshint newcap: false */
osgWrapper.Node = function ( input, node ) {
    var jsonObj = input.getJSON();

    osgWrapper.Object( input, node );

    var promiseArray = [];

    if ( jsonObj.UpdateCallbacks ) {
        var cbAddCallback = node.addUpdateCallback.bind( node );
        for ( var j = 0, l = jsonObj.UpdateCallbacks.length; j < l; j++ ) {
            var promise = input.setJSON( jsonObj.UpdateCallbacks[ j ] ).readObject();
            promiseArray.push( promise );
            promise.then( cbAddCallback );
        }
    }

    if ( jsonObj.StateSet ) {
        var pp = input.setJSON( jsonObj.StateSet ).readObject();
        promiseArray.push( pp );
        pp.then( node.setStateSet.bind( node ) );
    }

    var queue = [];
    // For each url, create a function call and add it to the queue
    if ( jsonObj.Children ) {
        for ( var i = 0, k = jsonObj.Children.length; i < k; i++ ) {
            queue.push( input.setJSON( jsonObj.Children[ i ] ).readObject() );
        }
    }
    // Resolve first updateCallbacks and stateset.
    return P.all( promiseArray ).then( function () {
        // Need to wait until the stateset and the all the callbacks are resolved
        return P.all( queue ).then( function ( queueNodes ) {
            // All the results from P.all are on the argument as an array
            // Now insert children in the right order
            var len = queueNodes.length;
            for ( var i = 0; i < len; i++ )
                node.addChild( queueNodes[ i ] );
            return node;
        } );
    } );
};

osgWrapper.StateSet = function ( input, stateSet ) {
    var jsonObj = input.getJSON();

    osgWrapper.Object( input, stateSet );

    if ( jsonObj.RenderingHint !== undefined ) {
        stateSet.setRenderingHint( jsonObj.RenderingHint );
    }

    var promiseArray = [];

    var createAttribute = function ( jsonAttribute ) {
        var promise = input.setJSON( jsonAttribute ).readObject();
        if ( promise.isRejected() ) // sometimes we have some empty objects
            return;
        promiseArray.push( promise );
        promise.then( stateSet.setAttributeAndModes.bind( stateSet ) );
    };

    if ( jsonObj.AttributeList !== undefined ) {
        for ( var i = 0, l = jsonObj.AttributeList.length; i < l; i++ ) {
            createAttribute( jsonObj.AttributeList[ i ] );
        }
    }

    var createTextureAttribute = function ( unit, textureAttribute ) {
        var promise = input.setJSON( textureAttribute ).readObject();
        if ( promise.isRejected() ) // sometimes we have some empty objects
            return;
        promiseArray.push( promise );
        promise.then( stateSet.setTextureAttributeAndModes.bind( stateSet, unit ) );
    };

    if ( jsonObj.TextureAttributeList ) {
        var textures = jsonObj.TextureAttributeList;
        for ( var t = 0, lt = textures.length; t < lt; t++ ) {
            var textureAttributes = textures[ t ];
            for ( var a = 0, al = textureAttributes.length; a < al; a++ ) {
                createTextureAttribute( t, textureAttributes[ a ] );
            }
        }
    }

    return P.all( promiseArray ).then( function () {
        return stateSet;
    } );
};

osgWrapper.Material = function ( input, material ) {
    var jsonObj = input.getJSON();
    if ( !jsonObj.Diffuse || !jsonObj.Emission || !jsonObj.Specular || jsonObj.Shininess === undefined )
        return P.reject();

    osgWrapper.Object( input, material );

    material.setAmbient( jsonObj.Ambient );
    material.setDiffuse( jsonObj.Diffuse );
    material.setEmission( jsonObj.Emission );
    material.setSpecular( jsonObj.Specular );
    material.setShininess( jsonObj.Shininess );
    return P.resolve( material );
};

osgWrapper.BlendFunc = function ( input, blend ) {
    var jsonObj = input.getJSON();
    if ( !jsonObj.SourceRGB || !jsonObj.SourceAlpha || !jsonObj.DestinationRGB || !jsonObj.DestinationAlpha )
        return P.reject();

    osgWrapper.Object( input, blend );

    blend.setSourceRGB( jsonObj.SourceRGB );
    blend.setSourceAlpha( jsonObj.SourceAlpha );
    blend.setDestinationRGB( jsonObj.DestinationRGB );
    blend.setDestinationAlpha( jsonObj.DestinationAlpha );
    return P.resolve( blend );
};

osgWrapper.CullFace = function ( input, attr ) {
    var jsonObj = input.getJSON();
    if ( jsonObj.Mode === undefined )
        return P.reject();

    osgWrapper.Object( input, attr );
    attr.setMode( jsonObj.Mode );
    return P.resolve( attr );
};

osgWrapper.BlendColor = function ( input, attr ) {
    var jsonObj = input.getJSON();
    if ( !jsonObj.ConstantColor )
        return P.reject();

    osgWrapper.Object( input, attr );
    attr.setConstantColor( jsonObj.ConstantColor );
    return P.resolve( attr );
};

osgWrapper.Light = function ( input, light ) {
    var jsonObj = input.getJSON();

    if ( !jsonObj.Ambient ||
        !jsonObj.Diffuse ||
        !jsonObj.Direction ||
        !jsonObj.Position ||
        !jsonObj.Specular ||
        jsonObj.LightNum === undefined ||
        jsonObj.SpotCutoff === undefined ||
        jsonObj.LinearAttenuation === undefined ||
        jsonObj.ConstantAttenuation === undefined ||
        jsonObj.QuadraticAttenuation === undefined )
        return P.reject();

    osgWrapper.Object( input, light );
    light.setAmbient( jsonObj.Ambient );
    light.setConstantAttenuation( jsonObj.ConstantAttenuation );
    light.setDiffuse( jsonObj.Diffuse );
    light.setDirection( jsonObj.Direction );
    light.setLightNumber( jsonObj.LightNum );
    light.setLinearAttenuation( jsonObj.LinearAttenuation );
    light.setPosition( jsonObj.Position );
    light.setQuadraticAttenuation( jsonObj.QuadraticAttenuation );
    light.setSpecular( jsonObj.Specular );
    light.setSpotCutoff( jsonObj.SpotCutoff );
    light.setSpotBlend( 0.01 );
    if ( jsonObj.SpotExponent !== undefined ) {
        light.setSpotBlend( jsonObj.SpotExponent / 128.0 );
    }
    return P.resolve( light );
};

osgWrapper.Texture = function ( input, texture ) {
    var jsonObj = input.getJSON();

    osgWrapper.Object( input, texture );

    if ( jsonObj.MinFilter ) texture.setMinFilter( jsonObj.MinFilter );
    if ( jsonObj.MagFilter ) texture.setMagFilter( jsonObj.MagFilter );
    if ( jsonObj.WrapT ) texture.setWrapT( jsonObj.WrapT );
    if ( jsonObj.WrapS ) texture.setWrapS( jsonObj.WrapS );

    // no file return dummy texture
    var file = jsonObj.File;
    if ( file === undefined ) {
        file = 'no-image-provided';
    }

    return input.readImageURL( file ).then( function ( img ) {
        texture.setImage( img );
        return texture;
    } );
};

osgWrapper.Projection = function ( input, node ) {
    var jsonObj = input.getJSON();
    if ( !jsonObj.Matrix )
        return P.reject();

    var promise = osgWrapper.Node( input, node );
    node.setMatrix( jsonObj.Matrix );
    return promise;
};

osgWrapper.MatrixTransform = function ( input, node ) {
    var jsonObj = input.getJSON();
    if ( !jsonObj.Matrix )
        return P.reject();

    var promise = osgWrapper.Node( input, node );
    node.setMatrix( jsonObj.Matrix );
    return promise;
};

osgWrapper.LightSource = function ( input, node ) {
    var jsonObj = input.getJSON();
    if ( !jsonObj.Light )
        return P.reject();

    var promise = osgWrapper.Node( input, node );
    return P.all( [ input.setJSON( jsonObj.Light ).readObject(), promise ] ).then( function ( args ) {
        var light = args[ 0 ];
        //var lightsource = args[ 1 ];
        node.setLight( light );
        if ( jsonObj.ReferenceFrame === 'ABSOLUTE_RF' )
            node.setReferenceFrame( TransformEnums.ABSOLUTE_RF );
        return node;
    } );
};

// not robust, but we probably don't want to complexify the function for now
osgWrapper.functionSortAttributes = function ( a, b ) {
    if ( a.indexOf( 'TexCoord' ) !== -1 && b.indexOf( 'TexCoord' ) !== -1 ) {
        return parseInt( a.substr( 8 ), 10 ) - parseInt( b.substr( 8 ), 10 );
    }

    if ( a < b ) return -1;
    if ( a > b ) return 1;
    return 0;
};

osgWrapper.Geometry = function ( input, node ) {
    var jsonObj = input.getJSON();
    if ( !jsonObj.VertexAttributeList )
        return P.reject();

    jsonObj.PrimitiveSetList = jsonObj.PrimitiveSetList || [];

    var arraysPromise = [];
    arraysPromise.push( osgWrapper.Node( input, node ) );

    var prims = node.getPrimitives();
    var cbAddPrimitives = prims.push.bind( prims );
    var i = 0;
    var l = jsonObj.PrimitiveSetList.length;
    for ( i = 0; i < l; i++ ) {
        var promisePrimitive = input.setJSON( jsonObj.PrimitiveSetList[ i ] ).readPrimitiveSet();
        arraysPromise.push( promisePrimitive );
        promisePrimitive.then( cbAddPrimitives );
    }

    var cbSetBuffer = function ( name, buffer ) {
        this.getVertexAttributeList()[ name ] = buffer;
    };

    var vList = jsonObj.VertexAttributeList;
    var keys = window.Object.keys( vList );

    // TexCoord10 should be sorted after TexCoord5 (in case of referenced attributes)
    // alternative is to resolve the referenced keys (2 passes method for example)
    keys.sort( osgWrapper.functionSortAttributes );

    l = keys.length;
    for ( i = 0; i < l; i++ ) {
        var name = keys[ i ];
        var promiseBuffer = input.setJSON( vList[ name ] ).readBufferArray();
        arraysPromise.push( promiseBuffer );
        promiseBuffer.then( cbSetBuffer.bind( node, name ) );
    }

    return P.all( arraysPromise ).then( function () {
        return node;
    } );
};

osgWrapper.PagedLOD = function ( input, plod ) {
    var jsonObj = input.getJSON();

    osgWrapper.Object( input, plod );
    // Parse center Mode
    if ( jsonObj.CenterMode === 'USE_BOUNDING_SPHERE_CENTER' )
        plod.setCenterMode( 0 );
    else if ( jsonObj.CenterMode === 'UNION_OF_BOUNDING_SPHERE_AND_USER_DEFINED' )
        plod.setCenterMode( 2 );

    // Parse center and radius
    plod.setCenter( [ jsonObj.UserCenter[ 0 ], jsonObj.UserCenter[ 1 ], jsonObj.UserCenter[ 2 ] ] );
    plod.setRadius( jsonObj.UserCenter[ 3 ] );

    // Parse RangeMode
    if ( jsonObj.RangeMode === 'PIXEL_SIZE_ON_SCREEN' )
        plod.setRangeMode( 1 );

    var str;

    // Parse Ranges
    var o = jsonObj.RangeList;

    for ( var i = 0; i < window.Object.keys( o ).length; i++ ) {
        str = 'Range ' + i;
        var v = o[ str ];
        plod.setRange( i, v[ 0 ], v[ 1 ] );
    }
    // Parse Files
    o = jsonObj.RangeDataList;
    for ( i = 0; i < window.Object.keys( o ).length; i++ ) {
        str = 'File ' + i;
        plod.setFileName( i, o[ str ] );
    }
    // Set database path from options
    // TODO: Check also if we have a path from json
    plod.setDatabasePath( input.getDatabasePath() );

    var queue = [];
    // For each url, create a function call and add it to the queue
    if ( jsonObj.Children ) {
        for ( var j = 0, k = jsonObj.Children.length; j < k; j++ ) {
            queue.push( input.setJSON( jsonObj.Children[ j ] ).readObject() );
        }
    }

    return P.all( queue ).then( function ( queueNodes ) {
        // All the results from P.all are on the argument as an array
        var len = queueNodes.length;
        for ( i = 0; i < len; i++ )
            plod.addChildNode( queueNodes[ i ] );
        return plod;
    } );
};
module.exports = osgWrapper;
