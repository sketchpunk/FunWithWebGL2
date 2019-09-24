//http://wscg.zcu.cz/wscg2012/short/A29-full.pdf
//https://github.com/toji/gl-matrix/issues/221
//https://github.com/stefnotch/gl-matrix/blob/master/src/gl-matrix/quat2.js
//https://github.com/toji/gl-matrix/blob/master/src/gl-matrix/quat2.js

import Vec3 from "./Vec3.js";

class DualQuat extends Float32Array{
	constructor(q,t){
		super(8);
		this.set(q,t);
	}

	////////////////////////////////////////////////////////////////////
	// SETTERS
	////////////////////////////////////////////////////////////////////
		copy(a){
			this[0] = a[0];
			this[1] = a[1];
			this[2] = a[2];
			this[3] = a[3];
			this[4] = a[4];
			this[5] = a[5];
			this[6] = a[6];
			this[7] = a[7];
			return this;
		}

		set(q,v){
			var nq = null;
			if(q != undefined && q != null){
				nq = [0,0,0,1];
				q.norm(nq);
			}

			v = v || null;

			if(nq != null & v != null)			DualQuat.fromRotationTranslation(this,nq,v);
			else if(nq != null && v == null)	DualQuat.fromRotation(this,nq);
			else if(nq == null && v != null)	DualQuat.fromTranslation(this,v);
			else{								//identity
				this[0] = 0;
				this[1] = 0;
				this[2] = 0;
				this[3] = 1;
				this[4] = 0;
				this[5] = 0;
				this[6] = 0;
				this[7] = 0;
			}

			return this;
		}

		squaredLength(){ return this[0]*this[0] + this[1]*this[1] + this[2]*this[2] + this[3]*this[3]; }


	////////////////////////////////////////////////////////////////////
	// SELF OPERATIONS
	////////////////////////////////////////////////////////////////////
		//Adds two dual quat's
		add(q,out){
			out = out || this;
			out[0] = this[0] + q[0];
			out[1] = this[1] + q[1];
			out[2] = this[2] + q[2];
			out[3] = this[3] + q[3];
			out[4] = this[4] + q[4];
			out[5] = this[5] + q[5];
			out[6] = this[6] + q[6];
			out[7] = this[7] + q[7];
			return this;
		}

		//Multiplies two dual quat's
		mul(q,out){
			out = out || this;

			var ax0 = this[0], ay0 = this[1], az0 = this[2], aw0 = this[3],
				ax1 = this[4], ay1 = this[5], az1 = this[6], aw1 = this[7],
				bx0 = q[0], by0 = q[1], bz0 = q[2], bw0 = q[3],
				bx1 = q[4], by1 = q[5], bz1 = q[6], bw1 = q[7];

			out[0] = ax0 * bw0 + aw0 * bx0 + ay0 * bz0 - az0 * by0;
			out[1] = ay0 * bw0 + aw0 * by0 + az0 * bx0 - ax0 * bz0;
			out[2] = az0 * bw0 + aw0 * bz0 + ax0 * by0 - ay0 * bx0;
			out[3] = aw0 * bw0 - ax0 * bx0 - ay0 * by0 - az0 * bz0;
			out[4] = ax0 * bw1 + aw0 * bx1 + ay0 * bz1 - az0 * by1 + ax1 * bw0 + aw1 * bx0 + ay1 * bz0 - az1 * by0;
			out[5] = ay0 * bw1 + aw0 * by1 + az0 * bx1 - ax0 * bz1 + ay1 * bw0 + aw1 * by0 + az1 * bx0 - ax1 * bz0;
			out[6] = az0 * bw1 + aw0 * bz1 + ax0 * by1 - ay0 * bx1 + az1 * bw0 + aw1 * bz0 + ax1 * by0 - ay1 * bx0;
			out[7] = aw0 * bw1 - ax0 * bx1 - ay0 * by1 - az0 * bz1 + aw1 * bw0 - ax1 * bx0 - ay1 * by0 - az1 * bz0;
			return this;
		}

		scale(s,out){
			out = out || this;
			out[0] = this[0] * s;
			out[1] = this[1] * s;
			out[2] = this[2] * s;
			out[3] = this[3] * s;
			out[4] = this[4] * s;
			out[5] = this[5] * s;
			out[6] = this[6] * s;
			out[7] = this[7] * s;
			return this;
		}

