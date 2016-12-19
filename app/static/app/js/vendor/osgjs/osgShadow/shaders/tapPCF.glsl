
#pragma include "noise.glsl" "_ROTATE_OFFSET"

#pragma include "shadowLinearSoft.glsl"

float getShadowPCF(const in sampler2D depths, const in vec4 size, const in vec2 uv, const in float compare, const in vec2 biasPCF)
{

     float res = 0.0;

#if defined(_ROTATE_OFFSET)
     res += texture2DShadowLerp(depths, size,   uv + size.zw*(noise2D(uv*gl_FragCoord.xy)*2.0 - 1.0) + biasPCF, compare);
#else
     res += texture2DShadowLerp(depths, size,   uv + biasPCF, compare);
#endif


#if defined(_PCFx1)

#else

    float dx0 = -size.z;
    float dy0 = -size.w;
    float dx1 = size.z;
    float dy1 = size.w;

#define TSF(o1,o2) texture2DShadowLerp(depths, size, uv + vec2(o1, o2) + biasPCF,  compare)

    res += TSF(dx0, dx0);
    res += TSF(dx0, .0);
    res += TSF(dx0, dx1);

#if defined(_PCFx4)

    res /=4.0;

#elif defined(_PCFx9)
    res += TSF(.0, dx0);
    res += TSF(.0, dx1);

    res += TSF(dx1, dx0);
    res += TSF(dx1, .0);
    res += TSF(dx1, dx1);


    res /=9.0;

#elif defined(_PCFx25)

    float dx02 = -2.0*size.z;
    float dy02 = -2.0*size.w;
    float dx2 = 2.0*size.z;
    float dy2 = 2.0*size.w;

    // complete row above
    res += TSF(dx0, dx02);
    res += TSF(dx0, dx2);

    res += TSF(.0, dx02);
    res += TSF(.0, dx2);

    res += TSF(dx1, dx02);
    res += TSF(dx1, dx2);

    // two new col
    res += TSF(dx02, dx02);
    res += TSF(dx02, dx0);
    res += TSF(dx02, .0);
    res += TSF(dx02, dx1);
    res += TSF(dx02, dx2);

    res += TSF(dx2, dx02);
    res += TSF(dx2, dx0);
    res += TSF(dx2, .0);
    res += TSF(dx2, dx1);
    res += TSF(dx2, dx2);


    res/=25.0;

#endif

#undef TSF

#endif
    return res;
}
/////// end Tap
