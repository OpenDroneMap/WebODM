'use strict';
var PrimitiveSet = {};
PrimitiveSet.POINTS = 0x0000;
PrimitiveSet.LINES = 0x0001;
PrimitiveSet.LINE_LOOP = 0x0002;
PrimitiveSet.LINE_STRIP = 0x0003;
PrimitiveSet.TRIANGLES = 0x0004;
PrimitiveSet.TRIANGLE_STRIP = 0x0005;
PrimitiveSet.TRIANGLE_FAN = 0x0006;

module.exports = PrimitiveSet;
