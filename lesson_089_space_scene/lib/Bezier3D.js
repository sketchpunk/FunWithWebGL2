import Vec3 from "../fungi/maths/Vec3.js";

class Bezier{
	static get(p0, p1, p2, p3, t, out){
		var i = 1 - t;
		out = out || new Vec3();
		out.x = i * i * i * p0.x  +  3 * i * i * t * p1.x  +  3 * i * t * t * p2.x  +  t * t * t * p3.x;
		out.y = i * i * i * p0.y  +  3 * i * i * t * p1.y  +  3 * i * t * t * p2.y  +  t * t * t * p3.y;
		out.z = i * i * i * p0.z  +  3 * i * i * t * p1.z  +  3 * i * t * t * p2.z  +  t * t * t * p3.z;
		return out;
	}

	static derivative(p0, p1, p2, p3, t, out){
		//Clamp t betwen 0 and 1
		if(t > 1)		t = 1;
		else if(t < 0)	t = 0;

		var i = 1 - t;
		out = out || new Vec3();
		out.x = 3 * i * i * (p1.x - p0.x)  +  6 * i * t * (p2.x - p1.x)  +  3 * t * t * (p3.x - p2.x);
		out.y = 3 * i * i * (p1.y - p0.y)  +  6 * i * t * (p2.y - p1.y)  +  3 * t * t * (p3.y - p2.y);
		out.z = 3 * i * i * (p1.z - p0.z)  +  6 * i * t * (p2.z - p1.z)  +  3 * t * t * (p3.z - p2.z);
		return out;
	}

	static splineAt(ary, t, out){
		var i;
		out = out || new Vec3();

		//Final Curve in the spline
		//This only work if norm is less then 1, 1 can screw things up so this condition prevents things from breaking.
		if(t >= 1){
			t = 1;
			i = ary.length - 4;
		}else{ //Determine which curve is being accessed.
			if(t < 0) t = 0;
			/* NOTE TO SELF
			The idea is to multiple t by total curves in the spline. This gives you a whole number and fraction. Ex : t = 0.6 cnt = 2, results 1.2
			The result gives both the curve index to access and the normal to apply to it. So for the example we need to access the
			second segment, so by flooring we strip out the decimal we get the value 1 (second curve where 0 would be the first based on indexes).
			If we take the T minus the Index to get the decimal which also works as the new normal that can be applied to the second curve.
			From there we just need to multiple by 3 to get the starting index of the curve.
			*/
			//determine which curve we're accessing by using the norm times curve count, Must be less then 1 to work.
			t *= (ary.length - 1) * 0.33333333333; // divide by 3
			i = Math.floor(t);		//Curve index by stripping out the decimal
			t -= i;					//Strip out the whole number to get the decimal norm to be used for the curve 
			i *= 3;					//Each curve starts at the 4th point in the array, so times 3 gets us the index where the curve starts.	
		}
		return Bezier.get( ary[i], ary[i+1], ary[i+2], ary[i+3], t, out );
	}

	static splineDerivativeAt(ary, t, out){
		var i;
		out = out || new Vec3();

		//Final Curve in the spline
		//This only work if norm is less then 1, 1 can screw things up so this condition prevents things from breaking.
		if(t >= 1){
			t = 1;
			i = ary.length - 4;
		}else{ //Determine which curve is being accessed.
			if(t < 0) t = 0;

			//determine which curve we're accessing by using the norm times curve count, Must be less then 1 to work.
			t *= (ary.length - 1) * 0.33333333333; // divide by 3
			i = Math.floor(t);		//Curve index by stripping out the decimal
			t -= i;					//Strip out the whole number to get the decimal norm to be used for the curve 
			i *= 3;					//Each curve starts at the 4th point in the array, so times 3 gets us the index where the curve starts.	
		}
		return Bezier.derivative( ary[i], ary[i+1], ary[i+2], ary[i+3], t, out );
	}

	static applySplineMidControl(ary, a, b, c, scale){
		//http://scaledinnovation.com/analytics/splines/aboutSplines.html
		let lenBA	= ary[a].length( ary[b] ),	// Length of M to A
			lenBC	= ary[c].length( ary[b] ),	// Length of M to B
			lenACi	= 1 / (lenBA + lenBC),		// Total Length of MA+MB inverted
			scaleA	= scale * lenBA * lenACi,	// Using the lengths, normalize it
			scaleB	= scale * lenBC * lenACi,
			deltaAC	= Vec3.sub( ary[c], ary[a] );	// Slope of A and B, used as the line for the mid control pnts

		ary[b].sub( Vec3.scale(deltaAC, scaleA), ary[b-1] );
		ary[b].add( Vec3.scale(deltaAC, scaleB), ary[b+1] );
	}
}

export default Bezier;