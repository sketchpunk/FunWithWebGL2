import Vec3		from "./maths/Vec3.js";
import Mat3		from "./maths/Mat3.js";
import Mat4		from "./maths/Mat4.js";
import Quat		from "./maths/Quat.js";
import DualQuat from "./maths/DualQuat.js";

const DEG2RAD = Math.PI/180;
const RAD2DEG = 180/Math.PI;

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


//Normalize x value to x range, then normalize to lerp the z range.
function map(x, xMin,xMax, zMin,zMax){ return (x - xMin) / (xMax - xMin) * (zMax-zMin) + zMin; }

function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }

function smoothStep(edge1, edge2, val){ //https://en.wikipedia.org/wiki/Smoothstep
	var x = Math.max(0, Math.min(1, (val-edge1)/(edge2-edge1)));
	return x*x*(3-2*x);
}

//Get a number between A and B from a normalized number.
function lerp(a,b,t){ return a + t * (b-a); }

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


export default { DEG2RAD:DEG2RAD, RAD2DEG:RAD2DEG,
	map:map,
	clamp:clamp,
	smoothStep:smoothStep,
	closestPointToLine2D:closestPointToLine2D,
	closestPointToLine3D:closestPointToLine3D,
	closestpoint_2Lines:closestpoint_2Lines,
	closestPointS_2Segments:closestPointS_2Segments,
}

export { Vec3, Mat3, Mat4, Quat, DualQuat, DEG2RAD, RAD2DEG }