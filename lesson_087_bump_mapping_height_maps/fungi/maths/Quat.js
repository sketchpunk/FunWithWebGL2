import Vec3 from "./Vec3.js";

class Quaternion extends Float32Array{
	constructor(q = null){
		super(4);
		if(q != null && q instanceof Quaternion){
			this[0] = q[0];
			this[1] = q[1];
			this[2] = q[2];
			this[3] = q[3];
		}else{
			this[0] = this[1] = this[2] = 0;
			this[3] = 1;
		}
	}


	//http://in2gpu.com/2016/03/14/opengl-fps-camera-quaternion/
	//https://github.com/toji/gl-matrix/blob/master/src/gl-matrix/quat.js
	//----------------------------------------------
	//region Setter/Getters
		reset(){ this[0] = this[1] = this[2] = 0; this[3] = 1; return this; }

		get x(){ return this[0]; }	set x(val){ this[0] = val; }
		get y(){ return this[1]; }	set y(val){ this[1] = val; }
		get z(){ return this[2]; }	set z(val){ this[2] = val; }
		get w(){ return this[3]; }	set w(val){ this[3] = val; }

		rx(rad){ Quaternion.rotateX(this,this,rad); return this; }
		ry(rad){ Quaternion.rotateY(this,this,rad); return this; }
		rz(rad){ Quaternion.rotateZ(this,this,rad); return this; }
		
		setAxisAngle(axis, angle){ //AXIS MUST BE NORMALIZED.
			var halfAngle = angle * .5;
			var s = Math.sin(halfAngle);

			this[0] = axis[0] * s;
			this[1] = axis[1] * s;
			this[2] = axis[2] * s;
			this[3] = Math.cos(halfAngle);

			return this;
		}

		copy(q){
			this[0] = q[0];
			this[1] = q[1];
			this[2] = q[2];
			this[3] = q[3];
			return this;
		}

		clone(){ return new Quaternion(this); }
	//endregion
	

	//----------------------------------------------
	//region
		normalize(out){
			var len =  this[0]*this[0] + this[1]*this[1] + this[2]*this[2] + this[3]*this[3];
			if(len > 0){
				len = 1 / Math.sqrt(len);
				out = out || this;
				out[0] = this[0] * len;
				out[1] = this[1] * len;
				out[2] = this[2] * len;
				out[3] = this[3] * len;
			}
			return this;
		}

		mul(q, out){ return Quaternion.multi( out || this, this, q ); }	 	// THIS * Q
		pmul(q, out){ return Quaternion.multi( out || this , q, this ); }	// Q * THIS

		//AXIS MUST BE NORMALIZED.
		//mult(this, setAxisAngle(axis, angle) )
		mulAxisAngle(axis, angle, out){
			var ax	= this[0],		//This Quat
				ay	= this[1],
				az	= this[2],
				aw	= this[3],
				
				halfAngle = angle * .5,
				s	= Math.sin(halfAngle),
				bx	= axis[0] * s,	//New Quat based on axis and angle
				by	= axis[1] * s, 
				bz	= axis[2] * s,
				bw	= Math.cos(halfAngle);

			//Do quat.mult(a,b);
			out		= out || this;
			out[0]	= ax * bw + aw * bx + ay * bz - az * by;
			out[1]	= ay * bw + aw * by + az * bx - ax * bz;
			out[2]	= az * bw + aw * bz + ax * by - ay * bx;
			out[3]	= aw * bw - ax * bx - ay * by - az * bz;
			return out;
		}
	//endregion


	//----------------------------------------------
	//region Static Methods
		static mul(out,a,b){
			var ax = a[0], ay = a[1], az = a[2], aw = a[3],
				bx = b[0], by = b[1], bz = b[2], bw = b[3];

			out[0] = ax * bw + aw * bx + ay * bz - az * by;
			out[1] = ay * bw + aw * by + az * bx - ax * bz;
			out[2] = az * bw + aw * bz + ax * by - ay * bx;
			out[3] = aw * bw - ax * bx - ay * by - az * bz;
			return out;
		}

		static mulVec3(out,q,v){
			var ax = q[0], ay = q[1], az = q[2], aw = q[3],
				bx = v[0], by = v[1], bz = v[2];

			out[0] = ax + aw * bx + ay * bz - az * by;
			out[1] = ay + aw * by + az * bx - ax * bz;
			out[2] = az + aw * bz + ax * by - ay * bx;
			return out;
		}

