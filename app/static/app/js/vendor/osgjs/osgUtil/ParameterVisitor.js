'use strict';
var MACROUTILS = require( 'osg/Utils' );
var Notify = require( 'osg/notify' );
var Uniform = require( 'osg/Uniform' );
var NodeVisitor = require( 'osg/NodeVisitor' );

var ArraySlider = function ( params ) {
    if ( params !== undefined ) {
        if ( params.object !== undefined && params.field !== undefined ) {
            this.createInternalSlider( params );
        }
        this._uniform = this.createInternalSliderUniform( params );
    }
};

ArraySlider.prototype = {
    setTargetHTML: function ( target ) {
        this.parent = target;
    },
    addToDom: function ( content ) {
        var mydiv = document.createElement( 'div' );
        mydiv.innerHTML = content;
        this.parent.appendChild( mydiv );
    },

    getValue: function ( name ) {
        if ( window.localStorage ) {
            var value = window.localStorage.getItem( name );
            return value;
        }
        return null;
    },
    setValue: function ( name, value ) {
        if ( window.localStorage ) {
            window.localStorage.setItem( name, value );
        }
    },
    createHTMLSlider: function ( param, value, nameIndex, cbnameIndex ) {
        var input = '<div>NAME [ MIN - MAX ] <input type="range" min="MIN" max="MAX" value="VALUE" step="STEP" onchange="ONCHANGE" /><span id="UPDATE"></span></div>';
        var min = param.min;
        var max = param.max;
        var step = param.step;
        var name = nameIndex;
        var cbname = cbnameIndex;
        var onchange = cbname + '(this.value)';
        input = input.replace( /MIN/g, min );
        input = input.replace( /MAX/g, ( max + step ) );
        input = input.replace( 'STEP', step );
        input = input.replace( 'VALUE', value );
        input = input.replace( /NAME/g, name );
        input = input.replace( /UPDATE/g, cbname );
        input = input.replace( 'ONCHANGE', onchange );
        return input;
    },

    createUniformFunction: function ( param, name, index, uniform, cbnameIndex ) {
        var self = this;
        return ( function () {
            var cname = name;
            var cindex = index;
            var cuniform = uniform;
            var id = cbnameIndex;
            var func = function ( value ) {
                cuniform.get()[ cindex ] = value;
                cuniform.dirty();
                Notify.debug( cname + ' value ' + value );
                document.getElementById( cbnameIndex ).innerHTML = Number( value ).toFixed( 4 );
                self.setValue( id, value );
                if ( param.onchange !== undefined ) {
                    param.onchange( cuniform.get() );
                }
                // store the value to localstorage
            };
            return func;
        } )();
    },

    createFunction: function ( param, name, index, object, field, cbnameIndex ) {
        var self = this;
        return ( function () {
            var cname = name;
            //var cindex = index;
            var cfield = field;
            var id = cbnameIndex;
            var obj = object;
            var func = function ( value ) {
                if ( typeof ( value ) === 'string' ) {
                    value = parseFloat( value );
                }

                if ( typeof ( object[ cfield ] ) === 'number' ) {
                    obj[ cfield ] = value;
                } else {
                    obj[ cfield ][ index ] = value;
                }
                Notify.debug( cname + ' value ' + value );
                document.getElementById( cbnameIndex ).innerHTML = Number( value ).toFixed( 4 );
                self.setValue( id, value );
                if ( param.onchange !== undefined ) {
                    param.onchange( obj[ cfield ] );
                }

                // store the value to localstorage
            };
            return func;
        } )();
    },

    getCallbackName: function ( name, prgId ) {
        return 'change_' + prgId + '_' + name;
    },

    copyDefaultValue: function ( param ) {
        var uvalue = param.value;
        if ( Array.isArray( param.value ) ) {
            uvalue = param.value.slice();
        } else {
            uvalue = [ uvalue ];
        }
        return uvalue;
    },

    createInternalSliderUniform: function ( param ) {
        var uvalue = param.value;
        var uniform = param.uniform;
        if ( uniform === undefined ) {
            var type = param.type;
            type = type.charAt( 0 ).toUpperCase() + type.slice( 1 );
            uniform = Uniform[ 'create' + type ]( uvalue, param.name );
        }

        var cbname = this.getCallbackName( param.name, param.id );
        var dim = uvalue.length;
        for ( var i = 0; i < dim; i++ ) {

            var istring = i.toString();
            var nameIndex = param.name + istring;
            var cbnameIndex = cbname + istring;

            // default value
            var value = uvalue[ i ];

            // read local storage value if it exist
            var readValue = this.getValue( cbnameIndex );
            if ( readValue !== null ) {
                value = readValue;
            } else if ( param.uniform && param.uniform.get()[ i ] !== undefined ) {
                // read value from original uniform
                value = param.uniform.get()[ i ];
            }

            var dom = this.createHTMLSlider( param, value, nameIndex, cbnameIndex );
            this.addToDom( dom );
            window[ cbnameIndex ] = this.createUniformFunction( param, nameIndex, i, uniform, cbnameIndex );
            Notify.log( nameIndex + ' ' + value );
            window[ cbnameIndex ]( value );
        }
        this.uniform = uniform;
        return uniform;
    },

    createInternalSlider: function ( param ) {
        var uvalue = param.value;
        var name = param.name;
        var id = param.id;
        var dim = uvalue.length;
        var cbname = this.getCallbackName( name, id );
        var object = param.object;
        var field = param.field;
        for ( var i = 0; i < dim; i++ ) {

            var istring = i.toString();
            var nameIndex = name + istring;
            var cbnameIndex = cbname + istring;

            // default value
            var value = uvalue[ i ];

            // read local storage value if it exist
            var readValue = this.getValue( cbnameIndex );
            if ( readValue !== null ) {
                value = readValue;
            } else {
                if ( typeof object[ field ] === 'number' ) {
                    value = object[ field ];
                } else {
                    value = object[ field ][ i ];
                }
            }

            var dom = this.createHTMLSlider( param, value, nameIndex, cbnameIndex );
            this.addToDom( dom );
            window[ cbnameIndex ] = this.createFunction( param, nameIndex, i, object, field, cbnameIndex );
            Notify.log( nameIndex + ' ' + value );
            window[ cbnameIndex ]( value );
        }
    },

    createSlider: function ( param ) {
        if ( param.html !== undefined ) {
            this.setTargetHTML( param.html );
        }
        if ( param.id === undefined ) {
            param.id = param.name;
        }
        param.value = this.copyDefaultValue( param );
        if ( param.type !== undefined ) {
            return this.createInternalSliderUniform( param );
        } else {
            if ( param.object === undefined ) {
                param.object = {
                    'data': param.value
                };
                param.field = 'data';
            }
            return this.createInternalSlider( param );
        }
    }
};


