import Vec3 from "./Vec3.js";

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
	// SETTERS
	////////////////////////////////////////////////////////////////////
		
		//Passing in Vectors.
		set( x, y, z, doNormalize = false ){
			this.x.copy( x );
			this.y.copy( y );
			this.z.copy( z );

			if(doNormalize){
				this.x.normalize();
				this.y.normalize();
				this.z.normalize();
			}

			return true;
		}

		//Create axis based on a Quaternion
		setQuat( q ){
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

	////////////////////////////////////////////////////////////////////
	//  
	////////////////////////////////////////////////////////////////////

		//Axis is pretty much a Rotation Matrix, so easy to apply rotation to a vector.
		transformVec3(v, out){
			var x = v[0], y = v[1], z = v[2];
			
			out = out || new Vec3();

			out[0] = x * this.x[0] + y * this.y[0] + z * this.z[0];
			out[1] = x * this.x[1] + y * this.y[1] + z * this.z[1];
			out[2] = x * this.x[2] + y * this.y[2] + z * this.z[2];
			return out;
		}


	////////////////////////////////////////////////////////////////////
	// STATIC
	////////////////////////////////////////////////////////////////////
		/*
		static debug(DVao, e, axis, origin=null, scl=1.0){
			origin = origin || Vec3.ZERO;

			var v = new Vec3();
			v.copy(axis.z).scale( scl ).add(origin);
			DVao.vecLine(e, origin, v, 0);

			v.copy(axis.y).scale( scl ).add(origin);
			DVao.vecLine(e, origin, v, 2);

			v.copy(axis.x).scale( scl ).add(origin);
			DVao.vecLine(e, origin, v, 6);
		}
		*/
}

export default Axis;