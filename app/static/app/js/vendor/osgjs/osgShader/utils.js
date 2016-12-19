'use strict';

var sprintf = function ( string, args ) {
    if ( !string || !args ) {
        return '';
    }

    var arg;

    for ( var index in args ) {
        arg = args[ index ];

        if ( arg === undefined )
            continue;

        if ( arg.getVariable ) {
            arg = arg.getVariable();
        }
        string = string.replace( '%s', arg );
    }
    return string;
};


var checkVariableType = function ( vars, optionalPrefix ) {

    var inputs = vars;
    var varsList = [];
    var prefix = optionalPrefix;
    if ( optionalPrefix === undefined ) {
        prefix = '';
    }

    for ( var i = 0, l = inputs.length; i < l; i++ ) {

        var variable = inputs[ i ];
        var output;

        if ( variable === undefined ) {
            output = 'undefined';
        } else if ( typeof variable === 'string' ) {
            output = variable;
        } else if ( variable.getType ) {
            output = variable.getType() + ' ' + variable.getVariable();
        } else {
            output = variable.getVariable();
        }

        varsList.push( prefix + output );
    }

    return varsList;

};


// call glsl function
// generate a string with output = funcName ( inputs )
// useful when debuging to print inputs / outputs
// TODO check type of arguments with regexp in glsl
// shader function regex
// [\r\n]\s[(vec4)|(vec3)|(vec2)|(float)|(bool)|(int)].*\(.*[.|\r\n]*\).*[\r\n]*{
// doesn't handle multiline
// then split(',')
// then substring (out,in)
// then type matching
// (works by hand here.)
// for instance, gather types from input and compare themt to glsl decl
// var inputTypes = [
//             'vec4',
//             'vec4',
//             'sampler2D',
//             'vec4',
//             'vec4',
//             'vec3',
//             'float',
//             'vec3',
//             'float',
//             'float',
//             'float',
//             'float',
//             'float'
//         ];
//         console.assert( inputs.length === inputTypes.length );
//         var i = inputs.length;
//         while ( i-- ) {
//             console.assert( inputs[ i ]._type === inputTypes[ i ], inputs[ i ]._prefix );
//         }
var callFunction = function ( funcName, output, inputs ) {

    var osgShader = require( 'osgShader/osgShader' );

    var debug = [];
    var callString = '';

    // debug
    if ( osgShader.debugShaderNode ) {
        debug.push( '\n// output' );
        Array.prototype.push.apply( debug, checkVariableType( [ output ], '// ' ) );
    }

    if ( output ) {
        if ( output.getVariable )
            output = output.getVariable();
        callString = output + ' = ';
    }

    callString = callString + funcName + '( ';

    if ( inputs && inputs.length > 0 ) {

        // debug
        if ( osgShader.debugShaderNode ) {
            debug.push( '// inputs' );
            Array.prototype.push.apply( debug, checkVariableType( inputs, '// ' ) );
        }

        for ( var i = 0, l = inputs.length; i < l; i++ ) {

            // check if it's a variable and not a constant
            if ( inputs[ i ].getVariable )
                callString += inputs[ i ].getVariable();
            else
                callString += inputs[ i ];

            if ( i !== l - 1 )
                callString += ', ';
        }
    }

    callString += ' );\n';

    if ( osgShader.debugShaderNode )
        return debug.join( '\n' ) + '\n' + callString;

    return callString;
};


module.exports = {
    callFunction: callFunction,
    checkVariableType: checkVariableType,
    sprintf: sprintf
};
