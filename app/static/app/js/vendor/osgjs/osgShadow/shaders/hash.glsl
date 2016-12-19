//// hash glsl

// Dave Hoskins: hash without sin
//https://www.shadertoy.com/view/4djSRW
#define MOD2 vec2(443.8975,397.2973)
//----------------------------------------------------------------------------------------
//  1 out, 1 in...
//note: normalized uniform random, [0;1[
float hash11(const in float p)
{
    vec2 p2 = fract(vec2(p) * MOD2);
    p2 += dot(p2.yx, p2.xy+19.19);
    return fract(p2.x * p2.y);
}
//note: normalized uniform random, [0;1[
//  2 out, 1 in...
float hash21(const in vec2 p)
{
    vec2 p2 = fract(p * MOD2);
    p2 += dot(p2.yx, p2.xy+19.19);
    return fract(p2.x * p2.y);
}


// Based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
// using Sin
//  1 out, 1 in...
float hashSin11( const in float n )
{
    return fract(sin(n)*43758.5453);
}

//note: normalized uniform random, [0;1[
//  2 out, 1 in...
float hashSin21( const in vec2 n ) {
    return fract(sin(dot(n.xy, vec2(12.9898, 78.233)))* 43758.5453);
}

// note: [-1;1]
// iq: https://www.shadertoy.com/view/Xsl3Dl
// note: value noise
//  2 out, 2 in...
vec2 hashSin22( const in vec2 n )
{
    return fract(sin(dot(n.xy, vec2(12.9898, 78.233)))* vec2(43758.5453,35458.5734));
}
//  3 out, 3 in...
vec3 hashSin33( in vec3 p )
{
    p = vec3( dot(p,vec3(127.1,311.7, 74.7)),
              dot(p,vec3(269.5,183.3,246.1)),
              dot(p,vec3(113.5,271.9,124.6)));
    return fract(sin(p)*43758.5453123);
}

// Returns a random number based on a vec3 and an int.
float hashSin41(const in vec4 seed){
    return fract(sin(dot(seed, vec4(12.9898,78.233,45.164,94.673)) * 43758.5453));
}

/////// end hash
