
#pragma include "colorEncode.glsl"

// see shadowSettings.js header for shadow algo param explanations

#ifdef _EVSM
// Convert depth to EVSM coefficients
// Input depth should be in [0, 1]
vec2 warpDepth(const in float depth, const in vec2 exponents) {
    float pos =  exp( exponents.x * depth);
    float neg = -exp(-exponents.y * depth);
    return vec2(pos, neg);
}

// Convert depth value to EVSM representation
vec4 shadowDepthToEVSM(const in float depth, const in float expo0, const in float expo1) {
    vec2 warpedDepth = warpDepth(depth, vec2(expo0, expo1));
    return vec4(warpedDepth.xy, warpedDepth.xy * warpedDepth.xy);
}
#endif // _EVSM


#if defined(_NONE) ||  defined(_PCF)
vec4 computeShadowDepth(const in vec4 fragEye,
                        const in vec4 shadowRange)
#else
vec4 computeShadowDepth(const in vec4 fragEye,
                        const in vec4 shadowRange,
                        const in float expo0,
                        const in float expo1)
#endif
{
    // distance to camera
    float depth =  -fragEye.z * fragEye.w;
    // most precision near 0, make sure we are near 0 and in  [0,1]
    depth = (depth - shadowRange.x ) * shadowRange.w;

    vec4 outputFrag;

#if defined (_FLOATTEX) && defined(_PCF)
    outputFrag = vec4(depth, 0.0, 0.0, 1.0);
#elif defined (_FLOATTEX)  && defined(_ESM)
    float depthScale = expo1;
    depth = exp(-depth * depthScale);
    outputFrag = vec4(depth, 0.0, 0.0, 1.0);
#elif defined (_FLOATTEX)  && defined(_VSM)
    outputFrag = vec4(depth, depth * depth, 0.0, 1.0);
#elif defined (_FLOATTEX)  && defined(_EVSM)
    outputFrag = shadowDepthToEVSM(depth, expo0, expo1);
#elif defined (_FLOATTEX) // && defined(_NONE)
    outputFrag = vec4(depth, 0.0, 0.0, 1.0);
#elif defined(_PCF)
    outputFrag = encodeFloatRGBA(depth);
#elif defined(_ESM)
    float depthScale = expo1;
    depthScale = exp(-depth * depthScale);
    outputFrag = encodeFloatRGBA(depthScale);
#elif defined(_VSM)
    outputFrag = encodeHalfFloatRGBA(vec2(depth, depth* depth));
#else // NONE
    outputFrag = encodeFloatRGBA(depth);

#endif

    return outputFrag;
}