		static rotateVec3(qa,va,out){
			out = out || va;

			//https://gamedev.stackexchange.com/questions/28395/rotating-vector3-by-a-quaternion
			//vprime = 2.0f * dot(u, v) * u
			//			+ (s*s - dot(u, u)) * v
			//			+ 2.0f * s * cross(u, v);
			var q = [qa[0],qa[1],qa[2]],		//Save the vector part of the Quaternion
				v = [va[0],va[1],va[2]],		//Make a copy of the vector, going to chg its value
				s = qa[3],						//Save Quaternion Scalar (W)
				d = Vec3.dot(q,v),	// U DOT V
				dq = Vec3.dot(q,q),	// U DOT U
				cqv = Vec3.cross(q,v,[0,0,0]);	// Cross Product for Q,V

			//Vec3.scalarRev(q,2.0 * d,q);
			//Vec3.scalarRev(v,s*s - dq,v);
			//Vec3.scalarRev(cqv,2.0 * s,cqv);

			Vec3.scale(q,	2.0 * d,	q);
			Vec3.scale(v,	s*s - dq,	v);
			Vec3.scale(cqv,	2.0 * s,	cqv);

			out[0] = q[0] + v[0] + cqv[0];
			out[1] = q[1] + v[1] + cqv[1];
			out[2] = q[2] + v[2] + cqv[2];
			return out;
		}

		//Ported to JS from C# example at https://pastebin.com/ubATCxJY
		//Note, if Dir and Up are equal, a roll happends. Need to find a way to fix this.
		static lookRotation(vDir, vUp, out){
			var zAxis	= new Vec3(vDir),	//Forward
				up		= new Vec3(vUp),
				xAxis	= new Vec3(),		//Right
				yAxis	= new Vec3();

			zAxis.normalize();
			Vec3.cross(up,zAxis,xAxis);
			xAxis.normalize();
			Vec3.cross(zAxis,xAxis,yAxis); //new up

			//fromAxis - Mat3 to Quaternion
			var m00 = xAxis.x, m01 = xAxis.y, m02 = xAxis.z,
				m10 = yAxis.x, m11 = yAxis.y, m12 = yAxis.z,
				m20 = zAxis.x, m21 = zAxis.y, m22 = zAxis.z,
				t = m00 + m11 + m22,
				x, y, z, w, s;

			if(t > 0.0){
				s = Math.sqrt(t + 1.0);
				w = s * 0.5 ; // |w| >= 0.5
				s = 0.5 / s;
				x = (m12 - m21) * s;
				y = (m20 - m02) * s;
				z = (m01 - m10) * s;
			}else if((m00 >= m11) && (m00 >= m22)){
				s = Math.sqrt(1.0 + m00 - m11 - m22);
				x = 0.5 * s;// |x| >= 0.5
				s = 0.5 / s;
				y = (m01 + m10) * s;
				z = (m02 + m20) * s;
				w = (m12 - m21) * s;
			}else if(m11 > m22){
				s = Math.sqrt(1.0 + m11 - m00 - m22);
				y = 0.5 * s; // |y| >= 0.5
				s = 0.5 / s;
				x = (m10 + m01) * s;
				z = (m21 + m12) * s;
				w = (m20 - m02) * s;
			}else{
				s = Math.sqrt(1.0 + m22 - m00 - m11);
				z = 0.5 * s; // |z| >= 0.5
				s = 0.5 / s;
				x = (m20 + m02) * s;
				y = (m21 + m12) * s;
				w = (m01 - m10) * s;
			}

			out = out || new Quaternion();
			out[0] = x;
			out[1] = y;
			out[2] = z;
			out[3] = w;
			return out;

			/*
			var num8 = (m00 + m11) + m22;
			if (num8 > 0.0){
				var num = Math.sqrt(num8 + 1.0);
				out.w = num * 0.5;
				num = 0.5 / num;
				out.x = (m12 - m21) * num;
				out.y = (m20 - m02) * num;
				out.z = (m01 - m10) * num;
				return out;
			}

			if((m00 >= m11) && (m00 >= m22)){
				var num7 = Math.sqrt(1.0 + m00 - m11 - m22);
				var num4 = 0.5 / num7;
				out.x = 0.5 * num7;
				out.y = (m01 + m10) * num4;
				out.z = (m02 + m20) * num4;
				out.w = (m12 - m21) * num4;
				return out;
			}

			if(m11 > m22){
				var num6 = Math.sqrt(((1.0 + m11) - m00) - m22);
				var num3 = 0.5 / num6;
				out.x = (m10 + m01) * num3;
				out.y = 0.5 * num6;
				out.z = (m21 + m12) * num3;
				out.w = (m20 - m02) * num3;
				return out;
			}

			var num5 = Math.sqrt(((1.0 + m22) - m00) - m11);
			var num2 = 0.5 / num5;
			out.x = (m20 + m02) * num2;
			out.y = (m21 + m12) * num2;
			out.z = 0.5 * num5;
			out.w = (m01 - m10) * num2;
			return out;
			*/
		}

