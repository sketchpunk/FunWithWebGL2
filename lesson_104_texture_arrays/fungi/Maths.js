import Vec3		from "./maths/Vec3.js";
import Mat4		from "./maths/Mat4.js";
import Quat		from "./maths/Quat.js";

var Maths = {
	PI_H	: 1.5707963267948966,
	PI_2	: 6.283185307179586,
	PI_Q	: 0.7853981633974483,

	DEG2RAD	: 0.01745329251, // PI / 180
	RAD2DEG	: 57.2957795131, // 180 / PI

	EPSILON : 1e-6,

	toRad	: function(v){ return v * Maths.DEG2RAD; },
	toDeg	: function(v){ return v * Maths.RAD2DEG; },

	map		: function(x, xMin, xMax, zMin, zMax){ return (x - xMin) / (xMax - xMin) * (zMax-zMin) + zMin; },
	clamp 	: function(v, min, max){ return Math.max(min, Math.min(max,v) ); },
	norm	: function(min, max, v){ return (v-min) / (max-min); },

	lerp 	: function(a, b, t){ return (1 - t) * a + t * b; },  //return a + t * (b-a); 

	fract	: function(f){ return f - Math.floor(f); },
	step 	: function(edge, x){ return (x < edge)? 0 : 1; },

	nearZero	: function(v){ return (Math.abs(v) <= this.EPSILON)? 0 : v; },
	smoothStep 	: function(edge1, edge2, val){ //https://en.wikipedia.org/wiki/Smoothstep
		var x = Math.max(0, Math.min(1, (val-edge1)/(edge2-edge1)));
		return x*x*(3-2*x);
	},

	rnd(min,max){ return Math.random() * (max - min) + min; },

	//https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
	//https://en.wikipedia.org/wiki/Lehmer_random_number_generator
	rnd_lcg(seed){
    	function lcg(a) {return a * 48271 % 2147483647}
    	seed = seed ? lcg(seed) : lcg(Math.random());
    	return function(){ return (seed = lcg(seed)) / 2147483648; }
	},


	//https://gist.github.com/jhermsmeier/72626d5fd79c5875248fd2c1e8162489
	polarToCartesian : function(lon, lat, radius, out) {
		out = out || new Vec3();

		let phi 	= ( 90 - lat ) * this.DEG2RAD,
	  		theta 	= ( lon + 180 ) * this.DEG2RAD;

	  	out[0] = -(radius * Math.sin(phi) * Math.sin(theta));
	    out[1] = radius * Math.cos(phi);
	    out[2] = radius * Math.sin(phi) * Math.cos(theta);
	  	return out;
	},
	cartesianToPolar : function( v, radius, out ){
		out = out || [0,0];
  		var lon 	= Math.atan2( v[0], -v[2] ) * this.RAD2DEG,
  			length 	= Math.sqrt( v[0] * v[0] + v[2] * v[2] ),
  			lat 	= Math.atan2( v[1], length ) * this.RAD2DEG;
  		return [ lon, lat ]
	},

	//https://github.com/nodebox/g.js/blob/master/src/libraries/math.js
	sawtoothWave(time, min=0, max=1, period=1){
		var amplitude	= (max - min) * 0.5,
			frequency	= this.PI_2 / period,
			phase		= 0;

		if(time % period !== 0)	phase = (time * frequency) % this.PI_2;
		if(phase < 0)			phase += this.PI_2;

		//return 2 * (phase / this.PI_2) * amplitude + min;
		return 2 * (phase * 0.15915494309) * amplitude + min; //Change Div to Mul
	},

};


/*
g.sineWave = function (v, min, max, period, offset) {
    if (min === undefined) min = -1;
    if (max === undefined) max = 1;
    if (period === undefined) period = 1;
    if (offset === undefined) offset = 0;
    var amplitude = (max - min) / 2;
    return (min + amplitude) + Math.sin((offset + v) * TWO_PI / period) * amplitude;
};

g.squareWave = function (v, min, max, period, offset) {
    if (min === undefined) min = -1;
    if (max === undefined) max = 1;
    if (period === undefined) period = 1;
    if (offset === undefined) offset = 0;
    var halfPeriod = period / 2;
    var d = (v + offset) % period;
    if (d < halfPeriod) {
        return max;
    } else {
        return min;
    }
};

g.triangleWave = function (v, min, max, period, offset) {
    if (min === undefined) min = -1;
    if (max === undefined) max = 1;
    if (period === undefined) period = 1;
    if (offset === undefined) offset = 0;
    var amplitude = (max - min) / 2,
        frequency = TWO_PI / period,
        phase = 0,
        time = v + offset + period / 4;
    if (time % period !== 0) {
        phase = (time * frequency) % TWO_PI;
    }
    if (phase < 0) { phase += TWO_PI; }
    return 2 * amplitude * (1 + -Math.abs((phase / TWO_PI) * 2 - 1)) + min;
};
*/


