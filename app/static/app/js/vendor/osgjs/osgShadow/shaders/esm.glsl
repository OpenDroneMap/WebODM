////////////////////////////////////////////////
// ESM
float fetchESM(const in sampler2D tex, const in vec4 shadowMapSize, const in vec2 shadowUV, const in float shadowZ,  const in float exponent0, const in float exponent1) {


#if defined(_FLOATTEX) && (!defined(_FLOATLINEAR))
    // emulate bilinear filtering (not needed if webgm/GPU support filtering FP32/FP16 textures)
    vec2 unnormalized = shadowUV * shadowMapSize.xy;
    vec2 fractional = fract(unnormalized);
    unnormalized = floor(unnormalized);

    vec4 occluder4;
    occluder4.x = getSingleFloatFromTex(tex, (unnormalized + vec2( -0.5,  0.5 ))* shadowMapSize.zw );
    occluder4.y = getSingleFloatFromTex(tex, (unnormalized + vec2( 0.5,   0.5 ))* shadowMapSize.zw );
    occluder4.z = getSingleFloatFromTex(tex, (unnormalized + vec2( 0.5,  -0.5 ))* shadowMapSize.zw );
    occluder4.w = getSingleFloatFromTex(tex, (unnormalized + vec2( -0.5, -0.5 ))* shadowMapSize.zw );

    float occluder = (occluder4.w + (occluder4.x - occluder4.w) * fractional.y);
    occluder = occluder + ((occluder4.z + (occluder4.y - occluder4.z) * fractional.y) - occluder)*fractional.x;

#else
    float occluder = getSingleFloatFromTex(tex, shadowUV);
#endif


    // we're on an edge
    float depthScale = exponent1;
    float over_darkening_factor = exponent0;
    float receiver = depthScale * ( shadowZ);
    return 1.0 - clamp(over_darkening_factor*(occluder*exp(receiver)), 0.0, 1.0);
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
                    const in float exponent0,
                    const in float exponent1
    )
{
    #pragma include "shadowsReceiveMain.glsl" "_ESM"
}

// end ESM