		//Calculates the inverse of a dual quat. If they are normalized, conjugate is cheaper
		invert(out){
			out = out || this;
			var sqlen = this.squaredLength(); //Todo, do 1/sqlen then mul the value

			out[0] = -this[0] / sqlen;
			out[1] = -this[1] / sqlen;
			out[2] = -this[2] / sqlen;
			out[3] =  this[3] / sqlen;
			out[4] = -this[4] / sqlen;
			out[5] = -this[5] / sqlen;
			out[6] = -this[6] / sqlen;
			out[7] =  this[7] / sqlen;
			return this;
		}


	////////////////////////////////////////////////////////////////////
	// STATIC SETTERS
	////////////////////////////////////////////////////////////////////

		//Creates a dual quat from a quaternion and a translation
		static fromRotationTranslation(out,q,t){
			var ax = t[0] * 0.5, ay = t[1] * 0.5, az = t[2] * 0.5,
				bx = q[0], by = q[1], bz = q[2], bw = q[3];

			out[0] = bx;
			out[1] = by;
			out[2] = bz;
			out[3] = bw;
			out[4] =  ax * bw + ay * bz - az * by;
			out[5] =  ay * bw + az * bx - ax * bz;
			out[6] =  az * bw + ax * by - ay * bx;
			out[7] = -ax * bx - ay * by - az * bz;
			return out;
		}

		static fromTranslation(out,t){
			out[0] = 0;
			out[1] = 0;
			out[2] = 0;
			out[3] = 1;
			out[4] = t[0] * 0.5;
			out[5] = t[1] * 0.5;
			out[6] = t[2] * 0.5;
			out[7] = 0;
			return out;
		}

		static fromRotation(out,q){
			out[0] = q[0];
			out[1] = q[1];
			out[2] = q[2];
			out[3] = q[3];
			out[4] = 0;
			out[5] = 0;
			out[6] = 0;
			out[7] = 0;
			return out;
		}

		static getTranslation(a, out){
			var ax =  a[4], ay =  a[5], az =  a[6], aw = a[7],
				bx = -a[0], by = -a[1], bz = -a[2], bw = a[3];

			out = out || new Array(3);
			out[0] = (ax * bw + aw * bx + ay * bz - az * by)*2;
			out[1] = (ay * bw + aw * by + az * bx - ax * bz)*2;
			out[2] = (az * bw + aw * bz + ax * by - ay * bx)*2;
			return out;
		}


	////////////////////////////////////////////////////////////////////
	// STATIC OPERATIONS
	////////////////////////////////////////////////////////////////////

		// Multiplies two dual quat's
		static mul(a, b, out){
			out = out || new DualQuat();

			var ax0 = a[0], ay0 = a[1], az0 = a[2], aw0 = a[3],
				ax1 = a[4], ay1 = a[5], az1 = a[6], aw1 = a[7],
				bx0 = b[0], by0 = b[1], bz0 = b[2], bw0 = b[3],
				bx1 = b[4], by1 = b[5], bz1 = b[6], bw1 = b[7];
			out[0] = ax0 * bw0 + aw0 * bx0 + ay0 * bz0 - az0 * by0;
			out[1] = ay0 * bw0 + aw0 * by0 + az0 * bx0 - ax0 * bz0;
			out[2] = az0 * bw0 + aw0 * bz0 + ax0 * by0 - ay0 * bx0;
			out[3] = aw0 * bw0 - ax0 * bx0 - ay0 * by0 - az0 * bz0;
			out[4] = ax0 * bw1 + aw0 * bx1 + ay0 * bz1 - az0 * by1 + ax1 * bw0 + aw1 * bx0 + ay1 * bz0 - az1 * by0;
			out[5] = ay0 * bw1 + aw0 * by1 + az0 * bx1 - ax0 * bz1 + ay1 * bw0 + aw1 * by0 + az1 * bx0 - ax1 * bz0;
			out[6] = az0 * bw1 + aw0 * bz1 + ax0 * by1 - ay0 * bx1 + az1 * bw0 + aw1 * bz0 + ax1 * by0 - ay1 * bx0;
			out[7] = aw0 * bw1 - ax0 * bx1 - ay0 * by1 - az0 * bz1 + aw1 * bw0 - ax1 * bx0 - ay1 * by0 - az1 * bz0;
			return out;
		}

		static transformVec3(dq, va, out = null){
			let pos	= DualQuat.getTranslation( dq );
			out		= out || new Vec3();

			Vec3.transformQuat(va, dq, out);
			out[0] += pos[0];
			out[1] += pos[1];
			out[2] += pos[2];

			return out;
		}


