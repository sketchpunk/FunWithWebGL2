class Vec3 extends Float32Array{
	constructor(ini){
		super(3);
		if(ini instanceof Vec3 || (ini && ini.length == 3)){
			this[0] = ini[0]; this[1] = ini[1]; this[2] = ini[2];
		}else if(arguments.length == 3){
			this[0] = arguments[0]; this[1] = arguments[1]; this[2] = arguments[2];
		}else{
			this[0] = this[1] = this[2] = ini || 0;
		}
	}

	//----------------------------------------------
	//region Getters and Setters
		set(x,y,z){ this[0] = x; this[1] = y; this[2] = z; return this;}

		get x(){ return this[0]; }	set x(val){ this[0] = val; }
		get y(){ return this[1]; }	set y(val){ this[1] = val; }
		get z(){ return this[2]; }	set z(val){ this[2] = val; }

		clone(){ return new Vec3(this); }
		
		copy(v){ this[0] = v[0]; this[1] = v[1]; this[2] = v[2]; return this; }

		setLength(len){ return this.normalize().scale(len); }

		length(v){
			//Only get the magnitude of this vector
			if(v === undefined) return Math.sqrt( this[0]*this[0] + this[1]*this[1] + this[2]*this[2] );

			//Get magnitude based on another vector
			var x = this[0] - v[0],
				y = this[1] - v[1],
				z = this[2] - v[2];

			return Math.sqrt( x*x + y*y + z*z );
		}
		
		lengthSqr(v){
			//Only get the squared magnitude of this vector
			if(v === undefined) return this[0]*this[0] + this[1]*this[1] + this[2]*this[2];

			//Get squared magnitude based on another vector
			var x = this[0] - v[0],
				y = this[1] - v[1],
				z = this[2] - v[2];

			return x*x + y*y + z*z;
		}

		normalize(out){
			var mag = Math.sqrt( this[0]*this[0] + this[1]*this[1] + this[2]*this[2] );
			if(mag == 0) return this;

			out = out || this;
			out[0] = this[0] / mag;
			out[1] = this[1] / mag;
			out[2] = this[2] / mag;

			return out;
		}

		//When values are very small, like less then 0.000001, just make it zero.
		nearZero(out){
			out = out || this;

			if(Math.abs(out[0]) <= 1e-6) out[0] = 0;
			if(Math.abs(out[1]) <= 1e-6) out[1] = 0;
			if(Math.abs(out[2]) <= 1e-6) out[2] = 0;

			return out;
		}

		invert(out){
			out = out || this;
			out[0] = -this[0];
			out[1] = -this[1];
			out[2] = -this[2];
			return out;
		}
	//endregion

	//----------------------------------------------
	//region Methods
		scale(v,out){
			out = out || this;
			out[0] = this[0] * v;
			out[1] = this[1] * v;
			out[2] = this[2] * v;
			return out;
		}

		divScale(v,out){
			out = out || this;
			out[0] = this[0] / v;
			out[1] = this[1] / v;
			out[2] = this[2] / v;
			return out;
		}

		mul(v,out){
			out = out || this;
			out[0] = this[0] * v[0];
			out[1] = this[1] * v[1];
			out[2] = this[2] * v[2];

			return out;
		}

		add(v,out){
			out = out || this;
			out[0] = this[0] + v[0];
			out[1] = this[1] + v[1];
			out[2] = this[2] + v[2];
			return out;
		}

		sub(v,out){
			out = out || this;
			out[0] = this[0] - v[0];
			out[1] = this[1] - v[1];
			out[2] = this[2] - v[2];
			return out;
		}

		div(v,out){
			out = out || this;
			out[0] = (v[0] != 0)? this[0] / v[0] : 0;
			out[1] = (v[1] != 0)? this[1] / v[1] : 0;
			out[2] = (v[2] != 0)? this[2] / v[2] : 0;

			return out;
		}

		divInvScale(v,out){
			out = out || this;
			out[0] = (this[0] != 0)? v / this[0] : 0;
			out[1] = (this[1] != 0)? v / this[1] : 0;
			out[2] = (this[2] != 0)? v / this[2] : 0;
			return out;
		}	

		abs(v,out){
			out = out || this;
			out[0] = Math.abs( this[0] );
			out[1] = Math.abs( this[1] );
			out[2] = Math.abs( this[2] );
			return out;
		}


		transformMat3(m,out){
			var x = this[0], y = this[1], z = this[2];
			out = out || this;
			out[0] = x * m[0] + y * m[3] + z * m[6];
			out[1] = x * m[1] + y * m[4] + z * m[7];
			out[2] = x * m[2] + y * m[5] + z * m[8];
			return out;
		}

		transformMat4(m,out){
		    var x = this[0], y = this[1], z = this[2],
		        w = m[3] * x + m[7] * y + m[11] * z + m[15];
		    w = w || 1.0;

		    out = out || this;
		    out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
		    out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
		    out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
		    return out;
		}

		//https://www.siggraph.org/education/materials/HyperGraph/modeling/mod_tran/3drota.htm
		rotate(rad, axis = "x", out = null){
			out = out || this;

			var sin = Math.sin(rad),
				cos = Math.cos(rad),
				x 	= this[0],
				y 	= this[1],
				z 	= this[2];

			switch(axis){
				case "y": //..........................
					out[0]	= z*sin + x*cos; //x
					out[2]	= z*cos - x*sin; //z
				break;
				case "x": //..........................
					out[1]	= y*cos - z*sin; //y
					out[2]	= y*sin + z*cos; //z
				break;
				case "z": //..........................
					out[0]	= x*cos - y*sin; //x
					out[1]	= x*sin + y*cos; //y
				break;
			}

			return out;
		}

		lerp(v, t, out){
			if(out == null) out = this;
			var tMin1 = 1 - t;

			//Linear Interpolation : (1 - t) * v0 + t * v1;
			out[0] = this[0] * tMin1 + v[0] * t;
			out[1] = this[1] * tMin1 + v[1] * t;
			out[2] = this[2] * tMin1 + v[2] * t;
			return out;
		}
	//endregion

	//----------------------------------------------
	//region Static
		//static scalarRev(v,s,out){ //TODO, Is this even needed?
		//	out = out || new Vec3();
		//	out[0] = s * v[0];
		//	out[1] = s * v[1];
		//	out[2] = s * v[2];
		//	return out;
		//}

		static add(a, b, out){ 
			out = out || new Vec3();
			out[0] = a[0] + b[0];
			out[1] = a[1] + b[1];
			out[2] = a[2] + b[2];
			return out;
		}
		static sub(a, b, out){ 
			out = out || new Vec3();
			out[0] = a[0] - b[0];
			out[1] = a[1] - b[1];
			out[2] = a[2] - b[2];
			return out;
		}
		static mul(a, b, out){
			out = out || new Vec3();
			out[0] = a[0] * b[0];
			out[1] = a[1] * b[1];
			out[2] = a[2] * b[2];
			return out;
		}
		static div(a,b,out){
			out = out || new Vec3();
			out[0] = (b[0] != 0)? a[0] / b[0] : 0;
			out[1] = (b[1] != 0)? a[1] / b[1] : 0;
			out[2] = (b[2] != 0)? a[2] / b[2] : 0;
			return out;
		}
		static scale(v,s,out){
			out	= out || new Vec3();
			out[0] = v[0] * s;
			out[1] = v[1] * s;
			out[2] = v[2] * s;
			return out;
		}

		static invert(v,out){
			out	= out || new Vec3();
			out[0] = -v[0];
			out[1] = -v[1];
			out[2] = -v[2];
			return out;
		}

		static abs(v,out){
			out = out || new Vec3();
			out[0] = Math.abs( v[0] );
			out[1] = Math.abs( v[1] );
			out[2] = Math.abs( v[2] );
			return out;
		}

		static norm(v, out){
			var mag = Math.sqrt( v[0]*v[0] + v[1]*v[1] + v[2]*v[2] );
			if(mag == 0) return null;
			out		= out || new Vec3();

			mag 	= 1 / mag;
			out[0]	= v[0] * mag;
			out[1]	= v[1] * mag;
			out[2]	= v[2] * mag;
			return out
		}

		static dot(a,b){ return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
		static cross(a,b,out){
			var ax = a[0], ay = a[1], az = a[2],
				bx = b[0], by = b[1], bz = b[2];

			out	= out || new Vec3();
			out[0] = ay * bz - az * by;
			out[1] = az * bx - ax * bz;
			out[2] = ax * by - ay * bx;
			return out;
		}

		static lerp(a, b, t, out){
			out = out || new Vec3();
			let ax = a[0],
				ay = a[1],
				az = a[2];
			out[0] = ax + t * (b[0] - ax);
			out[1] = ay + t * (b[1] - ay);
			out[2] = az + t * (b[2] - az);
			return out;
		}

		//https://github.com/toji/gl-matrix/blob/master/src/gl-matrix/vec3.js#L514
		static transformQuat(a, q, out) {
			// benchmarks: https://jsperf.com/quaternion-transform-vec3-implementations-fixed
			let qx	= q[0], qy	= q[1], qz	= q[2], qw = q[3],
				x	= a[0], y	= a[1], z	= a[2];

			// var qvec = [qx, qy, qz];
			// var uv = vec3.cross([], qvec, a);
			let uvx = qy * z - qz * y,
				uvy = qz * x - qx * z,
				uvz = qx * y - qy * x;
			// var uuv = vec3.cross([], qvec, uv);
			let uuvx = qy * uvz - qz * uvy,
				uuvy = qz * uvx - qx * uvz,
				uuvz = qx * uvy - qy * uvx;
			// vec3.scale(uv, uv, 2 * w);
			let w2 = qw * 2;
			uvx *= w2;
			uvy *= w2;
			uvz *= w2;
			// vec3.scale(uuv, uuv, 2);
			uuvx *= 2;
			uuvy *= 2;
			uuvz *= 2;

			// return vec3.add(out, a, vec3.add(out, uv, uuv));
			out = out || new Vec3();
			out[0] = x + uvx + uuvx;
			out[1] = y + uvy + uuvy;
			out[2] = z + uvz + uuvz;
			return out;
		}

		static createArray(len){
			var i, ary = new Array(len);
			for(i=0; i < len; i++) ary[i] = new Vec3();
			return ary;
		}


		//When values are very small, like less then 0.000001, just make it zero.
		static nearZero(v, out){
			out = out || new Vec3();

			out[0] = (Math.abs(v[0]) <= 1e-6) ? 0 : v[0];
			out[1] = (Math.abs(v[1]) <= 1e-6) ? 0 : v[1];
			out[2] = (Math.abs(v[2]) <= 1e-6) ? 0 : v[2];

			return out;
		}

		//Another Equation for Linear Interpolation : (1 - t) * v0 + t * v1;
		//Todo, see if this one work better then whats there.
		/*
		static lerp(a, b, t, out){
			out = out || new Vec3();

			let ax = a[0],
				ay = a[1],
				az = a[2],
				tMin1 = 1 - t;

			out[0] = tMin1 * ax + t * b[0];
			out[1] = tMin1 * ay + t * b[1];
			out[2] = tMin1 * az + t * b[2];
			return out;
		}
		*/
	//endregion

}


//..........................................
Vec3.UP			= [0,1,0];
Vec3.DOWN		= [0,-1,0];
Vec3.LEFT		= [1,0,0];
Vec3.RIGHT		= [-1,0,0];
Vec3.FORWARD	= [0,0,1];
Vec3.BACK		= [0,0,-1];
Vec3.ZERO		= [0,0,0];


//..........................................
export default Vec3;


/**
 * Performs a bezier interpolation with two control points
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {vec3} c the third operand
 * @param {vec3} d the fourth operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {vec3} out

export function bezier(out, a, b, c, d, t) {
  let inverseFactor = 1 - t;
  let inverseFactorTimesTwo = inverseFactor * inverseFactor;
  let factorTimes2 = t * t;
  let factor1 = inverseFactorTimesTwo * inverseFactor;
  let factor2 = 3 * t * inverseFactorTimesTwo;
  let factor3 = 3 * factorTimes2 * inverseFactor;
  let factor4 = factorTimes2 * t;

  out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
  out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
  out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;

  return out;
}
 */