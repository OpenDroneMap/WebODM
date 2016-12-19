
// 0 for early out
bool earlyOut = false;

// Calculate shadow amount
float shadow = 1.0;

if(!lighted) {
    shadow = 0.0;
    earlyOut = true;
}

if (depthRange.x == depthRange.y) {
    earlyOut = true;
}

vec4 shadowVertexEye;
float shadowReceiverZ = 0.0;
vec4 shadowVertexProjected;
vec2 shadowUV;

if(!earlyOut) {

    shadowVertexEye=  shadowViewMatrix *  vec4(vertexWorld, 1.0);
    shadowReceiverZ=  - shadowVertexEye.z;
    shadowVertexProjected = shadowProjectionMatrix * shadowVertexEye;

    if (shadowVertexProjected.w < 0.0) {
        earlyOut = true; // notably behind camera
    }
      
    if (!earlyOut) {
        shadowUV.xy = shadowVertexProjected.xy / shadowVertexProjected.w;
        shadowUV.xy = shadowUV.xy * 0.5 + 0.5;// mad like

        if(any(bvec4 ( shadowUV.x > 1., shadowUV.x < 0., shadowUV.y > 1., shadowUV.y < 0.))) {
            earlyOut = true;// limits of light frustum
        }
          
        // most precision near 0, make sure we are near 0 and in [0,1]
        shadowReceiverZ =  (shadowReceiverZ - depthRange.x)* depthRange.w;

        if(shadowReceiverZ < 0.0) {
            earlyOut = true; // notably behind camera
        }
          
    }
      
}


#if defined( _PCF )

// pcf pbias to add on offset
vec2 shadowBiasPCF = vec2(0.);

#ifdef GL_OES_standard_derivatives

shadowBiasPCF.x = clamp(dFdx(shadowReceiverZ)* shadowMapSize.z, -1.0, 1.0 );
shadowBiasPCF.y = clamp(dFdy(shadowReceiverZ)* shadowMapSize.w, -1.0, 1.0 );

#endif
#endif

// now that derivatives is done
// and we don't access any mipmapped/texgrad texture
// we can early out
// see http://teknicool.tumblr.com/post/77263472964/glsl-dynamic-branching-and-texture-samplers
if (earlyOut) return shadow;

// depth bias: fighting shadow acne (depth imprecsion z-fighting)
float shadowBias = 0.0;
// cosTheta is dot( n, l ), clamped between 0 and 1
//float shadowBias = 0.005*tan(acos(N_Dot_L));
// same but 4 cycles instead of 15
shadowBias += 0.05 *  sqrt( 1. -  N_Dot_L*N_Dot_L) / clamp(N_Dot_L, 0.0005,  1.0);

//That makes sure that plane perpendicular to light doesn't flicker due to
//selfshadowing and 1 = dot(Normal, Light) using a min bias
shadowBias = clamp(shadowBias, 0.00005,  bias);

// shadowZ must be clamped to [0,1]
// otherwise it's not comparable to
// shadow caster depth map
// which is clamped to [0,1]
// Not doing that makes ALL shadowReceiver > 1.0 black
// because they ALL becomes behind any point in Caster depth map
shadowReceiverZ = clamp(shadowReceiverZ, 0., 1. - shadowBias);

shadowReceiverZ -= shadowBias;

// Now computes Shadow


#ifdef _NONE

float shadowDepth = getSingleFloatFromTex(tex, shadowUV.xy);
// shadowReceiverZ : receiver depth in light view
// shadowDepth : caster depth in light view
// receiver is shadowed if its depth is superior to the caster
shadow = ( shadowReceiverZ > shadowDepth ) ? 0.0 : 1.0;

#elif defined( _PCF )


shadow = getShadowPCF(tex, shadowMapSize, shadowUV, shadowReceiverZ, shadowBiasPCF);

#elif defined( _ESM )

shadow = fetchESM(tex, shadowMapSize, shadowUV, shadowReceiverZ, exponent0, exponent1);

#elif  defined( _VSM )

vec2 moments = getDoubleFloatFromTex(tex, shadowUV.xy);
shadow = chebyshevUpperBound(moments, shadowReceiverZ, epsilonVSM);

#elif  defined( _EVSM )

vec4 occluder = getQuadFloatFromTex(tex, shadowUV.xy);
vec2 exponents = vec2(exponent0, exponent1);
vec2 warpedDepth = warpDepth(shadowReceiverZ, exponents);

float derivationEVSM = epsilonVSM;
// Derivative of warping at depth
vec2 depthScale = derivationEVSM * exponents * warpedDepth;
vec2 minVariance = depthScale * depthScale;

float epsilonEVSM = -epsilonVSM;

// Compute the upper bounds of the visibility function both for x and y
float posContrib = chebyshevUpperBound(occluder.xz, -warpedDepth.x, minVariance.x);
float negContrib = chebyshevUpperBound(occluder.yw, warpedDepth.y, minVariance.y);

shadow = min(posContrib, negContrib);

#endif


return shadow;

