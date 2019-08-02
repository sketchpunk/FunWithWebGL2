import Vec3 from "./Vec3.js";

// http://in2gpu.com/2016/03/14/opengl-fps-camera-Quat/
// https://github.com/toji/gl-matrix/blob/master/src/gl-matrix/quat.js

class Quat extends Float32Array{
	constructor(q = null){
		super(4);
		if(q != null && q instanceof Quat){
			this[0] = q[0];
			this[1] = q[1];
			this[2] = q[2];
			this[3] = q[3];
		}else if( arguments.length == 4 ){
			this[0] = arguments[0];
			this[1] = arguments[1];
			this[2] = arguments[2];
			this[3] = arguments[3];
		}else{
			this[0] = this[1] = this[2] = 0;
			this[3] = 1;
		}
	}


	////////////////////////////////////////////////////////////////////
	// GETTER - SETTERS
	////////////////////////////////////////////////////////////////////
		reset(){ this[0] = this[1] = this[2] = 0; this[3] = 1; return this; }

		get x(){ return this[0]; }	set x(val){ this[0] = val; }
		get y(){ return this[1]; }	set y(val){ this[1] = val; }
		get z(){ return this[2]; }	set z(val){ this[2] = val; }
		get w(){ return this[3]; }	set w(val){ this[3] = val; }

		rx(rad){ Quat.rotateX(this, rad); return this; }
		ry(rad){ Quat.rotateY(this, rad); return this; }
		rz(rad){ Quat.rotateZ(this, rad); return this; }
		
		setAxisAngle( axis, angle ){ //AXIS MUST BE NORMALIZED.
			var halfAngle = angle * .5;
			var s = Math.sin(halfAngle);

			this[0] = axis[0] * s;
			this[1] = axis[1] * s;
			this[2] = axis[2] * s;
			this[3] = Math.cos(halfAngle);

			return this;
		}

		getAxisAngle(){
			if(this[3] > 1) this.norm();

			let angle 	= 2 * Math.acos(this[3]),
				s		= Math.sqrt(1 - this[3] * this[3]);

			if(s < 0.001)  return [ 1 , 0 , 0, 0];

			return [ this[0] / s, this[1] / s, this[2] / s, angle ];
		}

		getAxis(out = null){
			if(this[3] > 1) this.norm();
			
			let s = Math.sqrt(1 - this[3] * this[3]);

			out = out || new Vec3();
			if(s < 0.001){
				out[0] = 1;
				out[1] = 0;
				out[2] = 0;
 			}else{
 				out[0] = this[0] / s;
				out[1] = this[1] / s;
				out[2] = this[2] / s;
 			}

 			return out;
		}

		copy(q){
			this[0] = q[0];
			this[1] = q[1];
			this[2] = q[2];
			this[3] = q[3];
			return this;
		}

		clone(){ return new Quat(this); }

		from_mul( a, b ){
			var ax = a[0], ay = a[1], az = a[2], aw = a[3],
				bx = b[0], by = b[1], bz = b[2], bw = b[3];
			this[0] = ax * bw + aw * bx + ay * bz - az * by;
			this[1] = ay * bw + aw * by + az * bx - ax * bz;
			this[2] = az * bw + aw * bz + ax * by - ay * bx;
			this[3] = aw * bw - ax * bx - ay * by - az * bz;
			return this;
		}

		from_axis( xAxis, yAxis, zAxis ){
			var m00 = xAxis[0], m01 = xAxis[1], m02 = xAxis[2],
				m10 = yAxis[0], m11 = yAxis[1], m12 = yAxis[2],
				m20 = zAxis[0], m21 = zAxis[1], m22 = zAxis[2],
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

			this[0] = x;
			this[1] = y;
			this[2] = z;
			this[3] = w;
			return this;
		}

		from_polar( lon, lat, up=null ){
			lat = Math.max( Math.min( lat, 89.999999 ), -89.999999 ); // Clamp lat, going to 90+ makes things spring around.

			let phi 	= ( 90 - lat ) * 0.01745329251, // PI / 180
				theta 	= lon * 0.01745329251,
				phi_s	= Math.sin( phi ),
				v		= [
					-( phi_s * Math.sin( theta ) ),
					Math.cos( phi ),
					phi_s * Math.cos( theta )
				];

			return Quat.look( v, up || Vec3.UP, this );
		}

