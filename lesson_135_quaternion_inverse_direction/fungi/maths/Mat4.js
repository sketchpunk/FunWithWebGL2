class Matrix4 extends Float32Array{
	constructor(){ super(16); this[0] = this[5] = this[10] = this[15] = 1; }  //Setup Identity

	////////////////////////////////////////////////////////////////////
	// GETTERS / SETTERS
	////////////////////////////////////////////////////////////////////
		
		translate(ary){	Matrix4.translate(this,ary[0],ary[1],ary[2]); return this;}
		reset_translation(){ this[12] = this[13] = this[14] = 0; this[15] = 1; return this; }

		//reset data back to identity.
		reset(){ 
			for(let i=0; i <= this.length; i++) this[i] = (i % 5 == 0)? 1 : 0; //only positions 0,5,10,15 need to be 1 else 0
			return this;
		}

		//copy another matrix's data to this one.
		copy( mat, offset=0 ){
			let i;
			for(i=0; i < 16; i++) this[i] = mat[ offset + i ];
			return this;
		}

		invert(){ Matrix4.invert( null, this ); return this; }

		from_mul( a, b ){ 
			let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
				a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
				a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
				a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

			// Cache only the current line of the second matrix
			let b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
			this[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
			this[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
			this[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
			this[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

			b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
			this[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
			this[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
			this[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
			this[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

			b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
			this[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
			this[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
			this[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
			this[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

			b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
			this[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
			this[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
			this[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
			this[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
			return this;	
		}

		from_invert( mat ) {
			var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3],
				a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7],
				a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11],
				a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15],

				b00 = a00 * a11 - a01 * a10,
				b01 = a00 * a12 - a02 * a10,
				b02 = a00 * a13 - a03 * a10,
				b03 = a01 * a12 - a02 * a11,
				b04 = a01 * a13 - a03 * a11,
				b05 = a02 * a13 - a03 * a12,
				b06 = a20 * a31 - a21 * a30,
				b07 = a20 * a32 - a22 * a30,
				b08 = a20 * a33 - a23 * a30,
				b09 = a21 * a32 - a22 * a31,
				b10 = a21 * a33 - a23 * a31,
				b11 = a22 * a33 - a23 * a32,

				// Calculate the determinant
				det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

			if (!det) return false;
			det = 1.0 / det;

			this[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
			this[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
			this[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
			this[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
			this[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
			this[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
			this[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
			this[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
			this[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
			this[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
			this[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
			this[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
			this[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
			this[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
			this[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
			this[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

			return this;
		}

		from_perspective( fovy, aspect, near, far ){
			let f = 1.0 / Math.tan(fovy / 2),
				nf = 1 / (near - far);
			this[0] = f / aspect;
			this[1] = 0;
			this[2] = 0;
			this[3] = 0;
			this[4] = 0;
			this[5] = f;
			this[6] = 0;
			this[7] = 0;
			this[8] = 0;
			this[9] = 0;
			this[10] = (far + near) * nf;
			this[11] = -1;
			this[12] = 0;
			this[13] = 0;
			this[14] = (2 * far * near) * nf;
			this[15] = 0;
			return this;
		}

		from_ortho( left, right, bottom, top, near, far ){
			let lr = 1 / (left - right),
				bt = 1 / (bottom - top),
				nf = 1 / (near - far);
			this[0] = -2 * lr;
			this[1] = 0;
			this[2] = 0;
			this[3] = 0;
			this[4] = 0;
			this[5] = -2 * bt;
			this[6] = 0;
			this[7] = 0;
			this[8] = 0;
			this[9] = 0;
			this[10] = 2 * nf;
			this[11] = 0;
			this[12] = (left + right) * lr;
			this[13] = (top + bottom) * bt;
			this[14] = (far + near) * nf;
			this[15] = 1;
			return this;
		}

		from_quat_tran_scale( q, v, s ){
			// Quaternion math
			let x = q[0], y = q[1], z = q[2], w = q[3],
			x2 = x + x,
			y2 = y + y,
			z2 = z + z,

			xx = x * x2,
			xy = x * y2,
			xz = x * z2,
			yy = y * y2,
			yz = y * z2,
			zz = z * z2,
			wx = w * x2,
			wy = w * y2,
			wz = w * z2,
			sx = s[0],
			sy = s[1],
			sz = s[2];

			this[0] = (1 - (yy + zz)) * sx;
			this[1] = (xy + wz) * sx;
			this[2] = (xz - wy) * sx;
			this[3] = 0;
			this[4] = (xy - wz) * sy;
			this[5] = (1 - (xx + zz)) * sy;
			this[6] = (yz + wx) * sy;
			this[7] = 0;
			this[8] = (xz + wy) * sz;
			this[9] = (yz - wx) * sz;
			this[10] = (1 - (xx + yy)) * sz;
			this[11] = 0;
			this[12] = v[0];
			this[13] = v[1];
			this[14] = v[2];
			this[15] = 1;

			return this;
		}

		get_translation( out=null ){
			out = out || [0,0,0];
			out[0] = this[12];
			out[1] = this[13];
			out[2] = this[14];
			return out;
		}

		get_scale( out=null ){
			out = out || [0,0,0];
			let m11 = this[0],
				m12 = this[1],
				m13 = this[2],
				m21 = this[4],
				m22 = this[5],
				m23 = this[6],
				m31 = this[8],
				m32 = this[9],
				m33 = this[10];
			out[0] = Math.sqrt(m11 * m11 + m12 * m12 + m13 * m13);
			out[1] = Math.sqrt(m21 * m21 + m22 * m22 + m23 * m23);
			out[2] = Math.sqrt(m31 * m31 + m32 * m32 + m33 * m33);
			return out;
		}

		// Returns a quaternion representing the rotational component of a transformation matrix. If a matrix is built with
		// fromRotationTranslation, the returned quaternion will be the same as the quaternion originally supplied
		get_rotation( out=null ){
			// Algorithm taken from http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm
			let trace	= this[0] + this[5] + this[10],
				S		= 0;

			out = out || [0,0,0,1];
			if(trace > 0){
				S = Math.sqrt(trace + 1.0) * 2;
				out[3] = 0.25 * S;
				out[0] = (this[6] - this[9]) / S;
				out[1] = (this[8] - this[2]) / S; 
				out[2] = (this[1] - this[4]) / S; 
			}else if( (this[0] > this[5]) & (this[0] > this[10]) ){ 
				S = Math.sqrt(1.0 + this[0] - this[5] - this[10]) * 2;
				out[3] = (this[6] - this[9]) / S;
				out[0] = 0.25 * S;
				out[1] = (this[1] + this[4]) / S; 
				out[2] = (this[8] + this[2]) / S; 
			}else if(this[5] > this[10]){ 
				S = Math.sqrt(1.0 + this[5] - this[0] - this[10]) * 2;
				out[3] = (this[8] - this[2]) / S;
				out[0] = (this[1] + this[4]) / S; 
				out[1] = 0.25 * S;
				out[2] = (this[6] + this[9]) / S; 
			}else{ 
				S = Math.sqrt(1.0 + this[10] - this[0] - this[5]) * 2;
				out[3] = (this[1] - this[4]) / S;
				out[0] = (this[8] + this[2]) / S;
				out[1] = (this[6] + this[9]) / S;
				out[2] = 0.25 * S;
			}
			return out;
		}

	////////////////////////////////////////////////////////////////////
	// OPERATIONS
	////////////////////////////////////////////////////////////////////
		
		mul( b ){ 
			let a00 = this[0],	a01 = this[1],	a02 = this[2],	a03 = this[3],
				a10 = this[4],	a11 = this[5],	a12 = this[6],	a13 = this[7],
				a20 = this[8],	a21 = this[9],	a22 = this[10],	a23 = this[11],
				a30 = this[12],	a31 = this[13],	a32 = this[14],	a33 = this[15];

			// Cache only the current line of the second matrix
			let b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
			this[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
			this[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
			this[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
			this[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

			b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
			this[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
			this[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
			this[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
			this[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

			b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
			this[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
			this[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
			this[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
			this[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

			b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
			this[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
			this[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
			this[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
			this[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
			return this;	
		}

	////////////////////////////////////////////////////////////////////
	// TRANSFORMS
	////////////////////////////////////////////////////////////////////

		transform_vec4( v, out = null ){
			let x = v[0], y = v[1], z = v[2], w = v[3];
			out = out || v;

			out[0] = this[0] * x + this[4] * y + this[8]	* z + this[12] * w;
			out[1] = this[1] * x + this[5] * y + this[9]	* z + this[13] * w;
			out[2] = this[2] * x + this[6] * y + this[10]	* z + this[14] * w;
			out[3] = this[3] * x + this[7] * y + this[11]	* z + this[15] * w;
			return out;
		}

	////////////////////////////////////////////////////////////////////
	// STATIC SETTERS
	////////////////////////////////////////////////////////////////////
		
		static identity(out){
			for(let i=0; i <= out.length; i++) out[i] = (i % 5 == 0)? 1 : 0; //only positions 0,5,10,15 need to be 1 else 0
		}

		static perspective( out, fovy, aspect, near, far ){
			let f = 1.0 / Math.tan(fovy / 2),
				nf = 1 / (near - far);
			out[0] = f / aspect;
			out[1] = 0;
			out[2] = 0;
			out[3] = 0;
			out[4] = 0;
			out[5] = f;
			out[6] = 0;
			out[7] = 0;
			out[8] = 0;
			out[9] = 0;
			out[10] = (far + near) * nf;
			out[11] = -1;
			out[12] = 0;
			out[13] = 0;
			out[14] = (2 * far * near) * nf;
			out[15] = 0;
		}

		static ortho( out, left, right, bottom, top, near, far ){
			let lr = 1 / (left - right),
				bt = 1 / (bottom - top),
				nf = 1 / (near - far);
			out[0] = -2 * lr;
			out[1] = 0;
			out[2] = 0;
			out[3] = 0;
			out[4] = 0;
			out[5] = -2 * bt;
			out[6] = 0;
			out[7] = 0;
			out[8] = 0;
			out[9] = 0;
			out[10] = 2 * nf;
			out[11] = 0;
			out[12] = (left + right) * lr;
			out[13] = (top + bottom) * bt;
			out[14] = (far + near) * nf;
			out[15] = 1;
		}

		//This creates a View Matrix, not a World Matrix. Use TargetTo for a World Matrix type LookAt.
		static look_at(eye, center, up, out){
			let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
			let eyex = eye[0];
			let eyey = eye[1];
			let eyez = eye[2];
			let upx = up[0];
			let upy = up[1];
			let upz = up[2];
			let centerx = center[0];
			let centery = center[1];
			let centerz = center[2];

			if (Math.abs(eyex - centerx) < 0.000001 &&
				Math.abs(eyey - centery) < 0.000001 &&
				Math.abs(eyez - centerz) < 0.000001) {
				return identity(out);
			}

			z0 = eyex - centerx;
			z1 = eyey - centery;
			z2 = eyez - centerz;

			len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
			z0 *= len;
			z1 *= len;
			z2 *= len;

			x0 = upy * z2 - upz * z1;
			x1 = upz * z0 - upx * z2;
			x2 = upx * z1 - upy * z0;
			len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);

			if (!len) {
				x0 = 0;
				x1 = 0;
				x2 = 0;
			} else {
				len = 1 / len;
				x0 *= len;
				x1 *= len;
				x2 *= len;
			}

			y0 = z1 * x2 - z2 * x1;
			y1 = z2 * x0 - z0 * x2;
			y2 = z0 * x1 - z1 * x0;

			len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
			if (!len) {
				y0 = 0;
				y1 = 0;
				y2 = 0;
			} else {
				len = 1 / len;
				y0 *= len;
				y1 *= len;
				y2 *= len;
			}

			out[0] = x0;
			out[1] = y0;
			out[2] = z0;
			out[3] = 0;
			out[4] = x1;
			out[5] = y1;
			out[6] = z1;
			out[7] = 0;
			out[8] = x2;
			out[9] = y2;
			out[10] = z2;
			out[11] = 0;
			out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
			out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
			out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
			out[15] = 1;

			return out;
		}

		static target_to(eye, target, up, out){
			let eyex = eye[0],
				eyey = eye[1],
				eyez = eye[2],
				upx = up[0],
				upy = up[1],
				upz = up[2];

			let z0 = eyex - target[0],
				z1 = eyey - target[1],
				z2 = eyez - target[2];

			let len = z0*z0 + z1*z1 + z2*z2;
			if (len > 0) {
				len = 1 / Math.sqrt(len);
				z0 *= len;
				z1 *= len;
				z2 *= len;
			}

			let x0 = upy * z2 - upz * z1,
				x1 = upz * z0 - upx * z2,
				x2 = upx * z1 - upy * z0;

			len = x0*x0 + x1*x1 + x2*x2;
			if (len > 0) {
				len = 1 / Math.sqrt(len);
				x0 *= len;
				x1 *= len;
				x2 *= len;
			}

			out[0] = x0;
			out[1] = x1;
			out[2] = x2;
			out[3] = 0;
			out[4] = z1 * x2 - z2 * x1;
			out[5] = z2 * x0 - z0 * x2;
			out[6] = z0 * x1 - z1 * x0;
			out[7] = 0;
			out[8] = z0;
			out[9] = z1;
			out[10] = z2;
			out[11] = 0;
			out[12] = eyex;
			out[13] = eyey;
			out[14] = eyez;
			out[15] = 1;
			return out;
		}

	////////////////////////////////////////////////////////////////////
	// STATIC CONVERSIONS
	////////////////////////////////////////////////////////////////////

		// Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix
		static normal_mat3( a, out ){
			var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
				a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
				a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
				a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

				b00 = a00 * a11 - a01 * a10,
				b01 = a00 * a12 - a02 * a10,
				b02 = a00 * a13 - a03 * a10,
				b03 = a01 * a12 - a02 * a11,
				b04 = a01 * a13 - a03 * a11,
				b05 = a02 * a13 - a03 * a12,
				b06 = a20 * a31 - a21 * a30,
				b07 = a20 * a32 - a22 * a30,
				b08 = a20 * a33 - a23 * a30,
				b09 = a21 * a32 - a22 * a31,
				b10 = a21 * a33 - a23 * a31,
				b11 = a22 * a33 - a23 * a32,

			// Calculate the determinant
			det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

			if (!det) return null;

			det = 1.0 / det;

			out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
			out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
			out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;

			out[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
			out[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
			out[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det;

			out[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
			out[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
			out[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
			return out;
		}

	////////////////////////////////////////////////////////////////////
	// STATIC OPERATIONS
	////////////////////////////////////////////////////////////////////

		//From glMatrix
		//Multiple two mat4 together
		static mul( a, b, out ){ 
			var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
				a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
				a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
				a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

			// Cache only the current line of the second matrix
			var b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
			out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
			out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
			out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
			out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

			b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
			out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
			out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
			out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
			out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

			b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
			out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
			out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
			out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
			out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

			b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
			out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
			out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
			out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
			out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
			return out;	
		}

		static scale(out,x,y,z){
			out[0] *= x;
			out[1] *= x;
			out[2] *= x;
			out[3] *= x;
			out[4] *= y;
			out[5] *= y;
			out[6] *= y;
			out[7] *= y;
			out[8] *= z;
			out[9] *= z;
			out[10] *= z;
			out[11] *= z;
			return out;
		}

		//make the rows into the columns
		static transpose( a, out ){
			//If we are transposing ourselves we can skip a few steps but have to cache some values
			if (out === a) {
				var a01 = a[1], a02 = a[2], a03 = a[3], a12 = a[6], a13 = a[7], a23 = a[11];
				out[1] = a[4];
				out[2] = a[8];
				out[3] = a[12];
				out[4] = a01;
				out[6] = a[9];
				out[7] = a[13];
				out[8] = a02;
				out[9] = a12;
				out[11] = a[14];
				out[12] = a03;
				out[13] = a13;
				out[14] = a23;
			}else{
				out[0] = a[0];
				out[1] = a[4];
				out[2] = a[8];
				out[3] = a[12];
				out[4] = a[1];
				out[5] = a[5];
				out[6] = a[9];
				out[7] = a[13];
				out[8] = a[2];
				out[9] = a[6];
				out[10] = a[10];
				out[11] = a[14];
				out[12] = a[3];
				out[13] = a[7];
				out[14] = a[11];
				out[15] = a[15];
			}

			return out;
		}

		static invert( mat, out ) {
			mat = mat || out; //If input isn't sent, then output is also input

			var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3],
				a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7],
				a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11],
				a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15],

				b00 = a00 * a11 - a01 * a10,
				b01 = a00 * a12 - a02 * a10,
				b02 = a00 * a13 - a03 * a10,
				b03 = a01 * a12 - a02 * a11,
				b04 = a01 * a13 - a03 * a11,
				b05 = a02 * a13 - a03 * a12,
				b06 = a20 * a31 - a21 * a30,
				b07 = a20 * a32 - a22 * a30,
				b08 = a20 * a33 - a23 * a30,
				b09 = a21 * a32 - a22 * a31,
				b10 = a21 * a33 - a23 * a31,
				b11 = a22 * a33 - a23 * a32,

				// Calculate the determinant
				det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

			if (!det) return false;
			det = 1.0 / det;

			out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
			out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
			out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
			out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
			out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
			out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
			out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
			out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
			out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
			out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
			out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
			out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
			out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
			out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
			out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
			out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

			return true;
		}

		//https://github.com/gregtatum/mdn-model-view-projection/blob/master/shared/matrices.js
		static multiply_vector( mat4, v) { //TODO: Dont need this, transformVec3 does a better job.
			var x = v[0], y = v[1], z = v[2], w = v[3];
			var c1r1 = mat4[ 0], c2r1 = mat4[ 1], c3r1 = mat4[ 2], c4r1 = mat4[ 3],
				c1r2 = mat4[ 4], c2r2 = mat4[ 5], c3r2 = mat4[ 6], c4r2 = mat4[ 7],
				c1r3 = mat4[ 8], c2r3 = mat4[ 9], c3r3 = mat4[10], c4r3 = mat4[11],
				c1r4 = mat4[12], c2r4 = mat4[13], c3r4 = mat4[14], c4r4 = mat4[15];

			return [
				x*c1r1 + y*c1r2 + z*c1r3 + w*c1r4,
				x*c2r1 + y*c2r2 + z*c2r3 + w*c2r4,
				x*c3r1 + y*c3r2 + z*c3r3 + w*c3r4,
				x*c4r1 + y*c4r2 + z*c4r3 + w*c4r4
			];
		}

		//https://github.com/toji/gl-matrix/blob/master/src/gl-matrix/vec4.js, vec4.transformMat4
		static transform_vec4( m, v, out = null){
			var x = v[0], y = v[1], z = v[2], w = v[3];
			out = out || v;

			out[0] = m[0] * x + m[4] * y + m[8]		* z + m[12] * w;
			out[1] = m[1] * x + m[5] * y + m[9]		* z + m[13] * w;
			out[2] = m[2] * x + m[6] * y + m[10]	* z + m[14] * w;
			out[3] = m[3] * x + m[7] * y + m[11]	* z + m[15] * w;
			return out;
		}
		
	////////////////////////////////////////////////////////////////////
	// STATIC GETTER / SETTER
	////////////////////////////////////////////////////////////////////

		//New function derived from fromRotationTranslation, just took out the translation stuff.
		static from_quat( q, out ){
			// Quaternion math
			var x = q[0], y = q[1], z = q[2], w = q[3],
				x2 = x + x,
				y2 = y + y,
				z2 = z + z,

				xx = x * x2,
				xy = x * y2,
				xz = x * z2,
				yy = y * y2,
				yz = y * z2,
				zz = z * z2,
				wx = w * x2,
				wy = w * y2,
				wz = w * z2;

			out[0] = 1 - (yy + zz);
			out[1] = xy + wz;
			out[2] = xz - wy;
			out[3] = 0;
			out[4] = xy - wz;
			out[5] = 1 - (xx + zz);
			out[6] = yz + wx;
			out[7] = 0;
			out[8] = xz + wy;
			out[9] = yz - wx;
			out[10] = 1 - (xx + yy);
			out[11] = 0;
			return out;
		}

		//https://github.com/toji/gl-matrix/blob/master/src/gl-matrix/mat4.js
		static from_quat_tran( q, out ){
			// Quaternion math
			var x = q[0], y = q[1], z = q[2], w = q[3],
				x2 = x + x,
				y2 = y + y,
				z2 = z + z,

				xx = x * x2,
				xy = x * y2,
				xz = x * z2,
				yy = y * y2,
				yz = y * z2,
				zz = z * z2,
				wx = w * x2,
				wy = w * y2,
				wz = w * z2;

			out[0] = 1 - (yy + zz);
			out[1] = xy + wz;
			out[2] = xz - wy;
			out[3] = 0;
			out[4] = xy - wz;
			out[5] = 1 - (xx + zz);
			out[6] = yz + wx;
			out[7] = 0;
			out[8] = xz + wy;
			out[9] = yz - wx;
			out[10] = 1 - (xx + yy);
			out[11] = 0;
			out[12] = v[0];
			out[13] = v[1];
			out[14] = v[2];
			out[15] = 1;
			return out;
		}

		static from_quat_tran_scale( q, v, s, out ){
			// Quaternion math
			var x = q[0], y = q[1], z = q[2], w = q[3],
			x2 = x + x,
			y2 = y + y,
			z2 = z + z,

			xx = x * x2,
			xy = x * y2,
			xz = x * z2,
			yy = y * y2,
			yz = y * z2,
			zz = z * z2,
			wx = w * x2,
			wy = w * y2,
			wz = w * z2,
			sx = s[0],
			sy = s[1],
			sz = s[2];

			out[0] = (1 - (yy + zz)) * sx;
			out[1] = (xy + wz) * sx;
			out[2] = (xz - wy) * sx;
			out[3] = 0;
			out[4] = (xy - wz) * sy;
			out[5] = (1 - (xx + zz)) * sy;
			out[6] = (yz + wx) * sy;
			out[7] = 0;
			out[8] = (xz + wy) * sz;
			out[9] = (yz - wx) * sz;
			out[10] = (1 - (xx + yy)) * sz;
			out[11] = 0;
			out[12] = v[0];
			out[13] = v[1];
			out[14] = v[2];
			out[15] = 1;

			return out;
		}

		static get_translation(out, mat){
			out[0] = mat[12];
			out[1] = mat[13];
			out[2] = mat[14];
			return out;
		}

		static get_scaling(out, mat){
			var m11 = mat[0],
				m12 = mat[1],
				m13 = mat[2],
				m21 = mat[4],
				m22 = mat[5],
				m23 = mat[6],
				m31 = mat[8],
				m32 = mat[9],
				m33 = mat[10];
			out[0] = Math.sqrt(m11 * m11 + m12 * m12 + m13 * m13);
			out[1] = Math.sqrt(m21 * m21 + m22 * m22 + m23 * m23);
			out[2] = Math.sqrt(m31 * m31 + m32 * m32 + m33 * m33);
			return out;
		}

		//Returns a quaternion representing the rotational component of a transformation matrix. If a matrix is built with
		//fromRotationTranslation, the returned quaternion will be the same as the quaternion originally supplied
		static get_rotation(out, mat){
			// Algorithm taken from http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm
			var trace = mat[0] + mat[5] + mat[10],
				S = 0;

			if(trace > 0){
				S = Math.sqrt(trace + 1.0) * 2;
				out[3] = 0.25 * S;
				out[0] = (mat[6] - mat[9]) / S;
				out[1] = (mat[8] - mat[2]) / S; 
				out[2] = (mat[1] - mat[4]) / S; 
			}else if( (mat[0] > mat[5]) & (mat[0] > mat[10]) ){ 
				S = Math.sqrt(1.0 + mat[0] - mat[5] - mat[10]) * 2;
				out[3] = (mat[6] - mat[9]) / S;
				out[0] = 0.25 * S;
				out[1] = (mat[1] + mat[4]) / S; 
				out[2] = (mat[8] + mat[2]) / S; 
			}else if(mat[5] > mat[10]){ 
				S = Math.sqrt(1.0 + mat[5] - mat[0] - mat[10]) * 2;
				out[3] = (mat[8] - mat[2]) / S;
				out[0] = (mat[1] + mat[4]) / S; 
				out[1] = 0.25 * S;
				out[2] = (mat[6] + mat[9]) / S; 
			}else{ 
				S = Math.sqrt(1.0 + mat[10] - mat[0] - mat[5]) * 2;
				out[3] = (mat[1] - mat[4]) / S;
				out[0] = (mat[8] + mat[2]) / S;
				out[1] = (mat[6] + mat[9]) / S;
				out[2] = 0.25 * S;
			}
			return out;
		}

	////////////////////////////////////////////////////////////////////
	// STATIC TRANSFORMATION
	////////////////////////////////////////////////////////////////////

		static rotate_y(out,rad) {
			var s = Math.sin(rad),
				c = Math.cos(rad),
				a00 = out[0],
				a01 = out[1],
				a02 = out[2],
				a03 = out[3],
				a20 = out[8],
				a21 = out[9],
				a22 = out[10],
				a23 = out[11];

			// Perform axis-specific matrix multiplication
			out[0] = a00 * c - a20 * s;
			out[1] = a01 * c - a21 * s;
			out[2] = a02 * c - a22 * s;
			out[3] = a03 * c - a23 * s;
			out[8] = a00 * s + a20 * c;
			out[9] = a01 * s + a21 * c;
			out[10] = a02 * s + a22 * c;
			out[11] = a03 * s + a23 * c;
			return out;
		}

		static rotate_x(out,rad) {
			var s = Math.sin(rad),
				c = Math.cos(rad),
				a10 = out[4],
				a11 = out[5],
				a12 = out[6],
				a13 = out[7],
				a20 = out[8],
				a21 = out[9],
				a22 = out[10],
				a23 = out[11];

			// Perform axis-specific matrix multiplication
			out[4] = a10 * c + a20 * s;
			out[5] = a11 * c + a21 * s;
			out[6] = a12 * c + a22 * s;
			out[7] = a13 * c + a23 * s;
			out[8] = a20 * c - a10 * s;
			out[9] = a21 * c - a11 * s;
			out[10] = a22 * c - a12 * s;
			out[11] = a23 * c - a13 * s;
			return out;
		}

		static rotate_z(out,rad){
			var s = Math.sin(rad),
				c = Math.cos(rad),
				a00 = out[0],
				a01 = out[1],
				a02 = out[2],
				a03 = out[3],
				a10 = out[4],
				a11 = out[5],
				a12 = out[6],
				a13 = out[7];

			// Perform axis-specific matrix multiplication
			out[0] = a00 * c + a10 * s;
			out[1] = a01 * c + a11 * s;
			out[2] = a02 * c + a12 * s;
			out[3] = a03 * c + a13 * s;
			out[4] = a10 * c - a00 * s;
			out[5] = a11 * c - a01 * s;
			out[6] = a12 * c - a02 * s;
			out[7] = a13 * c - a03 * s;
			return out;
		}

		static rotate(out, rad, axis){
			var x = axis[0], y = axis[1], z = axis[2],
				len = Math.sqrt(x * x + y * y + z * z),
				s, c, t,
				a00, a01, a02, a03,
				a10, a11, a12, a13,
				a20, a21, a22, a23,
				b00, b01, b02,
				b10, b11, b12,
				b20, b21, b22;

			if (Math.abs(len) < 0.000001) { return null; }

			len = 1 / len;
			x *= len;
			y *= len;
			z *= len;

			s = Math.sin(rad);
			c = Math.cos(rad);
			t = 1 - c;

			a00 = out[0]; a01 = out[1]; a02 = out[2]; a03 = out[3];
			a10 = out[4]; a11 = out[5]; a12 = out[6]; a13 = out[7];
			a20 = out[8]; a21 = out[9]; a22 = out[10]; a23 = out[11];

			// Construct the elements of the rotation matrix
			b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
			b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
			b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;

			// Perform rotation-specific matrix multiplication
			out[0] = a00 * b00 + a10 * b01 + a20 * b02;
			out[1] = a01 * b00 + a11 * b01 + a21 * b02;
			out[2] = a02 * b00 + a12 * b01 + a22 * b02;
			out[3] = a03 * b00 + a13 * b01 + a23 * b02;
			out[4] = a00 * b10 + a10 * b11 + a20 * b12;
			out[5] = a01 * b10 + a11 * b11 + a21 * b12;
			out[6] = a02 * b10 + a12 * b11 + a22 * b12;
			out[7] = a03 * b10 + a13 * b11 + a23 * b12;
			out[8] = a00 * b20 + a10 * b21 + a20 * b22;
			out[9] = a01 * b20 + a11 * b21 + a21 * b22;
			out[10] = a02 * b20 + a12 * b21 + a22 * b22;
			out[11] = a03 * b20 + a13 * b21 + a23 * b22;
		}

		//https://github.com/toji/gl-matrix/blob/master/src/gl-matrix/mat4.js  mat4.scalar.translate = function (out, a, v) {
		static translate(out,x,y,z){
			out[12] = out[0] * x + out[4] * y + out[8]	* z + out[12];
			out[13] = out[1] * x + out[5] * y + out[9]	* z + out[13];
			out[14] = out[2] * x + out[6] * y + out[10]	* z + out[14];
			out[15] = out[3] * x + out[7] * y + out[11]	* z + out[15];
		}
}

export default Matrix4