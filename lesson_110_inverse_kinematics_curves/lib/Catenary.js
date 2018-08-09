/*
// https://github.com/tasaboia/Procedural-Rope-Generator/blob/master/Assets/CatenaryTeste/Scripts/Catenary.cs
// http://rhin.crai.archi.fr/rld/plugin_details.php?id=990

//.............................
[ EXAMPLE ]
let maxLen 	= 5.0,
	segCnt	= 5,
	posA 	= new Vec3(1, 0.2, -0.5),
	posB 	= new Vec3(-2, 1.5, 1);

DVao.vecPoint( ePoint, posA, 0);
DVao.vecPoint( ePoint, posB, 0);

//.............................
// Get All Points Between Two Points
var ary = catenary.getSegmentPoints(posA, posB, maxLen, segCnt, false);
for(let i=0; i < ary.length; i++){
	DVao.vecPoint( ePoint, ary[i], 2);
}

//.............................
//Get Curve Y Positions, then appy it to the slope of the curve
let ary = catenary.getByLengths(posB.length(posA), maxLen, 10);
let vec = new Vec3();
for(let i=0; i < ary.length; i++){
	Vec3.lerp(posA, posB, (i+1) / segCnt, vec);
	vec.y -= ary[i];
	DVao.vecPoint( ePoint, vec, 2);
}
*/


function catenary(a, x){ return a * Math.cosh( x / a ); }

catenary.MAX_TRIES = 100;

catenary.getA = function(vecLen, maxLen){
	//Solving A comes from : http://rhin.crai.archi.fr/rld/plugin_details.php?id=990
	if(vecLen > maxLen){ console.log("exceed max length of catenary"); return null; }

	//....................................
	let e			= Number.MAX_VALUE,
		a			= 100,
		aTmp		= 0,
		maxLenHalf	= 0.5 * maxLen,//Math.sqrt(maxLen*maxLen - yDelta*yDelta),	//by accident found this works fine without all the aqrt & stuff
		vecLenHalf	= 0.5 * vecLen,
		i;

	for(i=0; i < catenary.MAX_TRIES; i++){
		//aTmp	= 0.5 * vecLen / ( Math.asinh( 0.5 * Math.sqrt(maxLen**2 - yDelta**2) / a ) );
		aTmp	= vecLenHalf / ( Math.asinh( maxLenHalf / a ) );
		e		= Math.abs( (aTmp - a) / a );
	    a		= aTmp;
	    if(e < 0.001) break;
	}
	//console.log("tries", i);
	return a;
}

catenary.getSegmentPoints = function(v0, v1, maxLen, segCnt=5, invert = false){
	let vecLen		= v1.length( v0 ), 		// Length between Two Points
		vecLenHalf 	= vecLen * 0.5,				// ... Half of that
		segInc		= vecLen / segCnt,			// Size of Each Segment
		A 			= catenary.getA(vecLen, maxLen),
		offset		= catenary(A, -vecLenHalf),	// Need starting C to base things at Zero, subtract offset from each c point
		rtn			= new Array(),
		pnt,xpos, c, i;


	for(i=1; i < segCnt; i++){
		pnt = [0,0,0];
		v0.lerp(v1, i / segCnt, pnt); //Vec3.lerp(v0, v1, i / segCnt, pnt);

		xpos	= i * segInc - vecLenHalf; 		// x position between two points but using half as zero center
		c		= offset - catenary(A, xpos);	// get a y value, but needs to be changed to work with coord system.

		if(!invert) pnt[1] -= c;
		else 		pnt[1] += c;

		rtn.push(pnt);
	}
	return rtn;
}

//TODO, This function creates a parabolic-like curve with its center at zero (-1 to 1).
//With that in mind, It creates the same set of values for both sides. To optimize this
//further, only calcuate from 0 to 1 then repeat those values backwards so we only process
//unique values and just repeat them for 0 to -1. They are the exact same Y values, no need to invert.
catenary.getByLengths = function(vecLen, maxLen, segCnt){
	let vecLenHalf 	= vecLen * 0.5,				// ... Half of that
		segInc		= vecLen / segCnt,			// Size of Each Segment
		A 			= catenary.getA(vecLen, maxLen),
		offset		= catenary(A, -vecLenHalf),	// Need starting C to base things at Zero, subtract offset from each c point
		rtn			= new Array(segCnt - 1),
		i;

	//loop in a -1 to 1 way.
	for(i=1; i < segCnt; i++) rtn[i-1] = offset - catenary(A, i * segInc - vecLenHalf);
	return rtn;
}




/*	//First version before doing some changes like taking things out that doesn't seem to be there.
	catenary.getA = function(vec0, vec1, ropeLen){
		//Solving A comes from : http://rhin.crai.archi.fr/rld/plugin_details.php?id=990
		let yDelta = vec1[1] - vec0[0],
			vecLen = vec1.length(vec0);

		if(yDelta > ropeLen || vecLen > ropeLen){ console.log("not enough rope"); return null; }
		if(yDelta < 0){	//Swop verts, low end needs to be on the left side
			var tmp 	= vec0;
			vec0		= vec1;
			vec1		= vec0;
			yDelta		*= -1;
		}

		//....................................
		const max_tries = 100;
		let vec3		= new Vec2( vec1[0], vec0[1] ),
			e			= Number.MAX_VALUE,
			a			= 100,
			aTmp		= 0,
			yRopeDelta	= 0.5 * Math.sqrt(ropeLen*ropeLen - yDelta*yDelta),	//Optimize the loop
			vecLenHalf	= 0.5 * vecLen,										//Optimize the loop
			i;

		for(i=0; i < max_tries; i++){
			//aTmp	= 0.5 * vecLen / ( Math.asinh( 0.5 * Math.sqrt(ropeLen**2 - yDelta**2) / a ) );
			aTmp	= vecLenHalf / ( Math.asinh( yRopeDelta / a ) );
			e		= Math.abs( (aTmp - a) / a );
		    a		= aTmp;
		    if(e < 0.001) break;
		}
		console.log("tries", i);
		return a;
	}
*/


export default catenary;