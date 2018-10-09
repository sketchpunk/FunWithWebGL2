import Vec3		from "./maths/Vec3.js";
import Mat4		from "./maths/Mat4.js";
import Quat		from "./maths/Quat.js";

class Maths{
	////////////////////////////////////////////////////////////////////
	// 
	////////////////////////////////////////////////////////////////////
		static toRad(v){ return v * Maths.DEG2RAD; }
		static toDeg(v){ return v * Maths.RAD2DEG; }
		static dotToDeg(dot){  return Maths.toDeg( Math.acos( Maths.clamp(dot, -1, 1) ) ); }

		static map(x, xMin, xMax, zMin, zMax){ return (x - xMin) / (xMax - xMin) * (zMax-zMin) + zMin; }
		static clamp(v, min, max){ return Math.max(min, Math.min(max,v) ); }
		static norm(min, max, v){ return (v-min) / (max-min); }

		static lerp(a, b, t){ return (1 - t) * a + t * b; }  //return a + t * (b-a); 

		static fract(f){ return f - Math.floor(f); }
		static step(edge, x){ return (x < edge)? 0 : 1; }

		static nearZero(v){ return (Math.abs(v) <= Maths.EPSILON)? 0 : v; }
		static smoothStep(edge1, edge2, val){ //https://en.wikipedia.org/wiki/Smoothstep
			var x = Math.max(0, Math.min(1, (val-edge1)/(edge2-edge1)));
			return x*x*(3-2*x);
		}


	////////////////////////////////////////////////////////////////////
	// RANDOM NUMBERS
	////////////////////////////////////////////////////////////////////
		static rnd(min,max){ return Math.random() * (max - min) + min; }

		//https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
		//https://en.wikipedia.org/wiki/Lehmer_random_number_generator
		static rnd_lcg(seed){
			function lcg(a) {return a * 48271 % 2147483647}
			seed = seed ? lcg(seed) : lcg(Math.random());
			return function(){ return (seed = lcg(seed)) / 2147483648; }
		}


	////////////////////////////////////////////////////////////////////
	// POLAR
	////////////////////////////////////////////////////////////////////
		//https://gist.github.com/jhermsmeier/72626d5fd79c5875248fd2c1e8162489
		static polarToCartesian(lon, lat, radius, out) {
			out = out || new Vec3();

			let phi 	= ( 90 - lat ) * Maths.DEG2RAD,
				theta 	= ( lon + 180 ) * Maths.DEG2RAD;

			out[0] = -(radius * Math.sin(phi) * Math.sin(theta));
			out[1] = radius * Math.cos(phi);
			out[2] = radius * Math.sin(phi) * Math.cos(theta);
			return out;
		}

		static cartesianToPolar( v, radius, out ){
			out = out || [0,0];
			var lon 	= Math.atan2( v[0], -v[2] ) * Maths.RAD2DEG,
				length 	= Math.sqrt( v[0] * v[0] + v[2] * v[2] ),
				lat 	= Math.atan2( v[1], length ) * Maths.RAD2DEG;
			return [ lon, lat ]
		}

		//X and Y axis need to be normalized vectors, 90 degrees of eachother.
		static planeCircle(vecCenter, xAxis, yAxis, angle, radius, out){
			let sin = Math.sin(angle),
				cos = Math.cos(angle);
			out[0] = vecCenter[0] + radius * cos * xAxis[0] + radius * sin * yAxis[0];
			out[1] = vecCenter[1] + radius * cos * xAxis[1] + radius * sin * yAxis[1];
			out[2] = vecCenter[2] + radius * cos * xAxis[2] + radius * sin * yAxis[2];
			return out;
		}

		//X and Y axis need to be normalized vectors, 90 degrees of eachother.
		static planeEllipse(vecCenter, xAxis, yAxis, angle, xRadius, yRadius, out){
			let sin = Math.sin(angle),
				cos = Math.cos(angle);
			out[0] = vecCenter[0] + xRadius * cos * xAxis[0] + yRadius * sin * yAxis[0];
			out[1] = vecCenter[1] + xRadius * cos * xAxis[1] + yRadius * sin * yAxis[1];
			out[2] = vecCenter[2] + xRadius * cos * xAxis[2] + yRadius * sin * yAxis[2];
			return out;
		}


	////////////////////////////////////////////////////////////////////
	// WAVES
	////////////////////////////////////////////////////////////////////
		//https://github.com/nodebox/g.js/blob/master/src/libraries/math.js
		static sawtoothWave(time, min=0, max=1, period=1){
			var amplitude	= (max - min) * 0.5,
				frequency	= Maths.PI_2 / period,
				phase		= 0;

			if(time % period !== 0)	phase = (time * frequency) % Maths.PI_2;
			if(phase < 0)			phase += Maths.PI_2;

			//return 2 * (phase / Maths.PI_2) * amplitude + min;
			return 2 * (phase * 0.15915494309) * amplitude + min; //Change Div to Mul
		}