var ParameterVisitor = function () {
    NodeVisitor.call( this );

    this.arraySlider = new ArraySlider();
    this.setTargetHTML( document.body );
};

ParameterVisitor.createSlider = function ( param ) {
    ( new ArraySlider() ).createSlider( param );
};

ParameterVisitor.prototype = MACROUTILS.objectInherit( NodeVisitor.prototype, {

    setTargetHTML: function ( html ) {
        this.targetHTML = html;
        this.arraySlider.setTargetHTML( this.targetHTML );
    },

    getUniformList: function ( str, map ) {

        //var txt='uniform float Power; // { min: 0.1, max: 2.0, step: 0.1, value: [0,0,0]  }';

        var re1 = '(uniform)'; // Word 1
        var re2 = '.*?'; // Non-greedy match on filler
        var re3 = '((?:[a-z][a-z]+))'; // Word 2
        var re4 = '.*?'; // Non-greedy match on filler
        var re5 = '((?:[a-z][a-z]+))'; // Word 3
        var re6 = '.*?'; // Non-greedy match on filler
        var re7 = '.'; // Uninteresting: c
        var re8 = '.*?'; // Non-greedy match on filler
        var re9 = '.'; // Uninteresting: c
        var re10 = '.*?'; // Non-greedy match on filler
        var re11 = '(.)'; // Any Single Character 1
        var re12 = '(.)'; // Any Single Character 2
        var re13 = '.*?'; // Non-greedy match on filler
        var re14 = '(\\{.*?\\})'; // Curly Braces 1

        var p = new RegExp( re1 + re2 + re3 + re4 + re5 + re6 + re7 + re8 + re9 + re10 + re11 + re12 + re13 + re14, [ 'g' ] );
        var r = str.match( p );
        var list = map;

        var createGetter = function ( value ) {
            return function () {
                return value;
            };
        };

        if ( r !== null ) {
            var re = new RegExp( re1 + re2 + re3 + re4 + re5 + re6 + re7 + re8 + re9 + re10 + re11 + re12 + re13 + re14, [ 'i' ] );
            for ( var i = 0, l = r.length; i < l; i++ ) {
                var result = r[ i ].match( re );
                //var result = p.exec(str);
                if ( result !== null ) {
                    //var word1 = result[ 1 ];
                    var type = result[ 2 ];
                    var name = result[ 3 ];
                    //var c1 = result[ 4 ];
                    //var c2 = result[ 5 ];
                    var json = result[ 6 ];

                    var param = JSON.parse( json );
                    param.type = type;
                    param.name = name;
                    var value = param.value;
                    param.value = createGetter( value );
                    list[ name ] = param;
                }
            }
        }
        return list;
    },

    getUniformFromStateSet: function ( stateSet, uniformMap ) {
        var maps = stateSet.getUniformList();
        if ( !maps ) {
            return;
        }
        var keys = window.Object.keys( uniformMap );
        for ( var i = 0, l = keys.length; i < l; i++ ) {
            var k = keys[ i ];
            // get the first one found in the tree
            if ( maps[ k ] !== undefined && uniformMap[ k ].uniform === undefined ) {
                uniformMap[ k ].uniform = maps[ k ].object;
            }
        }
    },

    findExistingUniform: function ( node, uniformMap ) {
        var BackVisitor = function () {
            NodeVisitor.call( this, NodeVisitor.TRAVERSE_PARENTS );
        };
        BackVisitor.prototype = MACROUTILS.objectInherit( NodeVisitor.prototype, {
            setUniformMap: function ( map ) {
                this.uniformMap = map;
            },
            apply: function ( node ) {
                var stateSet = node.getStateSet();
                if ( stateSet ) {
                    ParameterVisitor.prototype.getUniformFromStateSet( stateSet, this.uniformMap );
                }
                this.traverse( node );
            }
        } );
        var visitor = new BackVisitor();
        visitor.setUniformMap( uniformMap );
        node.accept( visitor );
    },

    applyProgram: function ( node, stateset ) {
        var program = stateset.getAttribute( 'Program' );
        var programName = program.getName();
        //var string = program.getVertexShader().getText();
        var uniformMap = {};
        this.getUniformList( program.getVertexShader().getText(), uniformMap );
        this.getUniformList( program.getFragmentShader().getText(), uniformMap );

        var i = 0;

        var keys = window.Object.keys( uniformMap );

        if ( programName === undefined ) {
            var hashCode = function ( str ) {
                var hash = 0;
                var chara = 0;
                if ( str.length === 0 ) {
                    return hash;
                }
                for ( i = 0; i < str.length; i++ ) {
                    chara = str.charCodeAt( i );
                    /*jshint bitwise: false */
                    hash = ( ( hash << 5 ) - hash ) + chara;
                    hash = hash & hash; // Convert to 32bit integer
                    /*jshint bitwise: true */
                }
                if ( hash < 0 ) {
                    hash = -hash;
                }
                return hash;
            };
            var str = keys.join( '' );
            programName = hashCode( str ).toString();
        }

        this.findExistingUniform( node, uniformMap );

        var addedSlider = false;
        for ( i = 0; i < keys.length; i++ ) {
            var k = keys[ i ];
            var entry = uniformMap[ k ];
            var type = entry.type;
            var name = entry.name;
            entry.id = programName;
            var uniform = this.arraySlider.createSlider( entry );
            if ( false ) {
                uniform = this.arraySlider.createSlider( {
                    name: name,
                    type: type,
                    id: programName,
                    uniform: entry.uniform
                } );
            }
            if ( entry.uniform === undefined && uniform ) {
                stateset.addUniform( uniform );
            }
            addedSlider = true;
        }

        // add a separator
        if ( addedSlider ) {
            var mydiv = document.createElement( 'div' );
            mydiv.innerHTML = '<p> </p>';
            this.targetHTML.appendChild( mydiv );
        }

        Notify.log( uniformMap );
    },


    applyStateSet: function ( node, stateset ) {
        if ( stateset.getAttribute( 'Program' ) !== undefined ) {
            this.applyProgram( node, stateset );
        }
    },

    apply: function ( node ) {
        var element = this.targetHTML;
        if ( element === undefined || element === null ) {
            return;
        }

        var st = node.getStateSet();
        if ( st !== undefined ) {
            this.applyStateSet( node, st );
        }

        this.traverse( node );
    }
} );

module.exports = ParameterVisitor;
