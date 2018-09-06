class Mat3 extends Float32Array{
	constructor(){ super(9); this[0] = this[4] = this[8] = 1; }  //Setup Identity

	static lookRotation(vDir, vUp, out){
		var zAxis	= new Vec3(vDir),	//Forward
			up		= new Vec3(vUp),
			xAxis	= new Vec3(),		//Right
			yAxis	= new Vec3();

		zAxis.normalize();
		Vec3.cross(up,zAxis,xAxis);
		xAxis.normalize();
		Vec3.cross(zAxis,xAxis,yAxis); //new up

		var m00 = xAxis.x, m01 = xAxis.y, m02 = xAxis.z,
			m10 = yAxis.x, m11 = yAxis.y, m12 = yAxis.z,
			m20 = zAxis.x, m21 = zAxis.y, m22 = zAxis.z;

		out[0] = m00;
		out[1] = m01;
		out[2] = m02;
		out[3] = m10;
		out[4] = m11;
		out[5] = m12;
		out[6] = m20;
		out[7] = m21;
		out[8] = m22;
	}

	//https://github.com/toji/gl-matrix/blob/master/src/gl-matrix/mat3.js
	static transpose(a ,out){
		// If we are transposing ourselves we can skip a few steps but have to cache some values
		if (out === a) {
			let a01 = a[1], a02 = a[2], a12 = a[5];
			out[1] = a[3];
			out[2] = a[6];
			out[3] = a01;
			out[5] = a[7];
			out[6] = a02;
			out[7] = a12;
		}else{
			out[0] = a[0];
			out[1] = a[3];
			out[2] = a[6];
			out[3] = a[1];
			out[4] = a[4];
			out[5] = a[7];
			out[6] = a[2];
			out[7] = a[5];
			out[8] = a[8];
		}
		return out;
	}

	static invert(out, a) {
	  let a00 = a[0], a01 = a[1], a02 = a[2];
	  let a10 = a[3], a11 = a[4], a12 = a[5];
	  let a20 = a[6], a21 = a[7], a22 = a[8];

	  let b01 = a22 * a11 - a12 * a21;
	  let b11 = -a22 * a10 + a12 * a20;
	  let b21 = a21 * a10 - a11 * a20;

	  // Calculate the determinant
	  let det = a00 * b01 + a01 * b11 + a02 * b21;

	  if (!det) {
	    return null;
	  }
	  det = 1.0 / det;

	  out[0] = b01 * det;
	  out[1] = (-a22 * a01 + a02 * a21) * det;
	  out[2] = (a12 * a01 - a02 * a11) * det;
	  out[3] = b11 * det;
	  out[4] = (a22 * a00 - a02 * a20) * det;
	  out[5] = (-a12 * a00 + a02 * a10) * det;
	  out[6] = b21 * det;
	  out[7] = (-a21 * a00 + a01 * a20) * det;
	  out[8] = (a11 * a00 - a01 * a10) * det;
	  return out;
	}

}

export default Mat3;