		from_look( dir, up ){ return Quat.look( dir, up, this ); }


		from_euler( x, y, z ){ //order="YXZ", Values in Degrees, will be converted to Radians by function
			var xx = x * 0.01745329251 * 0.5,
				yy = y * 0.01745329251 * 0.5,
				zz = z * 0.01745329251 * 0.5,
				c1 = Math.cos( xx ),
				c2 = Math.cos( yy ),
				c3 = Math.cos( zz ),
				s1 = Math.sin( xx ),
				s2 = Math.sin( yy ),
				s3 = Math.sin( zz );
			this[0] = s1 * c2 * c3 + c1 * s2 * s3;
			this[1] = c1 * s2 * c3 - s1 * c2 * s3;
			this[2] = c1 * c2 * s3 - s1 * s2 * c3;
			this[3] = c1 * c2 * c3 + s1 * s2 * s3;
			this.norm();
			return this;
		}

		from_euler_xy( x, y ){ //order="YXZ", Values in Degrees, will be converted to Radians by function
			var xx = x * 0.01745329251 * 0.5,
				yy = y * 0.01745329251 * 0.5,
				c1 = Math.cos( xx ),
				c2 = Math.cos( yy ),
				s1 = Math.sin( xx ),
				s2 = Math.sin( yy );
			this[0] = s1 * c2 ;
			this[1] = c1 * s2 ;
			this[2] = -s1 * s2;
			this[3] = c1 * c2;
			this.norm();
			return this;
		}

		//Using unit vectors, Shortest rotation from Direction A to Direction B
		//http://glmatrix.net/docs/quat.js.html#line548
		//http://physicsforgames.blogspot.com/2010/03/Quat-tricks.html
		from_unit_vecs( a, b ){
			let dot = Vec3.dot( a, b );

		    if(dot < -0.999999){
		      let tmp = Vec3.cross( Vec3.LEFT, a );
		      if( tmp.length() < 0.000001 ) Vec3.cross( Vec3.UP, a, tmp );
		      this.setAxisAngle( tmp.norm(), Math.PI );
		    }else if(dot > 0.999999){
		      this[0] = 0;
		      this[1] = 0;
		      this[2] = 0;
		      this[3] = 1;
		    }else{
		      let v = Vec3.cross(a, b);
		      this[0] = v[0];
		      this[1] = v[1];
		      this[2] = v[2];
		      this[3] = 1 + dot;
		      this.norm();
		    }
		    return this;
		}

		random(){ // http://planning.cs.uiuc.edu/node198.html  uniform random quaternion
			let u1 = Math.random(),
				u2 = Math.random(),
				u3 = Math.random(),
				r1 = Math.sqrt( 1-u1 ),
				r2 = Math.sqrt( u1 );

			this[0] = r1 * Math.sin( Maths.PI_2 * u2 );
			this[1] = r1 * Math.cos( Maths.PI_2 * u2 );
			this[2] = r2 * Math.sin( Maths.PI_2 * u3 );
			this[3] = r2 * Math.cos( Maths.PI_2 * u3 );
			return this;
		}


	////////////////////////////////////////////////////////////////////
	// INSTANCE OPERATIONS
	////////////////////////////////////////////////////////////////////
		norm(out = null){
			var len =  this[0]*this[0] + this[1]*this[1] + this[2]*this[2] + this[3]*this[3];
			out = out || this;

			if(len > 0){
				len = 1 / Math.sqrt(len);
				out = out || this;
				out[0] = this[0] * len;
				out[1] = this[1] * len;
				out[2] = this[2] * len;
				out[3] = this[3] * len;
			}
			return out;
		}

		mul( q, out=null ){ return Quat.mul( this, q, out || this ); }	// THIS * Q
		pmul( q, out=null ){ return Quat.mul( q, this, out || this ); }	// Q * THIS

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

