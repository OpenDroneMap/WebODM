vec3 getScale( const in mat4 matrix ) {
      // Only working with positive scales.
      float xs = matrix[0][0] * matrix[0][1] * matrix[0][2] * matrix[0][3] < 0. ? -1. : 1.;
      float ys = matrix[1][0] * matrix[1][1] * matrix[1][2] * matrix[1][3] < 0. ? -1. : 1.;
      float zs = matrix[2][0] * matrix[2][1] * matrix[2][2] * matrix[2][3] < 0. ? -1. : 1.;
      vec3 scale;
      scale.x = xs * sqrt( matrix[0][0] * matrix[0][0] + matrix[0][1] * matrix[0][1] + matrix[0][2] * matrix[0][2]);
      scale.y = ys * sqrt( matrix[1][0] * matrix[1][0] + matrix[1][1] * matrix[1][1] + matrix[1][2] * matrix[1][2]);
      scale.z = zs * sqrt( matrix[2][0] * matrix[2][0] + matrix[2][1] * matrix[2][1] + matrix[2][2] * matrix[2][2]);
      return scale;
}

vec4 billboard( const in vec3 vertex, const in mat4 modelViewMatrix, const in mat4 projectionMatrix ) {
      vec3 scale = getScale( modelViewMatrix );
      return projectionMatrix * ( vec4( scale.x* vertex.x , scale.y * vertex.y, scale.z * vertex.z, 1.0 ) + vec4( modelViewMatrix[ 3 ].xyz, 0.0 ) );
}
