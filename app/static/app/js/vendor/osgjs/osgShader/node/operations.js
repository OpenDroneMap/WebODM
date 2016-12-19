'use strict';
var Notify = require( 'osg/notify' );
var MACROUTILS = require( 'osg/Utils' );
var Node = require( 'osgShader/node/Node' );
var utils = require( 'osgShader/utils' );

var sprintf = utils.sprintf;

// Abstract class
// base operator contains helper for the constructor
// it helps to do that:
// arg0 = output
// arg1 = input0 or [ inputs ]
// arg2 = input1
// ...
var BaseOperator = function () {
    Node.call( this );
};

BaseOperator.prototype = Node.prototype;


// Add support this syntax:
// new Add( output, input0, input1, ... )
// new Add( output, [ inputs ] )
// glsl code output = input0 + input1 +...
var Add = function () {
    BaseOperator.call( this );
};

Add.prototype = MACROUTILS.objectInherit( BaseOperator.prototype, {

    type: 'Add',

    operator: '+',

    computeShader: function () {
        // force inputs type to be all the same from the output
        var outputType = this._outputs.getType();
        var addType = '';

        if ( outputType === 'vec4' )
            addType = '.rgba';
        else if ( outputType === 'vec3' )
            addType = '.rgb';
        else if ( outputType === 'vec2' )
            addType = '.rg';


        var str = this._outputs.getVariable() + ' = ' + this._inputs[ 0 ].getVariable() + addType;
        for ( var i = 1, l = this._inputs.length; i < l; i++ ) {
            var input = this._inputs[ i ];
            str += this.operator + input.getVariable();
            // special var case that doesn't need any postfix
            if ( input.getType() !== 'float' )
                str += addType;
        }
        str += ';';
        return str;
    }
} );



// Mult works like Add
// glsl code output = input0 * input1 * ...
var Mult = function () {
    Add.call( this );
};

Mult.prototype = MACROUTILS.objectInherit( Add.prototype, {
    type: 'Mult',
    operator: '*'
} );

// basic assignement alias: output = input
// glsl code output = input0
var SetFromNode = function () {
    Add.call( this );
};
SetFromNode.prototype = MACROUTILS.objectInherit( Add.prototype, {
    type: 'SetFromNode'
} );

// Mult Matrix * vector4
// making the cast vector4(input.xyz, 0)
// if needed
// glsl code output = matrix * vector4(vec.xyz, 0)
var MatrixMultDirection = function () {
    Add.call( this );
    this._overwriteW = true; // if set to false, we copy the input alpha in the output alpha
    this._forceComplement = true;
    this._inverseOp = false;
};

MatrixMultDirection.prototype = MACROUTILS.objectInherit( Add.prototype, {
    type: 'MatrixMultDirection',
    operator: '*',
    validInputs: [ 'vec', 'matrix' ],
    validOutputs: [ 'vec' ],
    complement: '0.',
    setInverse: function ( bool ) {
        this._inverseOp = bool;
        return this;
    },
    setForceComplement: function ( bool ) {
        this._forceComplement = bool;
        return this;
    },
    setOverwriteW: function ( bool ) {
        this._overwriteW = bool;
        return this;
    },
    computeShader: function () {
        // force inputs type to be all the same from the output
        // and handle vector complement
        var vecIn = this._inputs.vec.getVariable();
        var matrix = this._inputs.matrix.getVariable();
        var vecOut = this._outputs.vec.getVariable();

        var inputType = this._inputs.vec.getType();
        var outputType = this._outputs.vec.getType();

        var strOut = vecOut + ' = ';

        if ( outputType !== 'vec4' )
            strOut += outputType + '(';

        var strCasted = vecIn;
        if ( this._forceComplement || inputType !== 'vec4' )
            strCasted = 'vec4(' + vecIn + '.xyz, ' + this.complement + ')';

        strOut += this._inverseOp ? strCasted + this.operator + matrix : matrix + this.operator + strCasted;

        if ( outputType !== 'vec4' )
            strOut += ')';

        strOut += ';';

        if ( !this._overwriteW && inputType === 'vec4' )
            strOut += '\n' + vecOut + '.a = ' + vecIn + '.a;';

        return strOut;
    }
} );

