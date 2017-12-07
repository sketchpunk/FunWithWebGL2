import Vec3 from "./Vec3.js";

class Quaternion extends Float32Array{
	constructor(){
		super(4);
		this[0] = this[1] = this[2] = 0;
		this[3] = 1;
		this.isModified = false;
	}
	//http://in2gpu.com/2016/03/14/opengl-fps-camera-quaternion/
	//----------------------------------------------
	//region Setter/Getters
		reset(){ this[0] = this[1] = this[2] = 0; this[3] = 1; this.isModified = false; return this; }

		get x(){ return this[0]; }	set x(val){ this[0] = val; this.isModified = true; }
		get y(){ return this[1]; }	set y(val){ this[1] = val; this.isModified = true; }
		get z(){ return this[2]; }	set z(val){ this[2] = val; this.isModified = true; }
		get w(){ return this[3]; }	set w(val){ this[3] = val; this.isModified = true; }

		rx(rad){ Quaternion.rotateX(this,this,rad); this.isModified = true; return this; }
		ry(rad){ Quaternion.rotateY(this,this,rad); this.isModified = true; return this; }
		rz(rad){ Quaternion.rotateZ(this,this,rad); this.isModified = true; return this; }
		
		setAxisAngle(axis, angle){ //AXIS MUST BE NORMALIZED.
			var halfAngle = angle * .5;
			var s = Math.sin(halfAngle);

			this[0] = axis[0] * s;
			this[1] = axis[1] * s;
			this[2] = axis[2] * s;
			this[3] = Math.cos(halfAngle);

			this.isModified = true;
			return this;
		}

		copy(q){
			this[0] = q[0];
			this[1] = q[1];
			this[2] = q[2];
			this[3] = q[3];
			this.isModified = true;
			return this;
		}

		//ex(deg){ Quaternion.rotateX(this,this,deg * DEG2RAD); this.isModified = true; return this; }
		//ey(deg){ Quaternion.rotateY(this,this,deg * DEG2RAD); this.isModified = true; return this; }
		//ez(deg){ Quaternion.rotateZ(this,this,deg * DEG2RAD); this.isModified = true; return this; }
	//endregion
	
	normalize(out){
		var len =  this[0]*this[0] + this[1]*this[1] + this[2]*this[2] + this[3]*this[3];
		if(len > 0){
			len = 1 / Math.sqrt(len);
			out = out || this;
			out[0] = this[0] * len;
			out[1] = this[1] * len;
			out[2] = this[2] * len;
			out[3] = this[3] * len;
			if(out === this) this.isModified = true;
		}
		return this;
	}

	//----------------------------------------------
	//region Static Methods
		static multi(out,a,b){
			var ax = a[0], ay = a[1], az = a[2], aw = a[3],
			bx = b[0], by = b[1], bz = b[2], bw = b[3];

			out[0] = ax * bw + aw * bx + ay * bz - az * by;
			out[1] = ay * bw + aw * by + az * bx - ax * bz;
			out[2] = az * bw + aw * bz + ax * by - ay * bx;
			out[3] = aw * bw - ax * bx - ay * by - az * bz;
			return out;
		}

		static multiVec3(out,q,v){
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

			Vec3.scalarRev(q,2.0 * d,q);
			Vec3.scalarRev(v,s*s - dq,v);
			Vec3.scalarRev(cqv,2.0 * s,cqv);

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
			out[0] = x;
			out[1] = y;
			out[2] = z;
			out[3] = w;

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
			bz = Math.sin(rad), bw = Math.cos(rad);

			out[0] = ax * bw + ay * bz;
			out[1] = ay * bw - ax * bz;
			out[2] = az * bw + aw * bz;
			out[3] = aw * bw - az * bz;
			return out;
		}

		//https://github.com/mrdoob/three.js/blob/dev/src/math/Quaternion.js
		static setFromEuler(out,x,y,z,order){
			var c1 = Math.cos(x/2),
				c2 = Math.cos(y/2),
				c3 = Math.cos(z/2),
				s1 = Math.sin(x/2),
				s2 = Math.sin(y/2),
				s3 = Math.sin(z/2);

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
		}

		static lerp(out,a,b,t){
			var ax = a[0],
				ay = a[1],
				az = a[2],
				aw = a[3];
			out[0] = ax + t * (b[0] - ax);
			out[1] = ay + t * (b[1] - ay);
			out[2] = az + t * (b[2] - az);
			out[3] = aw + t * (b[3] - aw);

			if(out.isModified !== undefined) out.isModified = true;
			return out;
		}

		//https://github.com/toji/gl-matrix/blob/master/src/gl-matrix/quat.js
		static invert(out, a) {
				let a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
				let dot = a0*a0 + a1*a1 + a2*a2 + a3*a3;
				let invDot = dot ? 1.0/dot : 0;
				// TODO: Would be faster to return [0,0,0,0] immediately if dot == 0

			out[0] = -a0*invDot;
			out[1] = -a1*invDot;
			out[2] = -a2*invDot;
			out[3] = a3*invDot;
			return out;
		}
	//endregion
}

export default Quaternion