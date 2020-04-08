import Vec3 from "./Vec3.js";
import Quat from "./Quat.js";

/*
3x3 Rotation Matrix
R  T  F      
00 03 06
01 04 07
02 05 08

left	(0,1,2)
up		(3,4,5)
forward	(6,7,9)
*/
class Axis{
	constructor(){
		this.x = new Vec3( Vec3.LEFT );
		this.y = new Vec3( Vec3.UP );
		this.z = new Vec3( Vec3.FORWARD );
	}

	////////////////////////////////////////////////////////////////////
	// SETTERS / GETTERS
	////////////////////////////////////////////////////////////////////
		//Passing in Vectors.
		set( x, y, z, do_norm = false ){
			this.x.copy( x );
			this.y.copy( y );
			this.z.copy( z );

			if(do_norm){
				this.x.norm();
				this.y.norm();
				this.z.norm();
			}
			return this;
		}

		//Create axis based on a Quaternion
		to_quat( out ){ return (out || new Quat()).from_axis( this.x, this.y, this.z ); }
		from_quat( q ){
			// Same code for Quat to Matrix 3 conversion
			let x = q[0], y = q[1], z = q[2], w = q[3],
				x2 = x + x,
				y2 = y + y,
				z2 = z + z,
				xx = x * x2,
				yx = y * x2,
				yy = y * y2,
				zx = z * x2,
				zy = z * y2,
				zz = z * z2,
				wx = w * x2,
				wy = w * y2,
				wz = w * z2;

			this.x.set( 1 - yy - zz,	yx + wz,		zx - wy );
			this.y.set( yx - wz,		1 - xx - zz,	zy + wx );
			this.z.set( zx + wy,		zy - wx,		1 - xx - yy );
			return this;
		}

		//Create an axis based on a looking direction
		/*
		lookAt( v ){
			//If the vector is pretty much forward, just do set default axis.
			var test = Vec3.nearZero( v );
			if(test.x == 0 && test.y == 0){
				this.z.copy( Vec3.FORWARD );
				this.y.copy( Vec3.UP );
				this.x.copy( Vec3.LEFT );
				return this;
			}

			Vec3.norm(v, this.z);	//Direction is the forward vector
			let dot = Vec3.dot(Vec3.LEFT, this.z);

			// If dot product is in the negative, need to use BACK (0,0,-1) 
			// to get the correct up direction, else up will point down.
			if(dot >= 0)	Vec3.cross(Vec3.FORWARD, this.z, this.y).normalize();
			else			Vec3.cross(Vec3.BACK, this.z, this.y).normalize();

			Vec3.cross(this.z, this.y, this.x).normalize();
			return this;
		}
		*/

		from_dir( fwd, up ){
			this.z.copy( fwd ).norm();
			this.x.from_cross( up, this.z ).norm();
			this.y.from_cross( this.z, this.x ).norm();			
			return this;
		}


	////////////////////////////////////////////////////////////////////
	//  
	////////////////////////////////////////////////////////////////////

		// Axis is pretty much a Rotation Matrix, so easy to apply rotation to a vector.
		transform_vec3( v, out ){
			let x = v[0], y = v[1], z = v[2];
			
			out = out || new Vec3();
			out[0] = x * this.x[0] + y * this.y[0] + z * this.z[0];
			out[1] = x * this.x[1] + y * this.y[1] + z * this.z[1];
			out[2] = x * this.x[2] + y * this.y[2] + z * this.z[2];
			return out;
		}

		rotate( rad, axis = "x", out = null ){
			out = out || this;

			let sin = Math.sin(rad),
				cos = Math.cos(rad),
				x, y, z;

			switch(axis){
				case "y": //..........................
					x = this.x[0];	z = this.x[2];
					this.x[0]	= z*sin + x*cos; //x
					this.x[2]	= z*cos - x*sin; //z

					x = this.z[0];	z = this.z[2];
					this.z[0]	= z*sin + x*cos; //x
					this.z[2]	= z*cos - x*sin; //z
				break;
				case "x": //..........................
					y = this.y[1];	z = this.y[2];
					this.y[1]	= y*cos - z*sin; //y
					this.y[2]	= y*sin + z*cos; //z

					y = this.z[1];	z = this.z[2];
					this.z[1]	= y*cos - z*sin; //y
					this.z[2]	= y*sin + z*cos; //z
				break;
				case "z": //..........................
					x = this.x[0];	y = this.x[1];
					this.x[0]	= x*cos - y*sin; //x
					this.x[1]	= x*sin + y*cos; //y

					x = this.y[0];	y = this.y[1];
					this.y[0]	= x*cos - y*sin; //x
					this.y[1]	= x*sin + y*cos; //y
				break;
			}

			return out;
		}


	////////////////////////////////////////////////////////////////////
	// STATIC
	////////////////////////////////////////////////////////////////////
}


/*
	//X and Y axis need to be normalized vectors, 90 degrees of eachother.
		static planeEllipse(vecCenter, xAxis, yAxis, angle, xRadius, yRadius, out){
			let sin = Math.sin(angle),
				cos = Math.cos(angle);
			out[0] = vecCenter[0] + xRadius * cos * xAxis[0] + yRadius * sin * yAxis[0];
			out[1] = vecCenter[1] + xRadius * cos * xAxis[1] + yRadius * sin * yAxis[1];
			out[2] = vecCenter[2] + xRadius * cos * xAxis[2] + yRadius * sin * yAxis[2];
			return out;
		}
*/

export default Axis;