// override only for complement.
// glsl code output = matrix * vector4(vec.xyz, 1)
var MatrixMultPosition = function () {
    MatrixMultDirection.call( this );
    this._forceComplement = false;
};
MatrixMultPosition.prototype = MACROUTILS.objectInherit( MatrixMultDirection.prototype, {
    type: 'MatrixMultPosition',
    complement: '1.'
} );

// For all you custom needs.
//
// call Code() with variable input/output replace
// indexed by the '%'
// getNode( 'InlineCode' ).code( '%out = %input;' ).inputs( {
//             input: this.getOrCreateConstant( 'float', 'unitFloat' ).setValue( '1.0' )
//        } ).outputs( {
//            out: this.getNode( 'glPointSize' )
// }
//
var InlineCode = function () {
    Node.call( this );
};

InlineCode.prototype = MACROUTILS.objectInherit( Node.prototype, {
    type: 'InlineCode',
    code: function ( txt ) {
        this._text = txt;
        return this;
    },
    computeShader: function () {

        // merge inputs and outputs dict to search in both
        var replaceVariables = MACROUTILS.objectMix( {}, this._inputs );
        replaceVariables = MACROUTILS.objectMix( replaceVariables, this._outputs );

        // find all %string
        var r = new RegExp( '%[A-Za-z0-9_]+', 'gm' );
        var text = this._text;
        var result = this._text.match( r );

        var done = new Set(); // keep trace of replaced string

        for ( var i = 0; i < result.length; i++ ) {

            var str = result[ i ].substr( 1 );
            if ( !done.has( str ) ) {
                if ( !replaceVariables[ str ] ) {
                    Notify.error( 'error with inline code\n' + this._text );
                    Notify.error( 'input ' + str + ' not provided for ' + result[ i ] );
                }
                var reg = new RegExp( result[ i ].toString(), 'gm' );
                text = text.replace( reg, replaceVariables[ str ].getVariable() );
                done.add( str );
            }
        }

        return text;
    }
} );


// glsl code  output = vec4( color.rgb, alpha )
var SetAlpha = function () {
    BaseOperator.call( this );
};

SetAlpha.prototype = MACROUTILS.objectInherit( BaseOperator.prototype, {
    type: 'SetAlpha',
    validInputs: [ 'color', 'alpha' ],
    validOuputs: [ 'color' ],
    computeShader: function () {
        var alpha = this._inputs.alpha;
        return sprintf( '%s = vec4( %s.rgb, %s );', [
            this._outputs.color.getVariable(),
            this._inputs.color.getVariable(),
            alpha.getType() !== 'float' ? alpha.getVariable() + '.a' : alpha.getVariable()
        ] );
    }
} );



// alpha is optional, if not provided the following operation is generated:
// glsl code output.rgb = color.rgb * color.a;
var PreMultAlpha = function () {
    BaseOperator.call( this );
};

// TODO put the code in glsl
PreMultAlpha.prototype = MACROUTILS.objectInherit( BaseOperator.prototype, {

    type: 'PreMultAlpha',
    validInputs: [ 'color' /*,'alpha'*/ ],
    validOuputs: [ 'color' ],

    computeShader: function () {
        var variable = this._inputs.alpha !== undefined ? this._inputs.alpha : this._inputs.color;

        var srcAlpha;
        if ( variable.getType() !== 'float' )
            srcAlpha = variable.getVariable() + '.a';
        else
            srcAlpha = variable.getVariable();

        return sprintf( '%s.rgb = %s.rgb * %s;', [
            this._outputs.color.getVariable(),
            this._inputs.color.getVariable(),
            srcAlpha
        ] );
    }
} );

module.exports = {
    BaseOperator: BaseOperator,
    Mult: Mult,
    MatrixMultPosition: MatrixMultPosition,
    MatrixMultDirection: MatrixMultDirection,
    Add: Add,
    InlineCode: InlineCode,
    SetAlpha: SetAlpha,
    SetFromNode: SetFromNode,
    PreMultAlpha: PreMultAlpha
};
