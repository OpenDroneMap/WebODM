'use strict';

var pkg = require( 'json!./package.json' );

module.exports = {
    name: pkg.name,
    version: pkg.version,
    author: pkg.author
};
