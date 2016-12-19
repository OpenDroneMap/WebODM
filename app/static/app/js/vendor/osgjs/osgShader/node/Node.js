'use strict';
var Notify = require( 'osg/notify' );

var instance = 0;
var Node = function () {
    this._name = 'AbstractNode';
    this._inputs = [];
    this._outputs = null;

    // category of node
    // same name implies same
    // define/function
    //this.type = '';

    // uuid: unicity
    // allows multipe node of same type
    // declaring multipe code paths
    // inside the main
    this._id = instance++;

    this._text = undefined;
};

Node.prototype = {

    getID: function () {
        return this._id;
    },
    getName: function () {
        return this._name;
    },

    getType: function () {
        return this.type;
    },

    toString: function () {
        var str = 'name : ' + this._name;
        if ( this.type ) str += ' (' + this.type + ')';
        return str;
    },

    getInputs: function () {
        return this._inputs;
    },

    getOutputs: function () {
        return this._outputs;
    },

    checkInputsOutputs: function () {

        var i, key;
        if ( this.validInputs ) {

            for ( i = 0; i < this.validInputs.length; i++ ) {
                key = this.validInputs[ i ];
                if ( !this._inputs[ key ] ) {
                    Notify.error( 'Shader node ' + this.type + ' validation error input ' + key + ' is missing' );
                    return false;
                }
            }
        }

        if ( this.validOutputs ) {

            for ( i = 0; i < this.validOutputs.length; i++ ) {
                key = this.validOutputs[ i ];
                if ( !this._outputs[ key ] ) {
                    Notify.error( 'Shader node ' + this.type + ' validation error output ' + key + ' is missing' );
                    return false;
                }
            }
        }

        return true;
    },

    // accepts inputs like that:
    // inputs( [ a, b, c , d] )
    // inputs( { a: x, b: y } )
    // inputs( a, b, c, d )
    inputs: function () {
        // handle inputs ( a, b, c, d)
        for ( var i = 0, l = arguments.length; i < l; i++ ) {

            var input = arguments[ i ];
            if ( !input ) {
                Notify.error( 'Shader node ' + this.type + ' input number ' + l + ' is undefined ' );
                break;
            }

            // handle inputs( [a, b, c ,d] )
            if ( Array.isArray( input ) ) {

                this.inputs.apply( this, input );
                return this;

                // check for an object {} and not something from base class Node
            } else if ( typeof input === 'object' && input !== null && ( input instanceof Node === false ) ) {
                this._inputs = input;
                return this;

            } else { // add argument to the array
                this._inputs.push( input );
            }
        }

        return this;
    },

    // accepts inputs like that:
    // outputs( { a: x, b: y } )
    // outputs( a )
    outputs: function ( outputs ) {

        this._outputs = outputs;

        // single output
        if ( this._outputs instanceof Node === true ) {

            this.autoLink( this._outputs );

        } else {

            // iterate on objects keys
            var keys = window.Object.keys( this._outputs );
            for ( var i = 0; i < keys.length; i++ ) {
                var key = keys[ i ];
                this.autoLink( this._outputs[ key ] );
            }
        }

        return this;
    },

    autoLink: function ( output ) {

        if ( output === undefined )
            return this;

        output.inputs( this );

        return this;
    },

    computeShader: function () {
        return this._text;
    },

    comment: function ( txt ) {
        this._comment = '//' + txt;
    },

    getComment: function () {
        return this._comment;
    }
};


module.exports = Node;
