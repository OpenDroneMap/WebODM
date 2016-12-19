// EVSM

#pragma include "vsm.glsl"

// Convert depth to EVSM coefficients
// Input depth should be in [0, 1]
vec2 warpDepth(const in float depth, const in vec2 exponents)
{
    float pos =  exp( exponents.x * depth);
    float neg = -exp(-exponents.y * depth);
    return vec2(pos, neg);
}


float computeShadow(const in bool lighted,
                    const in sampler2D tex,
                    const in vec4 shadowMapSize,
                    const in mat4 shadowProjectionMatrix,
                    const in mat4 shadowViewMatrix,
                    const in vec4 depthRange,
                    const in float N_Dot_L,
                    const in vec3 vertexWorld,
                    const in float bias,
                    const in float epsilonVSM,
                    const in float exponent0,
                    const in float exponent1
    )
{
    #pragma include "shadowsReceiveMain.glsl" "_EVSM"
}

// _EVSM