/*
https://stackoverflow.com/questions/5674149/3d-coordinates-on-a-sphere-to-latitude-and-longitude

lat = acos(y / radius);
long = (atan2(x,z) + PI + PI / 2) % (PI * 2) - PI;

    var phi = Math.acos(point.y / radius); //lat 
    var theta = (Math.atan2(point.x, point.z) + Math.PI + Math.PI / 2) % (Math.PI * 2) - Math.PI; // lon
    
    // theta is a hack, since I want to rotate by Math.PI/2 to start.  sorryyyyyyyyyyy
    return {
        lat: 180 * phi / Math.PI - 90,
        lon: 180 * theta / Math.PI

*/


//From a point in space, closest spot to a 2D line
function closestPointToLine2D(x0,y0,x1,y1,px,py){
	var dx	= x1 - x0,
		dy	= y1 - y0,
		t	= ((px-x0)*dx + (py-y0)*dy) / (dx*dx+dy*dy),
		x	= x0 + (dx * t), //Util.lerp(x0, x1, t),
		y	= y0 + (dy * t); //Util.lerp(y0, y1, t);
	return [x,y]
}

//From a point in space, closest spot to a 3D line
function closestPointToLine3D(a,b,p,out){
	if(out == undefined) out = new Vec3();
	var dx	= b.x - a.x,
		dy	= b.y - a.y,
		dz	= a.z - a.z,
		t	= ((p.x-a.x)*dx + (p.y-a.y)*dy + (p.z-a.z)*dz) / (dx*dx+dy*dy+dz*dz),
		x	= a.x + (dx * t),
		y	= a.y + (dy * t),
		z	= a.z + (dz * t);
	return out.set(x,y,z);
}

//Return back the two points that are closes on two infinite lines
//http://geomalgorithms.com/a07-_distance.html
function closestpoint_2Lines(A0,A1,B0,B1){
	var u = A1.clone().sub(A0),
		v = B1.clone().sub(B0),
		w = A0.clone().sub(B0),
		a = Vec3.dot(u,u),         // always >= 0
		b = Vec3.dot(u,v),
		c = Vec3.dot(v,v),         // always >= 0
		d = Vec3.dot(u,w),
		e = Vec3.dot(v,w),
		D = a*c - b*b,        // always >= 0
		tU, tV;
	//compute the line parameters of the two closest points
	if(D < 0.000001){	// the lines are almost parallel
		tU = 0.0;
		tV = (b>c ? d/b : e/c);    // use the largest denominator
	}else{
		tU = (b*e - c*d) / D;
		tV = (a*e - b*d) / D;
	}

	//Calc Length
	//Vector   vLen = w + (uT * u) - (vT * v);  // =  L1(sc) - L2(tc)
	//Float len = sqrt( dot(vLen,vLen) );

	return [ u.scale(tU).add(A0), v.scale(tV).add(B0) ];
}

//Return back the two points that are the closests but bound by the limit of two segments
//http://geomalgorithms.com/a07-_distance.html
function closestPointS_2Segments(A0,A1,B0,B1){
	var u = A1.clone().sub(A0),
		v = B1.clone().sub(B0),
		w = A0.clone().sub(B0),
		a = Vec3.dot(u,u),         // always >= 0
		b = Vec3.dot(u,v),
		c = Vec3.dot(v,v),         // always >= 0
		d = Vec3.dot(u,w),
		e = Vec3.dot(v,w),
		D = a*c - b*b,        // always >= 0
    	sc, sN, sD = D,       // sc = sN / sD, default sD = D >= 0
    	tc, tN, tD = D;       // tc = tN / tD, default tD = D >= 0

 	// compute the line parameters of the two closest points
    if(D < 0.000001){ // the lines are almost parallel
        sN = 0.0;         // force using point P0 on segment S1
        sD = 1.0;         // to prevent possible division by 0.0 later
        tN = e;
        tD = c;
    }else{                 // get the closest points on the infinite lines
        sN = (b*e - c*d);
        tN = (a*e - b*d);
        if(sN < 0.0){        // sc < 0 => the s=0 edge is visible
            sN = 0.0;
            tN = e;
            tD = c;
        }else if (sN > sD){  // sc > 1  => the s=1 edge is visible
            sN = sD;
            tN = e + b;
            tD = c;
        }
    }

    if (tN < 0.0){ // tc < 0 => the t=0 edge is visible
        tN = 0.0;
        // recompute sc for this edge
        if (-d < 0.0)		sN = 0.0;
        else if (-d > a)	sN = sD;
        else{
            sN = -d;
            sD = a;
        }
    }else if(tN > tD){ // tc > 1  => the t=1 edge is visible
        tN = tD;
        // recompute sc for this edge
        if((-d + b) < 0.0)		sN = 0;
        else if ((-d + b) > a)	sN = sD;
        else{
            sN = (-d +  b);
            sD = a;
        }
    }

    // finally do the division to get sc and tc
    sc = (Math.abs(sN) < 0.000001 ? 0.0 : sN / sD);
    tc = (Math.abs(tN) < 0.000001 ? 0.0 : tN / tD);

    // get the difference of the two closest points
    //Vector   dP = w + (sc * u) - (tc * v);  // =  S1(sc) - S2(tc)

	return [ u.scale(sc).add(A0), v.scale(tc).add(B0) ];
}


export default Maths;
export { Vec3, Mat4, Quat };