		invert(out) {
			let a0	= this[0],
				a1	= this[1],
				a2	= this[2],
				a3	= this[3],
				dot	= a0*a0 + a1*a1 + a2*a2 + a3*a3;
			
			// Would be faster to return [0,0,0,0] immediately if dot == 0
			if(dot == 0){ out[0] = out[1] = out[2] = out[3] = 0; }

			let invDot = 1.0 / dot; // let invDot = dot ? 1.0/dot : 0;
			out		=  out || this;
			out[0]	= -a0 * invDot;
			out[1]	= -a1 * invDot;
			out[2]	= -a2 * invDot;
			out[3]	=  a3 * invDot;
			return out;
		}

		negate( out ){
			out = out || this;
			out[0] = -this[0];
			out[1] = -this[1];
			out[2] = -this[2];
			out[3] = -this[3];
			return out;
		}

		mirror_x( out=null ){
			out = out || this;
			out[1] = -this[1];
			out[2] = -this[2];
			return out;
		}


	////////////////////////////////////////////////////////////////////
	// STATIC GETTER / SETTERS
	////////////////////////////////////////////////////////////////////
		static dot( a, b ){ return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }


		//Ported to JS from C# example at https://pastebin.com/ubATCxJY
		//Note, if Dir and Up are equal, a roll happends. Need to find a way to fix this.
		static look( vDir, vUp, out = null ){
			var zAxis	= new Vec3(vDir),	//Forward
				up		= new Vec3(vUp),
				xAxis	= new Vec3(),		//Right
				yAxis	= new Vec3();

			Vec3.cross(up,zAxis,xAxis);
			Vec3.cross(zAxis,xAxis,yAxis); //new up

			xAxis.norm();
			yAxis.norm();
			zAxis.norm();

			//fromAxis - Mat3 to Quat
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

			out = out || new Quat();
			out[0] = x;
			out[1] = y;
			out[2] = z;
			out[3] = w;
			return out;
		}

		//Using unit vectors, Shortest rotation from Direction A to Direction B
		//http://glmatrix.net/docs/quat.js.html#line548
		//http://physicsforgames.blogspot.com/2010/03/Quat-tricks.html
		static rotationTo( a, b, out = null ){
			let dot = Vec3.dot(a, b);
			out = out || new Quat();

		    if (dot < -0.999999) {
		      let tmp = Vec3.cross(Vec3.LEFT, a);
		      //if(Vec3.len(tmp) < 0.000001) Vec3.cross(Vec3.UP, a, tmp);
		      if(tmp.length() < 0.000001) Vec3.cross(Vec3.UP, a, tmp);
		      out.setAxisAngle( tmp.norm(), Math.PI);
		    }else if(dot > 0.999999){
		      out[0] = 0;
		      out[1] = 0;
		      out[2] = 0;
		      out[3] = 1;
		    }else{
		      let v = Vec3.cross(a, b);
		      out[0] = v[0];
		      out[1] = v[1];
		      out[2] = v[2];
		      out[3] = 1 + dot;
		      out.norm();
		    }
		    return out;
		}

		static axisAngle( axis, angle, out=null){ //AXIS MUST BE NORMALIZED.
			let halfAngle	= angle * .5,
				s			= Math.sin(halfAngle);

			out = out || new Quat();
			out[0] = axis[0] * s;
			out[1] = axis[1] * s;
			out[2] = axis[2] * s;
			out[3] = Math.cos(halfAngle);

			return out;
		}

		static fromAxis(xAxis, yAxis, zAxis, out = null){
			var m00 = xAxis[0], m01 = xAxis[1], m02 = xAxis[2],
				m10 = yAxis[0], m11 = yAxis[1], m12 = yAxis[2],
				m20 = zAxis[0], m21 = zAxis[1], m22 = zAxis[2],
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

			out = out || new Quat();
			out[0] = x;
			out[1] = y;
			out[2] = z;
			out[3] = w;
			return out;
		}

