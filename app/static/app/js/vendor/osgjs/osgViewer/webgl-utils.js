// jshint ignore: start

/*
 * Copyright 2010, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains functions every webgl program will need
 * a version of one way or another.
 *
 * Instead of setting up a context manually it is recommended to
 * use. This will check for success or failure. On failure it
 * will attempt to present an approriate message to the user.
 *
 *       gl = WebGLUtils.setupWebGL(canvas);
 *
 * For animated WebGL apps use of setTimeout or setInterval are
 * discouraged. It is recommended you structure your rendering
 * loop like this.
 *
 *       function render() {
 *         window.requestAnimationFrame(render, canvas);
 *
 *         // do rendering
 *         ...
 *       }
 *       render();
 *
 * This will call your rendering function up to the refresh rate
 * of your display but will stop rendering if your app is not
 * visible.
 */

'use strict';
var WebGLUtils = function () {

    /**
     * Creates the HTLM for a failure message
     * @param {string} canvasContainerId id of container of th
     *        canvas.
     * @return {string} The html.
     */
    var makeFailHTML = function ( msg ) {
        return '' +
            '<div style="margin: auto; width:500px;z-index:10000;margin-top:20em;text-align:center;">' + msg + '</div>';
        // return '' +
        //   '<table style="background-color: #8CE; width: 100%; height: 100%;"><tr>' +
        //   '<td align="center">' +
        //   '<div style="display: table-cell; vertical-align: middle;">' +
        //   '<div style="">' + msg + '</div>' +
        //   '</div>' +
        //   '</td></tr></table>';
    };

    /**
     * Mesasge for getting a webgl browser
     * @type {string}
     */
    var GET_A_WEBGL_BROWSER = '' +
        'This page requires a browser that supports WebGL.<br/>' +
        '<a href="http://get.webgl.org">Click here to upgrade your browser.</a>';

    /**
     * Mesasge for need better hardware
     * @type {string}
     */
    var OTHER_PROBLEM = '' +
        "It doesn't appear your computer can support WebGL.<br/>" +
        '<a href="http://get.webgl.org">Click here for more information.</a>';

    /**
     * Creates a webgl context. If creation fails it will
     * change the contents of the container of the <canvas>
     * tag to an error message with the correct links for WebGL.
     * @return {WebGLRenderingContext} The created context.
     */
    var setupWebGL = function (
        /** Element */
        canvas,
        /** WebGLContextCreationAttirbutes */
        opt_attribs,
        /** function:(msg) */
        opt_onError ) {
        function handleCreationError( msg ) {
            if ( msg.indexOf( 'WebGL2' ) !== -1 ) return;
            var container = document.getElementsByTagName( "body" )[ 0 ];
            //var container = canvas.parentNode;
            if ( container ) {
                var str = window.WebGLRenderingContext ?
                    OTHER_PROBLEM :
                    GET_A_WEBGL_BROWSER;
                if ( msg ) {
                    str += "<br/><br/>Status: " + msg;
                }
                container.innerHTML = makeFailHTML( str );
            }
        }

        opt_onError = opt_onError || handleCreationError;

        if ( canvas.addEventListener ) {
            canvas.addEventListener( "webglcontextcreationerror", function ( event ) {
                opt_onError( event.statusMessage );
            }, false );
        }
        var context = create3DContext( canvas, opt_attribs );
        if ( !context ) {
            //if ( !window.WebGLRenderingContext )
            opt_onError( "" );
        }

        return context;
    };

    /**
     * Creates a webgl context.
     * @param {!Canvas} canvas The canvas tag to get context
     *     from. If one is not passed in one will be created.
     * @return {!WebGLContext} The created context.
     */
    var create3DContext = function ( canvas, opt_attribs ) {

        // only try to enable if URl options ?webgl2=1
        var names = [];
        if ( opt_attribs && opt_attribs.webgl2 ) {
            names = names.concat( [ "webgl2", "experimental-webgl2" ] );
        }
        names = names.concat( [ "webgl", "experimental-webgl", "webkit-3d", "moz-webgl" ] );

        var context = null;
        for ( var ii = 0; ii < names.length; ++ii ) {
            try {
                context = canvas.getContext( names[ ii ], opt_attribs );
            } catch ( e ) {}
            if ( context ) {
                break;
            }
        }
        return context;
    };

    return {
        create3DContext: create3DContext,
        setupWebGL: setupWebGL
    };
}();

/**
 * Provides requestAnimationFrame in a cross browser
 * way.
 */
if ( !window.requestAnimationFrame ) {
    window.requestAnimationFrame = ( function () {
        return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function ( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element ) {
                window.setTimeout( callback, 1000 / 60 );
            };
    } )();
}

if ( !window.cancelRequestAnimFrame ) {
    window.cancelRequestAnimFrame = ( function () {
        return window.cancelAnimationFrame ||
            window.webkitCancelRequestAnimationFrame ||
            window.mozCancelRequestAnimationFrame ||
            window.oCancelRequestAnimationFrame ||
            window.msCancelRequestAnimationFrame ||
            clearTimeout;
    } )();
}

if ( !Date.now ) {
    Date.now = function now() {
        return new Date().getTime();
    };
}

module.exports = WebGLUtils;
