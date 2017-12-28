class Vec2 extends Float32Array{
	constructor(ini){
		super(2);
		if(ini instanceof Vec3 || (ini && ini.length == 2)){
			this[0] = ini[0]; this[1] = ini[1];
		}else if(arguments.length == 2){
			this[0] = arguments[0]; this[1] = arguments[1];
		}else{
			this[0] = this[1] = this[2] = ini || 0;
		}
		this.isModified = true;
	}

	//----------------------------------------------
	// XYZ Setters
	set(x,y){ this[0] = x; this[1] = y; this.isModified = true; return this;}

	get x(){ return this[0]; }	set x(val){ this[0] = val; this.isModified = true; }
	get y(){ return this[1]; }	set y(val){ this[1] = val; this.isModified = true; }


	//----------------------------------------------
	// Methods
	length(v){
		//Only get the magnitude of this vector
		if(v === undefined) return Math.sqrt( this[0]*this[0] + this[1]*this[1] );

		//Get magnitude based on another vector
		var x = this[0] - v[0],
			y = this[1] - v[1];

		return Math.sqrt( x*x + y*y );
	}
	
	lengthSqr(v){ //TODO Rename to LengthSqr
		//Only get the squared magnitude of this vector
		if(v === undefined) return this[0]*this[0] + this[1]*this[1];

		//Get squared magnitude based on another vector
		var x = this[0] - v[0],
			y = this[1] - v[1];

		return x*x + y*y;
	}

	normalize(out){
		var mag = Math.sqrt( this[0]*this[0] + this[1]*this[1] );
		if(mag == 0) return this;

		out = out || this;
		out[0] = this[0] / mag;
		out[1] = this[1] / mag;
		if(out === this) this.isModified = true;
		return this;
	}

	scale(v,out){
		out = out || this;
		out[0] = this[0] * v;
		out[1] = this[1] * v;
		if(out === this) this.isModified = true;
		return this;
	}

	mul(v,out){
		out = out || this;
		out[0] = this[0] * v[0];
		out[1] = this[1] * v[1];
		if(out === this) this.isModified = true;
		return this;
	}

	add(v,out){
		out = out || this;
		out[0] = this[0] + v[0];
		out[1] = this[1] + v[1];
		if(out === this) this.isModified = true;
		return this;
	}

	sub(v,out){
		out = out || this;
		out[0] = this[0] - v[0];
		out[1] = this[1] - v[1];
		if(out === this) this.isModified = true;
		return this;
	}

	div(v,out){
		out = out || this;
		out[0] = (v[0] != 0)? this[0] / v[0] : 0;
		out[1] = (v[1] != 0)? this[1] / v[1] : 0;
		if(out === this) this.isModified = true;
		return this;
	}

	divInvScale(v,out){
		out = out || this;
		out[0] = (this[0] != 0)? v / this[0] : 0;
		out[1] = (this[1] != 0)? v / this[1] : 0;
		if(out === this) this.isModified = true;
		return this;
	}	

	clone(){ return new Vec2().set(this.x,this.y); }
	
	copy(v){ this[0] = v[0]; this[1] = v[1]; this.isModified = true; return this; }

	scalar(s,out){
		out = out || this;
		out[0] = this[0] * s;
		out[1] = this[1] * s;
		if(out === this) this.isModified = true;
		return this;
	}
}

export default Vec3