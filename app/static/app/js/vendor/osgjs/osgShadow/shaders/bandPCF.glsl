


float getShadowPCF(const in sampler2D tex, const in vec4 size, const in vec2 uv, const in float shadowZ, const in vec2 biasPCF) {

    float shadowed = 0.0;

    #define TSF(off1, off2) getSingleFloatFromTex( tex, uv.xy + vec2(off1, off2) + biasPCF )

    float dx0 = -size.z;
    float dy0 = -size.w;
    float dx1 = size.z;
    float dy1 = size.w;

    // fastest but gives banding
#if defined(_PCFx4)

    vec4 sV;

    // vector ops faster alu
    sV.x = TSF( dx0, dy0 );
    sV.y = TSF( dx1, dy0 );
    sV.z = TSF( dx1, dy0 );
    sV.w = TSF( dx1, dy1 );
    sV = vec4(lessThan(vec4(shadowZ), sV  ));
    shadowed = dot(sV, vec4(0.25));

    // here still didn't querying the real shadow at uv.
    // This could be a single func checking for branching
    // like before going to x9, x16 or anything
    // or even complex "blurring"
    if (shadowed != 0.0) // we're on an edge
    {
        shadowed += step(shadowZ, TSF(0.0, 0.0));
        shadowed *= 0.5;
    }

#elif defined(_PCFx9)


    mat3 kern;
    mat3 depthKernel;


    depthKernel[0][0] = TSF( dx0, dy0 );
    depthKernel[0][1] = TSF( dx0, 0.0 );
    depthKernel[0][2] = TSF( dx0, dy1 );
    depthKernel[1][0] = TSF( 0.0, dy0 );
    depthKernel[1][1] = TSF( 0.0, 0.0 );
    depthKernel[1][2] = TSF( 0.0, dy1 );
    depthKernel[2][0] = TSF( dx1, dy0 );
    depthKernel[2][1] = TSF( dx1, 0.0 );
    depthKernel[2][2] = TSF( dx1, dy1 );

    // using 4 vector ops to save ALU
    // filter is done post dept/shadow compare
    vec3 shadowZ3 = vec3( shadowZ );
    kern[0] = vec3(lessThan(shadowZ3, depthKernel[0]  ));
    kern[0] *= vec3(0.25);

    kern[1] = vec3(lessThan(shadowZ3, depthKernel[1] ));
    kern[1] *= vec3(0.25);

    kern[2] = vec3(lessThan(shadowZ3, depthKernel[2] ));
    kern[2] *= vec3(0.25);

    vec2 fractCoord = 1.0 - fract( uv.xy );

    kern[0] = mix( kern[1], kern[0], fractCoord.x );
    kern[1] = mix( kern[2], kern[1], fractCoord.x );

    vec4 sV;
    sV.x = mix( kern[0][1], kern[0][0], fractCoord.y );
    sV.y = mix( kern[0][2], kern[0][1], fractCoord.y );
    sV.z = mix( kern[1][1], kern[1][0], fractCoord.y );
    sV.w = mix( kern[1][2], kern[1][1], fractCoord.x );

    shadowed = dot( sV, vec4( 1.0 ) );

#elif defined(_PCFx16)

    float dx2 = -2.0 * size.z;
    float dy2 = -2.0 * size.w;
    float dx3 = 2.0 * size.z;
    float dy3 = 2.0 * size.w;

    shadowed += step(shadowZ , TSF(dx2, dy2));
    shadowed += step(shadowZ , TSF(dx0, dy2));
    shadowed += step(shadowZ , TSF(dx1, dy2));
    shadowed += step(shadowZ , TSF(dx3, dy2));

    shadowed += step(shadowZ , TSF(dx2, dy0));
    shadowed += step(shadowZ , TSF(dx0, dy0));
    shadowed += step(shadowZ , TSF(dx1, dy0));
    shadowed += step(shadowZ , TSF(dx3, dy0));

    shadowed += step(shadowZ , TSF(dx2, dy1));
    shadowed += step(shadowZ , TSF(dx0, dy1));
    shadowed += step(shadowZ , TSF(dx1, dy1));
    shadowed += step(shadowZ , TSF(dx3, dy1));

    shadowed += step(shadowZ , TSF(dx2, dy3));
    shadowed += step(shadowZ , TSF(dx0, dy3));
    shadowed += step(shadowZ , TSF(dx1, dy3));
    shadowed += step(shadowZ , TSF(dx3, dy3));

    shadowed = shadowed / 16.0;
#endif // pcfx16
    return shadowed;

}
