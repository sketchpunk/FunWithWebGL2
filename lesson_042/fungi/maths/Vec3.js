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
		this.isModified = true;
	}

	//----------------------------------------------
	//region XYZ Setters
		set(x,y,z){ this[0] = x; this[1] = y; this[2] = z; this.isModified = true; return this;}

		get x(){ return this[0]; }	set x(val){ this[0] = val; this.isModified = true; }
		get y(){ return this[1]; }	set y(val){ this[1] = val; this.isModified = true; }
		get z(){ return this[2]; }	set z(val){ this[2] = val; this.isModified = true; }
	//endregion

	//----------------------------------------------
	//region Methods
		magnitude(v){
			//Only get the magnitude of this vector
			if(v === undefined) return Math.sqrt( this[0]*this[0] + this[1]*this[1] + this[2]*this[2] );

			//Get magnitude based on another vector
			var x = this[0] - v[0],
				y = this[1] - v[1],
				z = this[2] - v[2];

			return Math.sqrt( x*x + y*y + z*z );
		}
		
		sqrMag(v){
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
			if(out === this) this.isModified = true;
			return this;
		}

		multi(v,out){
			out = out || this;
			out[0] = this[0] * v;
			out[1] = this[1] * v;
			out[2] = this[2] * v;
			if(out === this) this.isModified = true;
			return this;
		}

		add(v,out){
			out = out || this;
			out[0] = this[0] + v[0];
			out[1] = this[1] + v[1];
			out[2] = this[2] + v[2];
			if(out === this) this.isModified = true;
			return this;
		}

		sub(v,out){
			out = out || this;
			out[0] = this[0] - v[0];
			out[1] = this[1] - v[1];
			out[2] = this[2] - v[2];
			if(out === this) this.isModified = true;
			return this;
		}

		clone(){ return new Vec3().set(this.x,this.y,this.z); }
		
		copy(v){
			this[0] = v[0]; this[1] = v[1]; this[2] = v[2];
			this.isModified = true;
			return this;
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

		static scalar(v,s,out){
			out[0] = v[0] * s;
			out[1] = v[1] * s;
			out[2] = v[2] * s;
			return out;
		}
		static scalarRev(v,s,out){
			out[0] = s * v[0];
			out[1] = s * v[1];
			out[2] = s * v[2];
			return out;
		}

		static dot(a,b){ return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

		static cross(a,b,out){
			var ax = a[0], ay = a[1], az = a[2],
				bx = b[0], by = b[1], bz = b[2];

			out[0] = ay * bz - az * by;
			out[1] = az * bx - ax * bz;
			out[2] = ax * by - ay * bx;
			return out;
		}
	//endregion
}

export default Vec3