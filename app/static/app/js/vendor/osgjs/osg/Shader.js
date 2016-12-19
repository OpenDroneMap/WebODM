'use strict';
var Notify = require( 'osg/notify' );
var MACROUTILS = require( 'osg/Utils' );
var Timer = require( 'osg/Timer' );
var GLObject = require( 'osg/GLObject' );


/**
 * Shader manage shader for vertex and fragment, you need both to create a glsl program.
 * @class Shader
 */
var Shader = function ( type, text ) {
    GLObject.call( this );
    var t = type;
    if ( typeof ( type ) === 'string' ) {
        t = Shader[ type ];
    }
    this.type = t;
    this.setText( text );
};

Shader.VERTEX_SHADER = 0x8B31;
Shader.FRAGMENT_SHADER = 0x8B30;

// Debug Pink shader for when shader fails
Shader.VS_DBG = 'attribute vec3 Vertex;uniform mat4 uModelViewMatrix;uniform mat4 uProjectionMatrix;void main(void) {  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(Vertex, 1.0);}';
Shader.FS_DBG = 'precision lowp float; void main(void) { gl_FragColor = vec4(1.0, 0.6, 0.6, 1.0);}';

var debugName = '\n#define SHADER_NAME FailSafe\n';
Shader.VS_DBG += debugName;
Shader.FS_DBG += debugName;


// static cache of glShaders flagged for deletion, which will actually
// be deleted in the correct GL context.
Shader._sDeletedGLShaderCache = new window.Map();

// static method to delete Program
Shader.deleteGLShader = function ( gl, shader ) {
    if ( !Shader._sDeletedGLShaderCache.has( gl ) )
        Shader._sDeletedGLShaderCache.set( gl, [] );
    Shader._sDeletedGLShaderCache.get( gl ).push( shader );
};

// static method to flush all the cached glShaders which need to be deleted in the GL context specified
Shader.flushDeletedGLShaders = function ( gl, availableTime ) {
    // if no time available don't try to flush objects.
    if ( availableTime <= 0.0 ) return availableTime;
    if ( !Shader._sDeletedGLShaderCache.has( gl ) ) return availableTime;
    var elapsedTime = 0.0;
    var beginTime = Timer.instance().tick();
    var deleteList = Shader._sDeletedGLShaderCache.get( gl );
    var numShaders = deleteList.length;
    for ( var i = numShaders - 1; i >= 0 && elapsedTime < availableTime; i-- ) {
        gl.deleteShader( deleteList[ i ] );
        deleteList.splice( i, 1 );
        elapsedTime = Timer.instance().deltaS( beginTime, Timer.instance().tick() );
    }
    return availableTime -= elapsedTime;
};

Shader.flushAllDeletedGLShaders = function ( gl ) {
    if ( !Shader._sDeletedGLShaderCache.has( gl ) ) return;
    var deleteList = Shader._sDeletedGLShaderCache.get( gl );
    var numShaders = deleteList.length;
    for ( var i = numShaders - 1; i >= 0; i-- ) {
        gl.deleteShader( deleteList[ i ] );
        deleteList.splice( i, 1 );
    }
    return;
};

