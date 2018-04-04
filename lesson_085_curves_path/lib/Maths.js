class Vec2 extends Float32Array{
	constructor(ini){
		super(2);
		if(ini instanceof Vec2 || (ini && ini.length == 2)){	this[0] = ini[0];		this[1] = ini[1]; }
		else if(arguments.length == 2){ 						this[0] = arguments[0];	this[1] = arguments[1]; }
		else{													this[0] = this[1] = ini || 0; }
	}

	
	//.......................................
	get x(){ return this[0]; }	set x(val){ this[0] = val; }
	get y(){ return this[1]; }	set y(val){ this[1] = val; }
	set(x,y,z){ this[0] = x; this[1] = y; return this; }


	//.......................................
	add(v,out=null){
		if(out == null) out = this;
		out[0] = this[0] + v[0];
		out[1] = this[1] + v[1];
		return out;
	}

	avg(s, out=null){
		if(out == null) out = this;
		var ss = 1 / s;

		out[0] = this[0] * ss;
		out[1] = this[1] * ss;
		return out;
	}

	scale(s, out=null){
		if(out == null) out = this;

		out[0] = this[0] * s;
		out[1] = this[1] * s;
		return out;	
	}

	normalize(out=null){
		if(out == null) out = this;
		var v = 1 / Math.sqrt(this[0]*this[0] + this[1]*this[1]);

		out[0] = this[0] * v;
		out[1] = this[1] * v;
		return out;
	}

	rotate(ang, out){
		if(out == null) out = this;

		var cos = Math.cos(ang),
			sin = Math.sin(ang),
			x = this[0],
			y = this[1];

		out[0] = x * cos - y * sin;
		out[1] = x * sin + y * cos;
		return out;
	}

	//When values are very small, like less then 0.000001, just make it zero.
	nearZero(){
		if(Math.abs(this[0]) <= 1e-6) this[0] = 0;
		if(Math.abs(this[1]) <= 1e-6) this[1] = 0;
		return this;
	}

	lerp(v, t, out){
		if(out == null) out = this;
		var tMin1 = 1 - t;

		//Linear Interpolation : (1 - t) * v0 + t * v1;
		out[0] = this[0] * tMin1 + v[0] * t;
		out[1] = this[1] * tMin1 + v[1] * t;
		return out;
	}

	//.......................................
	copy(v){ this[0] = v[0]; this[1] = v[1]; return this; }
	clone(){ return new Vec2(this); }
}

var Maths = {
	PI_H	: 1.5707963267948966,
	PI_2	: 6.283185307179586,
	PI_Q	: 0.7853981633974483,

	DEG2RAD	: 0.01745329251,
	RAD2DEG	: 57.2957795131,

	EPSILON : 1e-6,

	toRad	: function(v){ return v * Maths.DEG2RAD; },
	toDeg	: function(v){ return v * Maths.RAD2DEG; },

	map		: function(x, xMin, xMax, zMin, zMax){ return (x - xMin) / (xMax - xMin) * (zMax-zMin) + zMin; },
	clamp 	: function(v,min,max){ return Math.max(min, Math.min(max,v) ); },

	smoothStep : function(edge1, edge2, val){ //https://en.wikipedia.org/wiki/Smoothstep
		var x = Math.max(0, Math.min(1, (val-edge1)/(edge2-edge1)));
		return x*x*(3-2*x);
	}
};


/*tDivInv	= 1 / (div + 1),
					//Linear Interpolation : (1 - t) * v0 + t * v1;
					for(var i=1; i <= div; i++){
						t		= i * tDivInv;
						tm1		= 1 - t;

						x		= v0[0] * tm1 + v1[0] * t;
						y		= v0[1] * tm1 + v1[1] * t;
						z		= v0[2] * tm1 + v1[2] * t;
						ckey	= x.toFixed(3) + "," + y.toFixed(3) + "," + z.toFixed(3); //Fix the values because of floating point errors

						if(cache[ckey] != undefined) rtn.push( cache[ckey] ); 
						else{
							geo.addVert(x, y, z);	
							cache[ ckey ] = idx;
							rtn.push(idx++); //add index then inc.
						}
					}
*/



export { Maths, Vec2 }