		//https://github.com/toji/gl-matrix/blob/master/src/gl-matrix/quat.js
		static rotateX(out, a, rad){
			rad *= 0.5; 

			var ax = a[0], ay = a[1], az = a[2], aw = a[3],
				bx = Math.sin(rad), bw = Math.cos(rad);

			out[0] = ax * bw + aw * bx;
			out[1] = ay * bw + az * bx;
			out[2] = az * bw - ay * bx;
			out[3] = aw * bw - ax * bx;
			return out;
		}

		static rotateY(out, a, rad) {
			rad *= 0.5; 

			var ax = a[0], ay = a[1], az = a[2], aw = a[3],
				by = Math.sin(rad), bw = Math.cos(rad);

			out[0] = ax * bw - az * by;
			out[1] = ay * bw + aw * by;
			out[2] = az * bw + ax * by;
			out[3] = aw * bw - ay * by;
			return out;
		}

		static rotateZ(out, a, rad){
			rad *= 0.5; 

			var ax = a[0], ay = a[1], az = a[2], aw = a[3],
				bz = Math.sin(rad),
				bw = Math.cos(rad);

			out[0] = ax * bw + ay * bz;
			out[1] = ay * bw - ax * bz;
			out[2] = az * bw + aw * bz;
			out[3] = aw * bw - az * bz;
			return out;
		}

		//https://github.com/mrdoob/three.js/blob/dev/src/math/Quaternion.js
		static fromEuler(out, x, y, z, order="YZX"){
			var c1 = Math.cos(x/2),
				c2 = Math.cos(y/2),
				c3 = Math.cos(z/2),
				s1 = Math.sin(x/2),
				s2 = Math.sin(y/2),
				s3 = Math.sin(z/2);

			out = out || new Quaternion();
			switch(order){
				case 'XYZ':			
					out[0] = s1 * c2 * c3 + c1 * s2 * s3;
					out[1] = c1 * s2 * c3 - s1 * c2 * s3;
					out[2] = c1 * c2 * s3 + s1 * s2 * c3;
					out[3] = c1 * c2 * c3 - s1 * s2 * s3;
					break;
				case 'YXZ':
					out[0] = s1 * c2 * c3 + c1 * s2 * s3;
					out[1] = c1 * s2 * c3 - s1 * c2 * s3;
					out[2] = c1 * c2 * s3 - s1 * s2 * c3;
					out[3] = c1 * c2 * c3 + s1 * s2 * s3;
					break;
				case 'ZXY':
					out[0] = s1 * c2 * c3 - c1 * s2 * s3;
					out[1] = c1 * s2 * c3 + s1 * c2 * s3;
					out[2] = c1 * c2 * s3 + s1 * s2 * c3;
					out[3] = c1 * c2 * c3 - s1 * s2 * s3;
					break;
				case 'ZYX':
					out[0] = s1 * c2 * c3 - c1 * s2 * s3;
					out[1] = c1 * s2 * c3 + s1 * c2 * s3;
					out[2] = c1 * c2 * s3 - s1 * s2 * c3;
					out[3] = c1 * c2 * c3 + s1 * s2 * s3;
					break;
				case 'YZX':
					out[0] = s1 * c2 * c3 + c1 * s2 * s3;
					out[1] = c1 * s2 * c3 + s1 * c2 * s3;
					out[2] = c1 * c2 * s3 - s1 * s2 * c3;
					out[3] = c1 * c2 * c3 - s1 * s2 * s3;
					break;
				case 'XZY':
					out[0] = s1 * c2 * c3 - c1 * s2 * s3;
					out[1] = c1 * s2 * c3 - s1 * c2 * s3;
					out[2] = c1 * c2 * s3 + s1 * s2 * c3;
					out[3] = c1 * c2 * c3 + s1 * s2 * s3;
					break;
			}

			return out;
		}