		static triangleWave(v, min=0, max=1, period = 1){
			var amplitude	= (max - min) * 0.5,
				frequency	= Maths.PI_2 / period,
				phase		= 0,
				time		= v + period * 0.25; // div 4 changed to * 0.25
				
			if(time % period !== 0)	phase	= (time * frequency) % Maths.PI_2;
			if(phase < 0) 			phase	+= Maths.PI_2;

			return 2 * amplitude * (1 + -Math.abs((phase / Maths.PI_2) * 2 - 1)) + min;
		}

		static squareWave (v, min=0, max=1, period=1){ return ( (v % period) <  (period * 0.5) )? max : min; }

		


	////////////////////////////////////////////////////////////////////
	// CURVES
	////////////////////////////////////////////////////////////////////
		static CBezierEase(target, x0,y0, x1,y1, x2,y2, x3,y3 ){
			const TRIES		= 30;
			const MARGIN	= 0.001;

			//if(target <= 0.00001) // Target is Zero
			//else if(target > 0.99999 ) //target is One

			let a		= 0,
				b		= 1,
				loop	= 0,
				t,tt, i, ii, x;

			while( loop++ < TRIES ){
				t	= (b - a) * 0.5  + a;
				i	= 1 - t;
				tt	= t * t;
				ii	= i * i;
				x 	= i*ii*x0 + 3*t*ii*x1 + 3*tt*i*x2 + t*tt*x3;

				//console.log("x",loop, x, target, Math.abs(target - x));

				if( Math.abs(target - x) < MARGIN ) break; //console.log("found target at", t);

				if(target > x)		a = t;
				else if(target < x)	b = t;
			}

			return i*ii*y0 + 3*t*ii*y1 + 3*tt*i*y2 + t*tt*y3;
		}

		
		//https://blog.demofox.org/2014/08/28/one-dimensional-bezier-curves/
		//1D Cubic (3rd) Bezier through A, B, C, D where a Start and d is end are assumed to be 0 and 1.
		static normalizedBezier3(b, c, t){
			let s	= 1.0 - t,
				t2	= t * t,
				s2	= s * s,
				t3	= t2 * t;
			return (3.0 * b * s2 * t) + (3.0 * c * s * t2) + t3;
		}


		static normalizedBezier7(b, c, d, e, f, g, t){
			let s	= 1.0 - t,
				t2	= t * t,
				s2	= s * s,
				t3	= t2 * t,
				s3	= s2 * s,
				t4	= t2 * t2,
				s4	= s2 * s2,
				t5	= t3 * t2,
				s5	= s3 * s2,
				t6	= t3 * t3,
				s6	= s3 * t3,
				t7 	= t3 * t2 * t2;

			return 	(7.0 * b * s6 * t) + (21.0 * c * s5 * t2) + (35.0 * d * s4 * t3) +
					(35.0 * e * s3 * t4) + (21.0 * f * s2 * t5) + (7.0 * g * s * t6) + t7;
		}


		//https://blog.demofox.org/2014/08/28/one-dimensional-bezier-curves/
		//1D Bezier Curves.
		//Quadratic Bezier curve:
		//y = A * (1-x)^2 + B * 2 * (1-x) * x + C * x ^2

		//Cubic Bezier curve:
		//y = A*(1-x)^3+3*B*(1-x)^2*x+3*C*(1-x)*x^2+D*x^3

}

////////////////////////////////////////////////////////////////////
// CONSTANTS
////////////////////////////////////////////////////////////////////
	Maths.PI_H			= 1.5707963267948966;
	Maths.PI_2 			= 6.283185307179586;
	Maths.PI_2_INV 		= 1 / 6.283185307179586;
	Maths.PI_Q			= 0.7853981633974483;
	Maths.PI_270		= Math.PI + Maths.PI_H;
	Maths.DEG2RAD		= 0.01745329251; // PI / 180
	Maths.RAD2DEG		= 57.2957795131; // 180 / PI
	Maths.EPSILON		= 1e-6;

	

	//Maths.EPSILON_SQR	= Maths.EPSILON * Maths.EPSILON;



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
	out = out || new Vec3();

	let dx	= b.x - a.x,
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

/*
    function asinc(x0){
        var x = 6*(1-x0);   
        var x1 = x;  
        var a = x;                                           x*=x1; 
        a += x                   /20.0;                     x*=x1; 
        a += x* 2.0              /525.0;                        x*=x1; 
        a += x* 13.0             /37800.0;                  x*=x1; 
        a += x* 4957.0           /145530000.0;              x*=x1; 
        a += x* 58007.0          /16216200000.0;            x*=x1;
        a += x* 1748431.0        /4469590125000.0;          x*=x1; 
        a += x* 4058681.0        /92100645000000.0;     x*=x1;
        a += x* 5313239803.0     /1046241656460000000.0;    x*=x1;
        a += x* 2601229460539.0/4365681093774000000000.0;   // x^10
        return Math.sqrt(a);
    }
*/


export default Maths;
export { Vec3, Mat4, Quat };