//////VSM
//http://en.wikipedia.org/wiki/Chebyshev%27s_inequality
float chebychevInequality (const in vec2 moments, const in float t)
{
    // No shadow if depth of fragment is in front
    if ( t <= moments.x )
        return 1.0;

    // Calculate variance, which is actually the amount of
    // error due to precision loss from fp32 to RG/BA
    // (moment1 / moment2)
    float variance = moments.y - (moments.x * moments.x);
    variance = max(variance, 0.02);

    // Calculate the upper bound
    float d = t - moments.x;
    return variance / (variance + d * d);
}

// http://http.developer.nvidia.com/GPUGems3/gpugems3_ch08.html
float chebyshevUpperBound(const in vec2 moments, const in float mean, const in float minVariance)
{
    float d = mean - moments.x;
    if ( d <= 0.0 )
        return 1.0;
    // Compute variance
    float variance = moments.y - (moments.x * moments.x);
    variance = max(variance, minVariance);

    // Compute probabilistic upper bound
    //p represent an upper bound on the visibility percentage of the receiver. This value //attempts to estimate how much of the distribution of occluders at the surface location is //beyond the surface's distance from the light. If it is 0, then there is no probability //that the fragment is partially lit, so it will be fully in shadow. If it is a value in the //[0, 1] range, it represent the penumbrae value of the shadow edge.
    float p = smoothstep(mean, mean, moments.x);

    // Remove the [0, Amount] tail and linearly rescale (Amount, 1].
    /// light bleeding when shadows overlap.

    float pMax = smoothstep(0.2, 1.0, variance / (variance + d*d));
    // One-tailed chebyshev
    return clamp(max(p, pMax), 0.0, 1.0);
}

// might be included for EVSM
#ifdef _VSM
float computeShadow(const in bool lighted,
                    const in sampler2D tex,
                    const in vec4 shadowMapSize,
                    const in mat4 shadowProjectionMatrix,
                    const in mat4 shadowViewMatrix,
                    const in vec4 depthRange,
                    const in float N_Dot_L,
                    const in vec3 vertexWorld,
                    const in float bias,
                    const in float epsilonVSM
    )
{
#pragma include "shadowsReceiveMain.glsl" "_VSM"
}
#endif // _VSM

// end VSM
