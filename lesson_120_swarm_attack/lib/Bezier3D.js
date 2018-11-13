import Vec3 from "../fungi/maths/Vec3.js";

class Bezier{
	static get(p0, p1, p2, p3, t, out){
		let i		= 1 - t,
			ii		= i * i,
			iii		= ii * i,
			tt 		= t * t,
			ttt 	= tt * t,
			iit3 	= 3 * ii * t,
			itt3 	= 3 * i * tt;

		out = out || new Vec3();
		//out.x = i * i * i * p0.x  +  3 * i * i * t * p1.x  +  3 * i * t * t * p2.x  +  t * t * t * p3.x;
		//out.y = i * i * i * p0.y  +  3 * i * i * t * p1.y  +  3 * i * t * t * p2.y  +  t * t * t * p3.y;
		//out.z = i * i * i * p0.z  +  3 * i * i * t * p1.z  +  3 * i * t * t * p2.z  +  t * t * t * p3.z;

		out.x = iii * p0.x + iit3 * p1.x + itt3 * p2.x + ttt * p3.x;
		out.y = iii * p0.y + iit3 * p1.y + itt3 * p2.y + ttt * p3.y;
		out.z = iii * p0.z + iit3 * p1.z + itt3 * p2.z + ttt * p3.z;
		return out;
	}

	/* First Derivative represents Curve's Tangent or the Speed Direction*/
	static derivative(p0, p1, p2, p3, t, out){ // bigO( 31 )
		//Clamp t betwen 0 and 1
		if(t > 1)		t = 1;
		else if(t < 0)	t = 0;

		var i	= 1 - t,
			ii3	= 3 * i * i,
			it6	= 6 * i * t,
			tt3	= 3 * t * t;

		out = out || new Vec3();
		//out.x = 3 * i * i * (p1.x - p0.x)  +  6 * i * t * (p2.x - p1.x)  +  3 * t * t * (p3.x - p2.x);
		//out.y = 3 * i * i * (p1.y - p0.y)  +  6 * i * t * (p2.y - p1.y)  +  3 * t * t * (p3.y - p2.y);
		//out.z = 3 * i * i * (p1.z - p0.z)  +  6 * i * t * (p2.z - p1.z)  +  3 * t * t * (p3.z - p2.z);

		out.x = ii3 * (p1.x - p0.x)  +  it6 * (p2.x - p1.x)  +  tt3 * (p3.x - p2.x);
		out.y = ii3 * (p1.y - p0.y)  +  it6 * (p2.y - p1.y)  +  tt3 * (p3.y - p2.y);
		out.z = ii3 * (p1.z - p0.z)  +  it6 * (p2.z - p1.z)  +  tt3 * (p3.z - p2.z);

		return out;
	}

	//https://stackoverflow.com/questions/35901079/calculating-the-inflection-point-of-a-cubic-bezier-curve
	static derivative_2(p0, p1, p2, p3, t, out){ // bigO ( 31 )
		//Clamp t betwen 0 and 1
		if(t > 1)		t = 1;
		else if(t < 0)	t = 0;

		out = out || new Vec3();
		let t6 = 6 * t;
		out.x = t6 * (p3.x + 3 * (p1.x - p2.x) - p0.x) + 6 * (p0.x - 2 * p1.x + p2.x);
		out.y = t6 * (p3.y + 3 * (p1.y - p2.y) - p0.y) + 6 * (p0.y - 2 * p1.y + p2.y);
		out.z = t6 * (p3.z + 3 * (p1.z - p2.z) - p0.z) + 6 * (p0.z - 2 * p1.z + p2.z);
		return out;
	}

	// 
	static normal(p0, p1, p2, p3, t, out){
		let // Get Derivitive which we can use as its forward direction of an XYZ axis
			d1	= Bezier.derivative(p0, p1, p2, p3, t).normalize(),
			// can also use first derivitive with a forward offset of t, but D2's BigO is the same, so better off using D2
			d2	= Bezier.derivative_2(p0, p1, p2, p3, t).normalize(),	
			// Create cross product for form a rotation axis.
			cp	= Vec3.cross(d2, d1).normalize();						

		// cp create a Rotation Matrix that can be applied on the first derivitive.
		// The idea to rotate the derivitive 90 degrees on the axis of c
		out.x = (cp.x * cp.x)			* d1.x + (cp.x * cp.y - cp.z)	* d1.y + (cp.x * cp.z + cp.y)	* d1.z;
		out.y = (cp.x * cp.y + cp.z)	* d1.x + (cp.y * cp.y)			* d1.y + (cp.y * cp.z - cp.x)	* d1.z;
		out.z = (cp.x * cp.z - cp.y)	* d1.x + (cp.y * cp.z + cp.x)	* d1.y + (cp.z * cp.z)			* d1.z;
		return out;
	}