	////////////////////////////////////////////////////////////////////
	// STATIC TRANSFORMATIONS
	////////////////////////////////////////////////////////////////////

		//Translates a dual quat by the given vector
		static translate(out,a,v){
			var ax1 = a[0], ay1 = a[1], az1 = a[2], aw1 = a[3],
				ax2 = a[4], ay2 = a[5], az2 = a[6], aw2 = a[7],
				bx1 = v[0] * 0.5, by1 = v[1] * 0.5, bz1 = v[2] * 0.5;

			out[0] = ax1;
			out[1] = ay1;
			out[2] = az1;
			out[3] = aw1;
			out[4] =  aw1 * bx1 + ay1 * bz1 - az1 * by1 + ax2;
			out[5] =  aw1 * by1 + az1 * bx1 - ax1 * bz1 + ay2;
			out[6] =  aw1 * bz1 + ax1 * by1 - ay1 * bx1 + az2;
			out[7] = -ax1 * bx1 - ay1 * by1 - az1 * bz1 + aw2;
			return out;
		}

		//Rotates a dual quat around the X axis
		static rotateX(out,a,rad){
			var bx = -a[0], by = -a[1], bz = -a[2], bw = a[3],
				ax =  a[4], ay =  a[5], az =  a[6], aw = a[7];
			//Trans
			var ax1 = ax * bw + aw * bx + ay * bz - az * by,
			ay1 = ay * bw + aw * by + az * bx - ax * bz,
			az1 = az * bw + aw * bz + ax * by - ay * bx,
			aw1 = aw * bw - ax * bx - ay * by - az * bz;

			//Rotate it 
			quat.rotateX(out, a, rad);

			bx = out[0]; by = out[1]; bz = out[2]; bw = out[3];
			out[4] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
			out[5] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
			out[6] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
			out[7] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;
			return out;
		}

		static rotateY(out,a,rad){
			var bx = -a[0], by = -a[1], bz = -a[2], bw = a[3],
				ax =  a[4], ay =  a[5], az =  a[6], aw = a[7];
			
			//Trans
			var ax1 = ax * bw + aw * bx + ay * bz - az * by,
			ay1 = ay * bw + aw * by + az * bx - ax * bz,
			az1 = az * bw + aw * bz + ax * by - ay * bx,
			aw1 = aw * bw - ax * bx - ay * by - az * bz;

			//Rotate it 
			quat.rotateY(out, a, rad);

			bx = out[0]; by = out[1]; bz = out[2]; bw = out[3];
			out[4] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
			out[5] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
			out[6] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
			out[7] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;
			return out;
		}

		static rotateZ(out,a,rad){
			//Get the translation
			var bx = -a[0], by = -a[1], bz = -a[2], bw = a[3],
			ax =  a[4], ay =  a[5], az =  a[6], aw = a[7];

			//Trans
			var ax1 = ax * bw + aw * bx + ay * bz - az * by,
			ay1 = ay * bw + aw * by + az * bx - ax * bz,
			az1 = az * bw + aw * bz + ax * by - ay * bx,
			aw1 = aw * bw - ax * bx - ay * by - az * bz;

			//Rotate it 
			quat.rotateZ(out, a, rad);

			bx = out[0]; by = out[1]; bz = out[2]; bw = out[3];
			out[4] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
			out[5] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
			out[6] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
			out[7] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;
			return out;
		}

		//Rotates a dual quat by a given quaternion (a * q)
		static rotateByQuatAppend(out,a,q){
			var qx = q[0], qy = q[1], qz = q[2], qw = q[3],
				ax = a[0], ay = a[1], az = a[2], aw = a[3];

			out[0] = ax * qw + aw * qx + ay * qz - az * qy;
			out[1] = ay * qw + aw * qy + az * qx - ax * qz;
			out[2] = az * qw + aw * qz + ax * qy - ay * qx;
			out[3] = aw * qw - ax * qx - ay * qy - az * qz;
			
			ax = a[4]; ay = a[5]; az = a[6]; aw = a[7];
			out[4] = ax * qw + aw * qx + ay * qz - az * qy;
			out[5] = ay * qw + aw * qy + az * qx - ax * qz;
			out[6] = az * qw + aw * qz + ax * qy - ay * qx;
			out[7] = aw * qw - ax * qx - ay * qy - az * qz;
			return out;
		}

