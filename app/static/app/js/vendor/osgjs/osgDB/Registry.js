'use strict';

var Notify = require( 'osg/notify' );

/**
 * This is a very simplistic version of the OSG registry, we could
 * expand/improve it in the future
 */

var Registry = {

    instance: function () {
        if ( !Registry._instance ) {
            Registry._instance = Registry;
            Registry._instance.plugins = new window.Map();
        }
        return Registry._instance;
    },

    // We register directly a plugin for a extension.
    addReaderWriter: function ( extension, plugin ) {
        if ( Registry.instance().plugins.get( extension ) !== undefined )
            Notify.warn( 'the \'' + extension + '\' plugin already exists' );
        Registry.instance().plugins.set( extension, plugin );
    },

    getReaderWriterForExtension: function ( name ) {
        return Registry.instance().plugins.get( name );
    }
};


module.exports = Registry;