		//http://bediyap.com/programming/convert-quaternion-to-euler-rotations/
		//http://schteppe.github.io/cannon.js/docs/files/src_math_Quaternion.js.html
		static toEuler(q, out){ //order="YZX"
			var x		= q[0],
				y		= q[1],
				z		= q[2],
				w		= q[3],
				test	= x*y + z*w,
				pitch, yaw, roll;

			//..............................
			// singularity at north pole
			if(test > 0.499){ //console.log("North");
				pitch	= 2 * Math.atan2(x,w);
				yaw		= Math.PI/2;
				roll	= 0;
			}

			//..............................
			// singularity at south pole
			if(test < -0.499){ //console.log("South");
				pitch	= -2 * Math.atan2(x,w);
				yaw		= - Math.PI/2;
				roll	= 0;
			}

			//..............................
			if(isNaN(pitch)){ //console.log("isNan");
				var sqz	= z*z;
				roll	= Math.atan2(2*x*w - 2*y*z , 1 - 2*x*x - 2*sqz); // bank
				pitch	= Math.atan2(2*y*w - 2*x*z , 1 - 2*y*y - 2*sqz); // Heading
				yaw		= Math.asin(2*test); // attitude
			}

			//..............................
			out		= out || new Vec3();
			out[0]	= roll;
			out[1]	= pitch;
			out[2]	= yaw;
			return out;
		}

		static lerp(a, b, t, out){
			var ax = a[0],
				ay = a[1],
				az = a[2],
				aw = a[3];
			out		= out || new Quaternion();
			out[0]	= ax + t * (b[0] - ax);
			out[1]	= ay + t * (b[1] - ay);
			out[2]	= az + t * (b[2] - az);
			out[3]	= aw + t * (b[3] - aw);
			return out;
		}

		static lerp2(a, b, t, out){
			var tm1 = 1 - t;
			out		= out || new Quaternion();
			out[0]	= a[0] * tm1 + b[0] * t;
			out[1]	= a[1] * tm1 + b[1] * t;
			out[2]	= a[2] * tm1 + b[2] * t;
			out[3]	= a[3] * tm1 + b[3] * t;
			return out;
		}

		//https://github.com/toji/gl-matrix/blob/master/src/gl-matrix/quat.js
		static invert(a,out) {
			let a0	= a[0],
				a1	= a[1],
				a2	= a[2],
				a3	= a[3],
				dot	= a0*a0 + a1*a1 + a2*a2 + a3*a3;
			
			// TODO: Would be faster to return [0,0,0,0] immediately if dot == 0
			if(dot == 0){ out[0] = out[1] = out[2] = out[3] = 0; }

			let invDot = dot ? 1.0/dot : 0;
			out		= out || new Quaternion();
			out[0]	= -a0*invDot;
			out[1]	= -a1*invDot;
			out[2]	= -a2*invDot;
			out[3]	= a3*invDot;
			return out;
		}
	//endregion
}

export default Quaternion;


/*

unction slerp(out, a, b, t) {
  // benchmarks:
  //    http://jsperf.com/quaternion-slerp-implementations
  let ax = a[0], ay = a[1], az = a[2], aw = a[3];
  let bx = b[0], by = b[1], bz = b[2], bw = b[3];

  let omega, cosom, sinom, scale0, scale1;

  // calc cosine
  cosom = ax * bx + ay * by + az * bz + aw * bw;
  // adjust signs (if necessary)
  if ( cosom < 0.0 ) {
    cosom = -cosom;
    bx = - bx;
    by = - by;
    bz = - bz;
    bw = - bw;
  }
  // calculate coefficients
  if ( (1.0 - cosom) > 0.000001 ) {
    // standard case (slerp)
    omega  = Math.acos(cosom);
    sinom  = Math.sin(omega);
    scale0 = Math.sin((1.0 - t) * omega) / sinom;
    scale1 = Math.sin(t * omega) / sinom;
  } else {
    // "from" and "to" quaternions are very close
    //  ... so we can do a linear interpolation
    scale0 = 1.0 - t;
    scale1 = t;
  }
  // calculate final values
  out[0] = scale0 * ax + scale1 * bx;
  out[1] = scale0 * ay + scale1 * by;
  out[2] = scale0 * az + scale1 * bz;
  out[3] = scale0 * aw + scale1 * bw;

  return out;
}
*/