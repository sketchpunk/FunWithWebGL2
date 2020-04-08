class Vec2 extends Float32Array{
	constructor(ini){
		super(2);

		if(ini instanceof Vec2 || (ini && ini.length == 2)){	this[0] = ini[0];		this[1] = ini[1]; }
		else if(arguments.length == 2){ 						this[0] = arguments[0];	this[1] = arguments[1]; }
		else{													this[0] = this[1] = ini || 0; }
	}

	//----------------------------------------------
	//Getters and Setters
		get x(){ return this[0]; }	set x(val){ this[0] = val; }
		get y(){ return this[1]; }	set y(val){ this[1] = val; }
		set(x,y){ this[0] = x; this[1] = y; return this;}

		clone(){ return new Vec2(this); }
		copy(v){ this[0] = v[0]; this[1] = v[1]; return this; }

		fromAngleLen(ang, len){
			this[0] = len * Math.cos(ang);
			this[1] = len * Math.sin(ang);
			return this;
		}

		getAngle(v = null){
			if(v){
				return Math.acos( Vec2.dot(this,v) / (this.length() * v.length()) );

				//var x = v[0] - this[0],
				//	y = v[1] - this[1];
				//return Math.atan2(y, x);
			}
			return Math.atan2(this[1], this[0]);
		}

		//When values are very small, like less then 0.000001, just make it zero.
		nearZero(x = 1e-6,y = 1e-6){
			if(Math.abs(this[0]) <= x) this[0] = 0;
			if(Math.abs(this[1]) <= y) this[1] = 0;
			return this;
		}

		setLength(len){ return this.normalize().scale(len); }
	//endregion


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
		
		lengthSqr(v){
			//Only get the squared magnitude of this vector
			if(v === undefined) return this[0]*this[0] + this[1]*this[1];

			//Get squared magnitude based on another vector
			var x = this[0] - v[0],
				y = this[1] - v[1];

			return x*x + y*y;
		}

		normalize(out = null){
			var mag = Math.sqrt( this[0]*this[0] + this[1]*this[1] );
			if(mag == 0) return this;

			out = out || this;
			out[0] = this[0] / mag;
			out[1] = this[1] / mag;

			return out;
		}

		lerp(v, t, out){
			out = out || this;
			var tMin1 = 1 - t;

			//Linear Interpolation : (1 - t) * v0 + t * v1;
			out[0] = this[0] * tMin1 + v[0] * t;
			out[1] = this[1] * tMin1 + v[1] * t;
			return out;
		}

		rotate(ang, out){
			out = out || this;

			var cos = Math.cos(ang),
				sin = Math.sin(ang),
				x = this[0],
				y = this[1];

			out[0] = x * cos - y * sin;
			out[1] = x * sin + y * cos;
			return out;
		}

		invert(out = null){
			out = out || this;
			out[0] = -this[0];
			out[1] = -this[1];
			return out;
		}
	//endregion


	//----------------------------------------------
	// Math
		add(v, out=null){
			out = out || this;
			out[0] = this[0] + v[0];
			out[1] = this[1] + v[1];
			return out;
		}

		addXY(x, y, out=null){
			out = out || this;
			out[0] = this[0] + x;
			out[1] = this[1] + y;
			return out;
		}

		sub(v, out=null){
			out = out || this;
			out[0] = this[0] - v[0];
			out[1] = this[1] - v[1];
			return out;
		}

		mul(v, out=null){
			out = out || this;
			out[0] = this[0] * v[0];
			out[1] = this[1] * v[1];
			return out;
		}

		div(v, out=null){
			out = out || this;
			out[0] = (v[0] != 0)? this[0] / v[0] : 0;
			out[1] = (v[1] != 0)? this[1] / v[1] : 0;
			return out;
		}

		scale(v, out=null){
			out = out || this;
			out[0] = this[0] * v;
			out[1] = this[1] * v;
			return out;
		}

		divInvScale(v, out=null){
			out = out || this;
			out[0] = (this[0] != 0)? v / this[0] : 0;
			out[1] = (this[1] != 0)? v / this[1] : 0;
			return out;
		}

		floor(out=null){
			out = out || this;
			out[0] = Math.floor( this[0] );
			out[1] = Math.floor( this[1] );
			return out;
		}
	//endregion


	//----------------------------------------------
	//region Static
		static add(a,b,out){
			out = out || new Vec2();
			out[0] = a[0] + b[0];
			out[1] = a[1] + b[1];			
			return out;
		}

		static sub(a, b, out){ 
			out = out || new Vec2();
			out[0] = a[0] - b[0];
			out[1] = a[1] - b[1];
			return out;
		}

		static scale(v, s, out = null){
			out = out || new Vec2();
			out[0] = v[0] * s;
			out[1] = v[1] * s;
			return out;
		}

		static dot(a,b){ return a[0] * b[0] + a[1] * b[1]; }

		static floor(v, out=null){
			out = out || new Vec2();
			out[0] = Math.floor( v[0] );
			out[1] = Math.floor( v[1] );
			return out;
		}

		static fract(v, out=null){
			out = out || new Vec2();
			out[0] = v[0] - Math.floor( v[0] );
			out[1] = v[1] - Math.floor( v[1] );
			return out;
		}

		static length(v0,v1){
			var x = v0[0] - v1[0],
				y = v0[1] - v1[1];
			return Math.sqrt( x*x + y*y );
		}

		static lerp(v0, v1, t, out){
			out = out || new Vec2();
			var tMin1 = 1 - t;
			
			//Linear Interpolation : (1 - t) * v0 + t * v1;
			out[0] = v0[0] * tMin1 + v1[0] * t;
			out[1] = v0[1] * tMin1 + v1[1] * t;
			return out;
		}
	//endregion
}

export default Vec2;