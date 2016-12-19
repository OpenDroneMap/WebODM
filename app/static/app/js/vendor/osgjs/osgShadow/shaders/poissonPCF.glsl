

#pragma include "shadowLinearSoft.glsl"

#pragma include "hash.glsl"

float getShadowPCF(const in sampler2D tex, const in vec4 size, const in vec2 uv, const in float shadowZ, const in vec2 biasPCF) {

    vec2 o = size.zw;
    float s = 0.0;

// Not Good, as it needs the lerp things
#pragma include "arrayPoisson.glsl"

    int idx = 0;

    // Not Good, as it needs the lerp things
#define TSF_BASE(p, m) texture2DShadowLerp(tex, size, uv + m*poissonDisk[p]*o + biasPCF,  shadowZ)

// fixed pattern in the shadow, no noise
#define TSF_FIXED(i) TSF_BASE(i, 1.0)

    // rand  using screenpos: No banding,"moves" camera
#define TSF_SCREEN(i) TSF_BASE(i, hashSin22( float(i)*gl_FragCoord.xy ))

//rand using worl proj +depth as world psace xyez
#define TSF_SPACE(i)  TSF_BASE(i, hashSin41(vec4(uv.xy, shadowZ, float(i))))

#define TSF(k) TSF_SPACE(k)


    s += TSF(1);
    s += TSF(2);
    s += TSF(3);
    s += TSF(4);

#ifdef _PCFx4
    const float kernSize = 4.;
#else
    s += TSF(5);
    s += TSF(6);
    s += TSF(7);
    s += TSF(8);
#ifdef _PCFx9
    const float kernSize = 8.;
#else
    s += TSF(9);
    s += TSF(10);
    s += TSF(11);
    s += TSF(12);
    s += TSF(13);
    s += TSF(14);
    s += TSF(15);
    s += TSF(16);
#ifdef _PCFx16
    const float kernSize = 16.;
#else
    s += TSF(17);
    s += TSF(18);
    s += TSF(19);
    s += TSF(20);
    s += TSF(21);
    s += TSF(22);
    s += TSF(23);
    s += TSF(24);
    s += TSF(25);
#ifdef _PCFx25
    const float kernSize = 25.;
#else
    s += TSF(26);
    s += TSF(27);
    s += TSF(28);
    s += TSF(29);
    s += TSF(30);
    s += TSF(31);
    s += TSF(32);
#ifdef _PCFx32
    const float kernSize = 32.;
#endif // 32
#endif // 25
#endif // 16
#endif // 8
#endif // 4

    s /= kernSize;
    return s;
}
// end poisson
#undef TSF
