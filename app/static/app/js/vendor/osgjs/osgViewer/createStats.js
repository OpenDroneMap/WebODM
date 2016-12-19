'use strict';

var MACROUTILS = require( 'osg/Utils' );
var BrowserStats = window.BrowserStats;
var glStats = window.glStats;
var rStats = window.rStats;

var CanvasStats = function ( opts ) {

    this.bS = new BrowserStats();
    this.glS = new glStats();

    var values = {
        frame: {
            caption: 'Total frame time (ms)',
            over: 16,
            average: true
        },
        fps: {
            caption: 'Framerate (FPS)',
            below: 30
        },
        calls: {
            caption: 'Calls (three.js)',
            over: 3000
        },
        raf: {
            caption: 'Time since last rAF (ms)',
            average: true,
            avgMs: 500
        },
        rstats: {
            caption: 'rStats update (ms)',
            average: true,
            avgMs: 100
        },
        update: {
            caption: 'update',
            average: true
        },
        cull: {
            caption: 'cull',
            average: true
        },
        render: {
            caption: 'render',
            average: true
        },
        glframe: {
            caption: 'glframe',
            average: true
        },

        textureused: {
            caption: 'texture used'
        },
        texturereserved: {
            caption: 'texture reserved'
        },
        texturetotal: {
            caption: 'texture total'
        },

        pushstateset: {
            caption: 'num pushStateSet'
        },
        updatecallback: {
            caption: 'num updateCallback'
        },

        cullcamera: {
            caption: 'camera'
        },
        cullmatrixtransform: {
            caption: 'matrixTransform'
        },
        cullprojection: {
            caption: 'projection'
        },
        cullnode: {
            caption: 'node'
        },
        culllightsource: {
            caption: 'lightSource'
        },
        cullgeometry: {
            caption: 'geometry'
        }
    };

    var fractions = [ {
        base: 'frame',
        steps: [ 'update', 'cull', 'render' ]
    } ];

    var groups = [ {
        caption: 'Framerate',
        values: [ 'fps', 'raf' ]
    }, {
        caption: 'Frame Budget',
        values: [ 'frame', 'update', 'cull', 'render', 'glframe' ]
    }, {
        caption: 'Scene Graph',
        values: [ 'pushstateset', 'updatecallback' ]
    }, {
        caption: 'Cull',
        values: [ 'cullnode', 'cullmatrixtransform', 'cullgeometry', 'cullcamera', 'culllighsource', 'cullprojection' ]
    }, {
        caption: 'Texture Memory',
        values: [ 'texturereserved', 'textureused', 'texturetotal' ]
    } ];

    var plugins = [ this.bS, this.glS ];

    if ( opts ) {
        if ( opts.values ) MACROUTILS.objectMix( values, opts.values );
        if ( opts.groups ) Array.prototype.unshift.apply( groups, opts.groups );
        if ( opts.fractions ) Array.prototype.push.apply( fractions, opts.fractions );
        if ( opts.plugins ) Array.prototype.push.apply( plugins, opts.plugins );
    }

    this.rStats = new rStats( {
        values: values,
        groups: groups,
        fractions: fractions,
        plugins: plugins,
        colours: [ '#cc9933', '#f20041', '#69818c', '#d90074', '#b6f2ee', '#660044', '#50664d', '#330022', '#f2eeb6', '#ee00ff', '#806460', '#1600a6', '#994d57', '#00004d', '#f279da', '#002933', '#395073', '#00eeff', '#79baf2', '#008066', '#79f2aa', '#00ff66', '#1a331d', '#004d14', '#8c6c46', '#388c00', '#602080', '#ff8800', '#6d3df2', '#995200', '#0d1233', '#402200', '#3d6df2', '#330e00', '#e6f23d', '#730000' ]
    } );

};

var createStats = function ( options ) {
    // in case the deps are not here
    if ( !rStats ) return undefined;


    var css = '.rs-base{ position: absolute; z-index: 10000; padding: 10px; background-color: #222; font-size: 12px; line-height: 1.2em; width: 350px; font-family: \'Roboto Condensed\', tahoma, sans-serif; left: 0; top: 0; overflow: hidden; } .rs-base h1{ margin: 0; padding: 0; font-size: 1.4em; color: #fff; margin-bottom: 5px; cursor: pointer; } .rs-base div.rs-group{ margin-bottom: 10px; } .rs-base div.rs-group.hidden{ display: none; } .rs-base div.rs-fraction{ position: relative; margin-bottom: 5px; } .rs-base div.rs-fraction p{ width: 145px; text-align: right; margin: 0; padding: 0; } .rs-base div.rs-legend{ position: absolute; line-height: 1em; } .rs-base div.rs-counter-base{ position: relative; margin: 2px 0; height: 1em; } .rs-base span.rs-counter-id{ position: absolute; left: 0; top: 0; } .rs-base div.rs-counter-value{ position: absolute; left: 115px; width: 30px; height: 1em; top: 0; text-align: right; } .rs-base canvas.rs-canvas{ position: absolute; right: 0; } ',
        head = document.head || document.getElementsByTagName( 'head' )[ 0 ],
        style = document.createElement( 'style' );

    style.type = 'text/css';
    if ( style.styleSheet ) {
        style.styleSheet.cssText = css;
    } else {
        style.appendChild( document.createTextNode( css ) );
    }
    head.appendChild( style );

    return new CanvasStats( options.rstats );
};

module.exports = createStats;