		//Rotates a dual quat by a given quaternion (q * a)
		static rotateByQuatPrepend(out,q,a){
			var qx = q[0], qy = q[1], qz = q[2], qw = q[3],
			bx = a[0], by = a[1], bz = a[2], bw = a[3];

			out[0] = qx * bw + qw * bx + qy * bz - qz * by;
			out[1] = qy * bw + qw * by + qz * bx - qx * bz;
			out[2] = qz * bw + qw * bz + qx * by - qy * bx;
			out[3] = qw * bw - qx * bx - qy * by - qz * bz;

			bx = a[4]; by = a[5]; bz = a[6]; bw = a[7];
			out[4] = qx * bw + qw * bx + qy * bz - qz * by;
			out[5] = qy * bw + qw * by + qz * bx - qx * bz;
			out[6] = qz * bw + qw * bz + qx * by - qy * bx;
			out[7] = qw * bw - qx * bx - qy * by - qz * bz;
			return out;
		}

		//Rotates a dual quat around a given axis. Does the normalisation automatically
		static rotateAroundAxis(out,a,axis,rad){
			//Special case for rad = 0
			if(Math.abs(rad) < glMatrix.EPSILON){ return dualquat.copy(out, a); } //TODO VOR- get Epsilon

			var axisLength = Math.sqrt(axis[0] * axis[0] + axis[1] * axis[1] + axis[2] * axis[2]);

			rad = rad * 0.5;
			var s = Math.sin(rad);
			var bx = s * axis[0] / axisLength;
			var by = s * axis[1] / axisLength;
			var bz = s * axis[2] / axisLength;
			var bw = Math.cos(rad);

			var ax1 = a[0], ay1 = a[1], az1 = a[2], aw1 = a[3];
			out[0] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
			out[1] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
			out[2] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
			out[3] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;

			var ax = a[4], ay = a[5], az = a[6], aw = a[7];
			out[4] = ax * bw + aw * bx + ay * bz - az * by;
			out[5] = ay * bw + aw * by + az * bx - ax * bz;
			out[6] = az * bw + aw * bz + ax * by - ay * bx;
			out[7] = aw * bw - ax * bx - ay * by - az * bz;

			return out;
		}


/*
	static lerp(a, b, t, out){
		let mt = 1 - t;
		if(dot(a, b) < 0) t = -t;

		out[0] = a[0] * mt + b[0] * t;
		out[1] = a[1] * mt + b[1] * t;
		out[2] = a[2] * mt + b[2] * t;
		out[3] = a[3] * mt + b[3] * t;
		out[4] = a[4] * mt + b[4] * t;
		out[5] = a[5] * mt + b[5] * t;
		out[6] = a[6] * mt + b[6] * t;
		out[7] = a[7] * mt + b[7] * t;
		return out;
	}
*/


/**
 * Performs a linear interpolation between two dual quats's
 * NOTE: The resulting dual quaternions won't always be normalized (The error is most noticeable when t = 0.5)
 *
 * @param {quat2} out the receiving dual quat
 * @param {quat2} a the first operand
 * @param {quat2} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {quat2} out

export function lerp(out, a, b, t) {
    let mt = 1 - t;
    if(dot(a, b) < 0) t = -t;
    
    out[0] = a[0] * mt + b[0] * t;
    out[1] = a[1] * mt + b[1] * t;
    out[2] = a[2] * mt + b[2] * t;
    out[3] = a[3] * mt + b[3] * t;
    out[4] = a[4] * mt + b[4] * t;
    out[5] = a[5] * mt + b[5] * t;
    out[6] = a[6] * mt + b[6] * t;
    out[7] = a[7] * mt + b[7] * t;
    
    return out;
}

 * Returns whether or not the dual quaternions have approximately the same elements in the same position.
 *
 * @param {quat2} a the first dual quat.
 * @param {quat2} b the second dual quat.
 * @returns {Boolean} true if the dual quats are equal, false otherwise.

export function equals(a, b) {
    let a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5], a6 = a[6], a7 = a[7];
    let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7];
    return (Math.abs(a0 - b0) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
            Math.abs(a1 - b1) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a1), Math.abs(b1)) &&
            Math.abs(a2 - b2) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a2), Math.abs(b2)) &&
            Math.abs(a3 - b3) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a3), Math.abs(b3)) &&
            Math.abs(a4 - b4) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a4), Math.abs(b4)) &&
            Math.abs(a5 - b5) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a5), Math.abs(b5)) &&
            Math.abs(a6 - b6) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a6), Math.abs(b6)) &&
            Math.abs(a7 - b7) <= glMatrix.EPSILON*Math.max(1.0, Math.abs(a7), Math.abs(b7)));
}*/


} 

export default DualQuat;