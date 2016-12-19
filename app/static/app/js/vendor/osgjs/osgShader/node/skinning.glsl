//////////////////////////////
// OPTIMIZED VERSION (NO IF)
//////////////////////////////
mat4 skeletalTransform( const in vec4 weightsVec, const in vec4 bonesIdx ) {
    mat4 outMat_1;
    mat4 tmpMat_2;
    highp ivec4 tmpvar_3;
    tmpvar_3 = (3 * ivec4(bonesIdx));
    tmpMat_2 = mat4(1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0);
    vec4 tmpvar_4;
    tmpvar_4 = -(abs(weightsVec));
    tmpMat_2[0] = uBones[tmpvar_3.x];
    tmpMat_2[1] = uBones[(tmpvar_3.x + 1)];
    tmpMat_2[2] = uBones[(tmpvar_3.x + 2)];
    outMat_1 = ((float(
    ((tmpvar_4.x + tmpvar_4.y) >= -((tmpvar_4.z + tmpvar_4.w)))
    ) * mat4(1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0)) + (weightsVec.x * tmpMat_2));
    tmpMat_2[0] = uBones[tmpvar_3.y];
    tmpMat_2[1] = uBones[(tmpvar_3.y + 1)];
    tmpMat_2[2] = uBones[(tmpvar_3.y + 2)];
    outMat_1 = (outMat_1 + (weightsVec.y * tmpMat_2));
    tmpMat_2[0] = uBones[tmpvar_3.z];
    tmpMat_2[1] = uBones[(tmpvar_3.z + 1)];
    tmpMat_2[2] = uBones[(tmpvar_3.z + 2)];
    outMat_1 = (outMat_1 + (weightsVec.z * tmpMat_2));
    tmpMat_2[0] = uBones[tmpvar_3.w];
    tmpMat_2[1] = uBones[(tmpvar_3.w + 1)];
    tmpMat_2[2] = uBones[(tmpvar_3.w + 2)];
    outMat_1 = (outMat_1 + (weightsVec.w * tmpMat_2));

    return outMat_1;
}

//////////////////////////////
// UN-OPTIMIZED VERSION (WITH IF)
//////////////////////////////

// //http://http.developer.nvidia.com/GPUGems/gpugems_ch04.html
// mat4 getMat4FromVec4( const int index, inout mat4 myMat ) {
//     // We have to use a global variable because we can't access dynamically
//     // matrix is transpose so we should do vec * matrix
//     myMat[0] = uBones[ index ];
//     myMat[1] = uBones[ index + 1];
//     myMat[2] = uBones[ index + 2];
//     return myMat;
// }

// mat4 skeletalTransform( const in vec4 weightsVec, const in vec4 bonesIdx ) {
//     ivec4 idx =  3 * ivec4(bonesIdx);
//     mat4 tmpMat = mat4(1.0);
//     mat4 outMat = mat4(0.0);

//     // we handle negative weights
//     if(all(equal(weightsVec, vec4(0.0)))) return tmpMat;

//     if(weightsVec.x != 0.0) outMat += weightsVec.x * getMat4FromVec4( idx.x, tmpMat );
//     if(weightsVec.y != 0.0) outMat += weightsVec.y * getMat4FromVec4( idx.y, tmpMat );
//     if(weightsVec.z != 0.0) outMat += weightsVec.z * getMat4FromVec4( idx.z, tmpMat );
//     if(weightsVec.w != 0.0) outMat += weightsVec.w * getMat4FromVec4( idx.w, tmpMat );
//     return outMat;
// }

//////////////////////////////
// UN-OPTIMIZED VERSION (NO IF)
//////////////////////////////

// mat4 skeletalTransform( const in vec4 weightsVec, const in vec4 bonesIdx ) {
//     ivec4 idx =  3 * ivec4(bonesIdx);
//     mat4 tmpMat = mat4(1.0);

//     // if sum is 0, return identity
//     vec4 absWeights = -abs(weightsVec);
//     mat4 outMat = step(0.0, absWeights.x + absWeights.y + absWeights.z + absWeights.w) * tmpMat;

//     // we handle negative weights
//     // outMat[3][3] += weightsVec.x + weightsVec.y + weightsVec.z + weightsVec.w;

//     tmpMat[0] = uBones[ idx.x ];
//     tmpMat[1] = uBones[ idx.x + 1];
//     tmpMat[2] = uBones[ idx.x + 2];
//     outMat += weightsVec.x * tmpMat;

//     tmpMat[0] = uBones[ idx.y ];
//     tmpMat[1] = uBones[ idx.y + 1];
//     tmpMat[2] = uBones[ idx.y + 2];
//     outMat += weightsVec.y * tmpMat;

//     tmpMat[0] = uBones[ idx.z ];
//     tmpMat[1] = uBones[ idx.z + 1];
//     tmpMat[2] = uBones[ idx.z + 2];
//     outMat += weightsVec.z * tmpMat;

//     tmpMat[0] = uBones[ idx.w ];
//     tmpMat[1] = uBones[ idx.w + 1];
//     tmpMat[2] = uBones[ idx.w + 2];
//     outMat += weightsVec.w * tmpMat;

//     return outMat;
// }