	//Get the 3 axis directions for a specific spot
	static axis(p0, p1, p2, p3, t, out = null){
		if(! out) out = { x:new Vec3(), y:new Vec3(), z:new Vec3() };
		Bezier.derivative(p0, p1, p2, p3, t, out.z).normalize();

		let	d2 = Bezier.derivative_2(p0, p1, p2, p3, t).normalize();
		
		Vec3.cross(d2, out.z, out.x).normalize();						

		let cp = out.x,	//Short cuts
			d1 = out.z;
		out.y[0] = (cp.x * cp.x)		* d1.x + (cp.x * cp.y - cp.z)	* d1.y + (cp.x * cp.z + cp.y)	* d1.z;
		out.y[1] = (cp.x * cp.y + cp.z)	* d1.x + (cp.y * cp.y)			* d1.y + (cp.y * cp.z - cp.x)	* d1.z;
		out.y[2] = (cp.x * cp.z - cp.y)	* d1.x + (cp.y * cp.z + cp.x)	* d1.y + (cp.z * cp.z)			* d1.z;
		out.y.normalize();

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

// https://gist.github.com/BonsaiDen/670236
// https://gamedev.stackexchange.com/questions/5373/moving-ships-between-two-planets-along-a-bezier-missing-some-equations-for-acce/5427#5427
class BezierArcLength{
	constructor(v0,v1,v2,v3, sampleCnt=null){
		this.v0 = new Vec3( v0 );
		this.v1 = new Vec3( v1 );
		this.v2 = new Vec3( v2 );
		this.v3 = new Vec3( v3 );

		this.samples		= null;		// Mapping of t to arc length to that point on curve.
		this.sampleCnt		= 0;		// Count of samples		
		this.sampleCntInv 	= 0;		// Avoid Division in get function
		this.arcLength		= 0;		// approximation of the length of the curve 

		if( sampleCnt ) this.createSamples( sampleCnt );
	}

	createSamples( cnt ){
		this.samples		= new Array( cnt + 1 );
		this.samples[0]		= 0;
		this.sampleCnt		= cnt;
		this.sampleCntInv	= 1 / cnt;
		this.arcLength		= 0;

		//...................................
		// Make an array of samples. The idea is to
		// map the curve t to the arc length at that point.
		// At each step, we accumulate the length of the curve
		let v			= new Vec3(),
			vp			= new Vec3( this.v0 ),
			simpleInv	= 1 / cnt;

		for(let i=1; i <= cnt; i++){
			Bezier.get(	this.v0, this.v1, this.v2, this.v3, 
						i * simpleInv, v);

			this.arcLength	+= v.length( vp );
			this.samples[i]	= this.arcLength;

			vp.copy( v );
		}
		return this;
	}

	setPoints( a, b, c, d, sampleCnt=10 ){
		this.v0.copy( a );
		this.v1.copy( b );
		this.v2.copy( c );
		this.v3.copy( d );

		this.createSamples( sampleCnt );
		return this;
	}

	// The purpose of this function is to map the t of the arc length to the
	// t of the curve. This will ideally allow the traversal of  the  curve
	// based on its total length.
	mapT(t){
		//.......................................
		// Return Extremes, else set variables
		if(t <= 0) return 0;
		if(t >= 1) return 1;
		
		let targetLen	= t * this.arcLength,
			minIdx 		= 0,
			min 		= 0,
			max 		= this.sampleCnt;

		//.......................................
		// Binary Search to find the idx of a sample
		// that is just below the target length so if the target is 10, 
		// find index that has a length at 10 or ver close on the min side,like 9
		while( min < max ){
			minIdx = min + ( ((max - min) * 0.5) | 0 ); //get mid index, use pipe for same op as Math.floor()
			
			// if sample is under target, use mid index+1 as new min
			// else sample is over target, use index as max for next iteration
			if(this.samples[minIdx] < targetLen)	min	= minIdx + 1;
			else 								max	= minIdx;
		}

		// if by chance sample is over target because we ended up with max index, go back one.
		if( this.samples[minIdx] > targetLen ) minIdx--;

		//Check if the idex is within bounds
		if( minIdx < 0 )					return 0;	// Well, can't have less then 0 as an index :)
		if( minIdx >= this.sampleCnt )		return 1;	// if the max value is less then target, just return 1;

		//.......................................
		// Interpolate between the min and max indexes.

		let minLen = this.samples[ minIdx ];
		if( minLen == targetLen )	return minIdx * this.sampleCntInv; //ii = minIdx / this.sampleCnt;
		
		// Where does the targetLen exist between the min and maxLen... this t is the
		// Length interplation between the two sample points. Since Each sample point
		// itself is the t of the curve. So for example,
		// minIdx is 2 and we have 10 samples,  So we can get the curve t by doing minIdx / SampleCnt
		// Now are target leng lives between  index 2 and 3... So by finding the gradient  value between
		// for example 0.5...   So we're on index 2 but we need an extra half of index... So 2.5 sample index
		// We take that value and divide - 2.5 / sampleCnt = t of curve in relation to arc length.

		let maxLen	= this.samples[ minIdx + 1 ],
			tLen	= (targetLen - minLen) / ( maxLen - minLen );
		//console.log(t, minIdx, tLen, ( minIdx + tLen ) * this.sampleCntInv);
		return ( minIdx + tLen ) * this.sampleCntInv;
		//return (minIdx + (targetLen - minLen) / (this.samples[minIdx + 1] - minLen)) * this.sampleCntInv;				
		//return (minIdx + (targetLen - minLen) / (this.samples[minIdx + 1] - minLen)) / this.sampleCnt;
	}

	getVec(v, t){
		let tt = this.mapT( t );
		Bezier.get(this.v0, this.v1, this.v2, this.v3, tt, v);
		return v;
	}
}

export default Bezier;
export { BezierArcLength };