		// https://github.com/toji/gl-matrix/blob/master/src/gl-matrix/quat.js#L305
		static fromMat3(m, out){
			// Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
			// article "Quat Calculus and Fast Animation".
			let fRoot, fTrace = m[0] + m[4] + m[8];

			if( fTrace > 0.0 ){
				// |w| > 1/2, may as well choose w > 1/2
				fRoot	= Math.sqrt( fTrace + 1.0 );  // 2w
				out[3]	= 0.5 * fRoot;
				
				fRoot	= 0.5 / fRoot;  // 1/(4w)
				out[0]	= (m[5]-m[7])*fRoot;
				out[1]	= (m[6]-m[2])*fRoot;
				out[2]	= (m[1]-m[3])*fRoot;
			}else{
				// |w| <= 1/2
				let i = 0;

				if ( m[4] > m[0] )		i = 1;
				if ( m[8] > m[i*3+i] )	i = 2;
				
				let j = (i+1) % 3;
				let k = (i+2) % 3;

				fRoot	= Math.sqrt( m[i*3+i] - m[j*3+j] - m[k*3+k] + 1.0);
				out[i]	= 0.5 * fRoot;

				fRoot	= 0.5 / fRoot;
				out[3]	= ( m[j*3+k] - m[k*3+j] ) * fRoot;
				out[j]	= ( m[j*3+i] + m[i*3+j] ) * fRoot;
				out[k]	= ( m[k*3+i] + m[i*3+k] ) * fRoot;
			}
			return out;
		}

		// https://github.com/toji/gl-matrix/blob/master/src/mat4.js
		// Algorithm taken from http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuat/index.htm
		static fromMat4(mat, out){
			out = out || new Quat();

			let trace = mat[0] + mat[5] + mat[10];
			let S = 0;

			if (trace > 0) {
				S = Math.sqrt(trace + 1.0) * 2;
				out[3] = 0.25 * S;
				out[0] = (mat[6] - mat[9]) / S;
				out[1] = (mat[8] - mat[2]) / S;
				out[2] = (mat[1] - mat[4]) / S;
			} else if ((mat[0] > mat[5]) && (mat[0] > mat[10])) {
				S = Math.sqrt(1.0 + mat[0] - mat[5] - mat[10]) * 2;
				out[3] = (mat[6] - mat[9]) / S;
				out[0] = 0.25 * S;
				out[1] = (mat[1] + mat[4]) / S;
				out[2] = (mat[8] + mat[2]) / S;
			} else if (mat[5] > mat[10]) {
				S = Math.sqrt(1.0 + mat[5] - mat[0] - mat[10]) * 2;
				out[3] = (mat[8] - mat[2]) / S;
				out[0] = (mat[1] + mat[4]) / S;
				out[1] = 0.25 * S;
				out[2] = (mat[6] + mat[9]) / S;
			} else {
				S = Math.sqrt(1.0 + mat[10] - mat[0] - mat[5]) * 2;
				out[3] = (mat[1] - mat[4]) / S;
				out[0] = (mat[8] + mat[2]) / S;
				out[1] = (mat[6] + mat[9]) / S;
				out[2] = 0.25 * S;
			}

			return out;
		}

