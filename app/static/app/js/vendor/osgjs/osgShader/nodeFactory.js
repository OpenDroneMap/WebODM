'use strict';
var Notify = require( 'osg/notify' );
var skinning = require( 'osgShader/node/skinning' );
var data = require( 'osgShader/node/data' );
var functions = require( 'osgShader/node/functions' );
var lights = require( 'osgShader/node/lights' );
var shadows = require( 'osgShader/node/shadows' );
var operations = require( 'osgShader/node/operations' );
var textures = require( 'osgShader/node/textures' );
var morph = require( 'osgShader/node/morph' );
var billboard = require( 'osgShader/node/billboard' );

var Factory = function () {

    this._nodes = new window.Map();

    this.registerNodes( skinning );
    this.registerNodes( data );
    this.registerNodes( textures );
    this.registerNodes( functions );
    this.registerNodes( lights );
    this.registerNodes( morph );
    this.registerNodes( shadows );
    this.registerNodes( operations );
    this.registerNodes( billboard );
};

Factory.prototype = {

    registerNodes: function ( obj ) {
        var self = this;
        window.Object.keys( obj ).forEach( function ( key ) {
            self.registerNode( key, obj[ key ] );
        } );
    },

    registerNode: function ( name, constructor ) {

        if ( this._nodes.has( name ) ) {
            Notify.warn( 'Node ' + name + ' already registered' );
        }
        this._nodes.set( name, constructor );

    },
    // extra argument are passed to the constructor of the node
    getNode: function ( name ) {

        var Constructor = this._nodes.get( name );
        if ( !Constructor ) {
            // Means either:
            // - the node isn't registered by methods above
            // - you mistyped the name
            // - Core Node has changed its Name
            Notify.warn( 'Node ' + name + ' does not exist' );
            return undefined;
        }

        // call a constructor with array arguments
        // http://www.ecma-international.org/ecma-262/5.1/#sec-13.2.2
        var instance = window.Object.create( Constructor.prototype );
        Constructor.apply( instance, Array.prototype.slice.call( arguments, 1 ) );

        return instance;
    }

};

var instance = new Factory();

module.exports = instance;