/** @lends Shader.prototype */
Shader.prototype = MACROUTILS.objectInherit( GLObject.prototype, {
    setText: function ( text ) {
        this.text = text;
    },
    getText: function () {
        return this.text;
    },
    // this is where it creates a fail safe shader that should work everywhere
    failSafe: function ( gl ) {
        this.shader = gl.createShader( this.type );
        gl.shaderSource( this.shader, this.type === Shader.VERTEX_SHADER ? Shader.VS_DBG : Shader.FS_DBG );
        gl.compileShader( this.shader );
    },
    // webgl shader compiler error to source contextualization
    // for better console log messages
    processErrors: function ( errors, source ) {
        // regex to extract error message and line from webgl compiler reporting
        var r = /ERROR: [\d]+:([\d]+): (.+)/gmi;
        // split sources in indexable per line array
        var lines = source.split( '\n' );
        var linesLength = lines.length;
        if ( linesLength === 0 ) return;

        var i, m;

        // IE reporting is not the same
        if ( r.exec( errors ) === null ) {
            r = /Shader compilation errors\n\((\d+)\, \d+\): (.+)/gmi;
        }

        // reset index to start.
        r.lastIndex = 0;

        while ( ( m = r.exec( errors ) ) != null ) {
            if ( m.index === r.lastIndex ) {
                r.lastIndex++; // moving between errors
            }
            // get error line
            var line = parseInt( m[ 1 ] );

            if ( line > linesLength ) continue;
            // webgl error report.
            Notify.error( 'ERROR ' + m[ 2 ] + ' in line ' + line );

            var minLine = Math.max( 0, line - 7 );
            var maxLine = Math.max( 0, line - 2 );
            // for context
            // log surrounding line priori to error with bof check
            for ( i = minLine; i <= maxLine; i++ ) {
                Notify.warn( lines[ i ].replace( /^[ \t]+/g, '' ) );
            }

            // Warn adds a lovely /!\ icon in front of the culprit line
            maxLine = Math.max( 0, line - 1 );
            Notify.error( lines[ maxLine ].replace( /^[ \t]+/g, '' ) );

            minLine = Math.min( linesLength, line );
            maxLine = Math.min( linesLength, line + 5 );
            // for context
            // surrounding line posterior to error (with eof check)
            for ( i = minLine; i < maxLine; i++ ) {
                Notify.warn( lines[ i ].replace( /^[ \t]+/g, '' ) );
            }
        }
    },

    compile: function ( gl ) {
        if ( !this._gl ) this.setGraphicContext( gl );
        this.shader = gl.createShader( this.type );

        var shaderText = this.text;
        if ( Shader.enableGLSLOptimizer && Shader.glslOptimizer ) {
            var shaderTypeString = this.type === Shader.VERTEX_SHADER ? 'vertex' : 'fragment';
            Notify.infoFold( shaderTypeString + ' shader before optimization', shaderText );
            // 1: opengl
            // 2: opengl es 2.0
            // 3: opengl es 3.0
            var optimized = Shader.glslOptimizer( shaderText, '2', this.type === Shader.VERTEX_SHADER );
            if ( optimized.indexOf( 'Error:' ) !== -1 ) {
                Notify.error( optimized );
            } else if ( optimized.length <= 1 ) {
                Notify.warnFold( 'glsl optimizer returned an empty shader, the original will be used', shaderText );
            } else {
                Notify.infoFold( shaderTypeString + ' shader after optimization', optimized );
                shaderText = optimized;
            }
        }

        gl.shaderSource( this.shader, shaderText );
        MACROUTILS.timeStamp( 'osgjs.metrics:compileShader' );
        gl.compileShader( this.shader );
        if ( !gl.getShaderParameter( this.shader, gl.COMPILE_STATUS ) && !gl.isContextLost() ) {

            var err = gl.getShaderInfoLog( this.shader );
            this.processErrors( err, shaderText );

            var tmpText = '\n' + shaderText;
            var splittedText = tmpText.split( '\n' );
            var newText = '\n';
            for ( var i = 0, l = splittedText.length; i < l; ++i ) {
                newText += i + ' ' + splittedText[ i ] + '\n';
            }
            // still logging whole source but folded
            Notify.debugFold( 'can\'t compile shader', newText );

            return false;
        }
        return true;
    },
    releaseGLObjects: function () {
        if ( this._gl !== undefined ) {
            Shader.deleteGLShader( this._gl, this.shader );
        }
        this.shader = undefined;
    }
} );

Shader.create = function ( type, text ) {
    Notify.log( 'Shader.create is deprecated, use new Shader with the same arguments instead' );
    return new Shader( type, text );
};

module.exports = Shader;