		//https://github.com/mrdoob/three.js/blob/dev/src/math/Quat.js
		static fromEuler( out, x, y, z, order="YXZ" ){			
			var c1 = Math.cos(x*0.5), //Math.cos(x/2)
				c2 = Math.cos(y*0.5), //Math.cos(y/2),
				c3 = Math.cos(z*0.5), //Math.cos(z/2),
				s1 = Math.sin(x*0.5), //Math.sin(x/2),
				s2 = Math.sin(y*0.5), //Math.sin(y/2)
				s3 = Math.sin(z*0.5); //Math.sin(z/2)

			out = out || new Quat();
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

		//http://bediyap.com/programming/convert-Quat-to-euler-rotations/
		//http://schteppe.github.io/cannon.js/docs/files/src_math_Quat.js.html
		static toEuler( q, out ){ //order="YZX"
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


	////////////////////////////////////////////////////////////////////
	// STATIC OPERATIONS
	////////////////////////////////////////////////////////////////////
		
		static mul( a, b, out ){
			var ax = a[0], ay = a[1], az = a[2], aw = a[3],
				bx = b[0], by = b[1], bz = b[2], bw = b[3];

			out = out || new Quat();
			out[0] = ax * bw + aw * bx + ay * bz - az * by;
			out[1] = ay * bw + aw * by + az * bx - ax * bz;
			out[2] = az * bw + aw * bz + ax * by - ay * bx;
			out[3] = aw * bw - ax * bx - ay * by - az * bz;
			return out;
		}

		static dot( a, b ){
  			return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
		}

		static conjugate( q, out ){
			out = out || new Quat();
  			out[0] = -q[0];
  			out[1] = -q[1];
  			out[2] = -q[2];
  			out[3] = q[3];
  			return out;
		}

		static rotateVec3( qa, va, out = null ){
			//https://gamedev.stackexchange.com/questions/28395/rotating-vector3-by-a-Quat
			//vprime = 2.0f * dot(u, v) * u
			//			+ (s*s - dot(u, u)) * v
			//			+ 2.0f * s * cross(u, v);
			var q = [qa[0],qa[1],qa[2]],		//Save the vector part of the Quat
				v = [va[0],va[1],va[2]],		//Make a copy of the vector, going to chg its value
				s = qa[3],						//Save Quat Scalar (W)
				d = Vec3.dot(q,v),	// U DOT V
				dq = Vec3.dot(q,q),	// U DOT U
				cqv = Vec3.cross(q,v,[0,0,0]);	// Cross Product for Q,V

			Vec3.scale(q,	2.0 * d,	q);
			Vec3.scale(v,	s*s - dq,	v);
			Vec3.scale(cqv,	2.0 * s,	cqv);

			out = out || new Vec3();
			out[0] = q[0] + v[0] + cqv[0];
			out[1] = q[1] + v[1] + cqv[1];
			out[2] = q[2] + v[2] + cqv[2];
			return out;
		}

		//AXIS MUST BE NORMALIZED.
		//mult(this, setAxisAngle(axis, angle) )
		static mulAxisAngle(q, axis, angle, out = null){
			var ax	= q[0],	
				ay	= q[1],
				az	= q[2],
				aw	= q[3],
				
				halfAngle = angle * .5,
				s	= Math.sin(halfAngle),
				bx	= axis[0] * s,	//New Quat based on axis and angle
				by	= axis[1] * s, 
				bz	= axis[2] * s,
				bw	= Math.cos(halfAngle);

			//Do quat.mult(a,b);
			out		= out || q;
			out[0]	= ax * bw + aw * bx + ay * bz - az * by;
			out[1]	= ay * bw + aw * by + az * bx - ax * bz;
			out[2]	= az * bw + aw * bz + ax * by - ay * bx;
			out[3]	= aw * bw - ax * bx - ay * by - az * bz;
			return out;
		}

		//https://github.com/toji/gl-matrix/blob/master/src/gl-matrix/quat.js
		static invert(a,out){
			out		= out || new Quat();
			let a0	= a[0],
				a1	= a[1],
				a2	= a[2],
				a3	= a[3],
				dot	= a0*a0 + a1*a1 + a2*a2 + a3*a3;
			
			// Would be faster to return [0,0,0,0] immediately if dot == 0
			if(dot == 0){ out[0] = out[1] = out[2] = out[3] = 0; }

			let invDot = 1.0 / dot; // let invDot = dot ? 1.0/dot : 0;
			out[0]	= -a0*invDot;
			out[1]	= -a1*invDot;
			out[2]	= -a2*invDot;
			out[3]	= a3*invDot;
			return out;
		}

		static lerp( a, b, t, out ){
			var ax = a[0],
				ay = a[1],
				az = a[2],
				aw = a[3];
			out		= out || new Quat();
			out[0]	= ax + t * (b[0] - ax);
			out[1]	= ay + t * (b[1] - ay);
			out[2]	= az + t * (b[2] - az);
			out[3]	= aw + t * (b[3] - aw);
			return out;
		}

		static lerp2(a, b, t, out){
			var tm1 = 1 - t;
			out		= out || new Quat();
			out[0]	= a[0] * tm1 + b[0] * t;
			out[1]	= a[1] * tm1 + b[1] * t;
			out[2]	= a[2] * tm1 + b[2] * t;
			out[3]	= a[3] * tm1 + b[3] * t;
			return out;
		}

		static slerp(a, b, t, out=null) {
			// benchmarks:
			//    http://jsperf.com/Quat-slerp-implementations
			let ax = a[0], ay = a[1], az = a[2], aw = a[3],
				bx = b[0], by = b[1], bz = b[2], bw = b[3],
				omega, cosom, sinom, scale0, scale1;

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
			}else{
				// "from" and "to" Quats are very close
				//  ... so we can do a linear interpolation
				scale0 = 1.0 - t;
				scale1 = t;
			}

			// calculate final values
			out = out || new Quat();
			out[0] = scale0 * ax + scale1 * bx;
			out[1] = scale0 * ay + scale1 * by;
			out[2] = scale0 * az + scale1 * bz;
			out[3] = scale0 * aw + scale1 * bw;

			return out;
		}


	////////////////////////////////////////////////////////////////////
	// STATIC TRANSFORMATIONS
	////////////////////////////////////////////////////////////////////

		//https://github.com/toji/gl-matrix/blob/master/src/gl-matrix/quat.js
		static rotateX(q, rad, out = null){
			out = out || q;
			rad *= 0.5; 

			var ax = q[0], ay = q[1], az = q[2], aw = q[3],
				bx = Math.sin(rad), bw = Math.cos(rad);

			out[0] = ax * bw + aw * bx;
			out[1] = ay * bw + az * bx;
			out[2] = az * bw - ay * bx;
			out[3] = aw * bw - ax * bx;
			return out;
		}

		static rotateY(q, rad, out = null) {
			out = out || q;
			rad *= 0.5; 

			var ax = q[0], ay = q[1], az = q[2], aw = q[3],
				by = Math.sin(rad), bw = Math.cos(rad);

			out[0] = ax * bw - az * by;
			out[1] = ay * bw + aw * by;
			out[2] = az * bw + ax * by;
			out[3] = aw * bw - ay * by;
			return out;
		}

		static rotateZ(q, rad, out = null){
			out = out || q;
			rad *= 0.5; 

			var ax = q[0], ay = q[1], az = q[2], aw = q[3],
				bz = Math.sin(rad),
				bw = Math.cos(rad);

			out[0] = ax * bw + ay * bz;
			out[1] = ay * bw - ax * bz;
			out[2] = az * bw + aw * bz;
			out[3] = aw * bw - az * bz;
			return out;
		}
}


////////////////////////////////////////////////////////////////////
// CONSTANTS
////////////////////////////////////////////////////////////////////
Quat.ZERO = new Quat();


//#############################################################################
export default Quat;


/*
function decompSwingTwist( q, qSwing, qTwist ){
	//q_z = ( 0, 0, z, w ) / sqrt( z^2 + w^2 )
	let denom = Math.sqrt( q[2]*q[2] + q[3]*q[3] );
	qTwist[0] = 0;
	qTwist[1] = 0;
	qTwist[2] = q[2] / denom;
	qTwist[3] = q[3] / denom;

	//q_xy = q * conjugate( q_z );
	Quat.mul( q, Quat.conjugate( qTwist ), qSwing );
}
*/

//https://github.com/libgdx/libgdx/blob/master/gdx/src/com/badlogic/gdx/math/Quat.java
//http://physicsforgames.blogspot.com/2010/03/Quat-tricks.html
//http://physicsforgames.blogspot.com/2010/02/Quats.html
/*
Here is a function that will give you the rotation Quat that will rotate some initial vector into some final vector
Quat getRotationQuat(const Vector& from, const Vector& to)
{
     Quat result;

     Vector H = VecAdd(from, to);
     H = VecNormalize(H);

     result.w = VecDot(from, H);
     result.x = from.y*H.z - from.z*H.y;
     result.y = from.z*H.x - from.x*H.z;
     result.z = from.x*H.y - from.y*H.x;
     return result;
}

Vector rotateVector(const Vector& v, const Quat& q)
{
     Vector result;
     float x1 = q.y*v.z - q.z*v.y;
     float y1 = q.z*v.x - q.x*v.z;
     float z1 = q.x*v.y - q.y*v.x;

     float x2 = q.w*x1 + q.y*z1 - q.z*y1;
     float y2 = q.w*y1 + q.z*x1 - q.x*z1;
     float z2 = q.w*z1 + q.x*y1 - q.y*x1;

     result.x = v.x + 2.0f*x2;
     result.y = v.y + 2.0f*y2;
     result.z = v.z + 2.0f*z2;

     return result;
}


https://physicsforgames.blogspot.com/2010/02/quaternions.html
Quat QuatIntegrate(const Quat& q, const Vector& omega, float deltaT)
{
     Quat deltaQ;
     Vector theta = VecScale(omega, deltaT * 0.5f);
     float thetaMagSq = VecMagnitudeSq(theta);
     float s;
     if(thetaMagSq * thetaMagSq / 24.0f < MACHINE_SMALL_FLOAT)
     {
          deltaQ.w = 1.0f - thetaMagSq / 2.0f;
          s = 1.0f - thetaMagSq / 6.0f;
     }
     else
     {
          float thetaMag = sqrt(thetaMagSq);
          deltaQ.w = cos(thetaMag);
          s = sin(thetaMag) / thetaMag;
     }
     deltaQ.x = theta.x * s;
     deltaQ.y = theta.y * s;
     deltaQ.z = theta.z * s;
     return QuatMultiply(deltaQ, q);
}


Here is a blending function that uses NLerp


Quat QuatBlend(const Quat& i, const Quat& f, float blend)
{
     Quat result;
     float dot = i.w*f.w + i.x*f.x + i.y*f.y + i.z*f.z;
     float blendI = 1.0f - blend;
     if(dot < 0.0f)
     {
          Quat tmpF;
          tmpF.w = -f.w;
          tmpF.x = -f.x;
          tmpF.y = -f.y;
          tmpF.z = -f.z;
          result.w = blendI*i.w + blend*tmpF.w;
          result.x = blendI*i.x + blend*tmpF.x;
          result.y = blendI*i.y + blend*tmpF.y;
          result.z = blendI*i.z + blend*tmpF.z;
     }
     else
     {
          result.w = blendI*i.w + blend*f.w;
          result.x = blendI*i.x + blend*f.x;
          result.y = blendI*i.y + blend*f.y;
          result.z = blendI*i.z + blend*f.z;
     }
     result = QuatNormalize(result);
     return result;
}

*/

/*

	//https://github.com/Unity-Technologies/UnityCsReference/blob/master/Runtime/Export/Quat.cs
        // Rotates the point /point/ with /rotation/.
        public static Vector3 operator*(Quat rotation, Vector3 point)
        {
            float x = rotation.x * 2F;
            float y = rotation.y * 2F;
            float z = rotation.z * 2F;
            float xx = rotation.x * x;
            float yy = rotation.y * y;
            float zz = rotation.z * z;
            float xy = rotation.x * y;
            float xz = rotation.x * z;
            float yz = rotation.y * z;
            float wx = rotation.w * x;
            float wy = rotation.w * y;
            float wz = rotation.w * z;

            Vector3 res;
            res.x = (1F - (yy + zz)) * point.x + (xy - wz) * point.y + (xz + wy) * point.z;
            res.y = (xy + wz) * point.x + (1F - (xx + zz)) * point.y + (yz - wx) * point.z;
            res.z = (xz - wy) * point.x + (yz + wx) * point.y + (1F - (xx + yy)) * point.z;
            return res;
}
*/

/* Doesn't seem to work well to rotate a vector
static mulVec3(q, v, out=null){
	var ax = q[0], ay = q[1], az = q[2], aw = q[3],
		bx = v[0], by = v[1], bz = v[2];

	out = out || new Vec3();
	out[0] = ax + aw * bx + ay * bz - az * by;
	out[1] = ay + aw * by + az * bx - ax * bz;
	out[2] = az + aw * bz + ax * by - ay * bx;
	return out;
} */