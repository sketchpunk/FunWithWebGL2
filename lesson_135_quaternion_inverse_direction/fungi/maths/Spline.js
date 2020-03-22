import Vec3 from "./Vec3.js";

function mod( a, b ){ let v = a % b; return ( v < 0 )? b+v : v; } // Modulas that handles Negatives, so (-1, 5) = 4

//####################################################################################
// MAIN OBJECT

class Spline{
	points 	= new Array();	// Array of Points to be used in the Spline
	curve 	= null;			// Reference to the curve object
	is_loop = false;		// Is the spline closed?

    static from_hermite( is_loop=false ){ return new Spline( Hermite, is_loop ); }
    static from_bezier_cubic( is_loop=false ){ return new Spline( BezierCubic, is_loop ); }

	constructor( c, is_loop=false ){
		this.curve		= c;
		this.is_loop	= is_loop;
	}

	add( p, data=null ){
		this.points.push({
			pos 	: new Vec3( p ),
			data 	: data,
		});
		return this;
    }
    
    load_flat_array( ary ){
        for( let i=0; i < ary.length; i+=3 )
            this.points.push({
                pos		: new Vec3().from_buf( ary, i ), 
                data	: null,
			})
		return this;
    }

	at( t, out ){
		out = out || new Vec3();

		let info = this.curve.spline_t( t, this.points.length, this.is_loop );
		this.curve.at( info, this.points, out );

		return out;
	}

	// Get a position of a specific curve
	at_curve( i, t, out ){
		let info = this.curve.spline_get( i, this.points.length, this.is_loop );
		info.t = t;

		out = out || new Vec3();
		this.curve.at( info, this.points, out );

		return out;
	}

	dxdy( t, out ){
		out = out || new Vec3();

		let info = this.curve.spline_t( t, this.points.length, this.is_loop );
		this.curve.dxdy( info, this.points, out );

		return out;
    }
    
	gen_map( samp_cnt=5 ){ return new SplineMap( this, samp_cnt ); }
	
	curve_count(){ return this.curve.spline_count( this.points.length, this.is_loop ); }

    static debug_points( d, s ){ for( let p of s.points ) d.pnt( p.pos, 0x00ffff, 2, 15 ); return this; }
    static debug_path( d, s, samp=10 ){
        let t, v0 = new Vec3(), v1 = new Vec3();
        s.at( 0, v0 );
        d.pnt( v0, 0xff0000, 2, 5 );
        for( let i=1; i <= samp; i++ ){
            t = i / samp;
            s.at( t, v1 );
            d.ln( v0, v1 );    
            v0.copy( v1 );
        }
        return this;
    }
}

//####################################################################################
// CURVE EQUATIONS TO BE USED BY SPLINE

class Hermite{
	static at( info, pnts, out ){
		let t 	= info.t,
			ti 	= 1 - t,
			t2	= t * t,
			t3	= t2 * t,
			a0	= 2*t3 - 3*t2 + 1,
			a1	= t3 - 2*t2 + t,
			a2	= t3 - t2,
			a3	= -2*t3 + 3*t2;

		let a = pnts[ info.a ].pos,
			b = pnts[ info.b ].pos,
			c = pnts[ info.c ].pos,
			d = pnts[ info.d ].pos;

		let b_tension 	= pnts[ info.b ].data?.tension || 0, 
			c_tension 	= pnts[ info.c ].data?.tension || 0, 
			b_bias		= pnts[ info.b ].data?.bias || 0,
			c_bias		= pnts[ info.c ].data?.bias || 0;

		let tension	= b_tension * ti	+ c_tension * t,	// Lerp Tension between Points
			bias 	= b_bias * ti		+ c_bias * t,		// Lerp Bias between Points
			tb_n 	= ( 1 - bias) * ( 1 - tension ) * 0.5,
			tb_p 	= ( 1 + bias) * ( 1 - tension ) * 0.5;

		out[0] = a0*b[0] + a1 * ( (b[0]-a[0]) * tb_p + (c[0]-b[0]) * tb_n ) + a2 * ( (c[0]-b[0]) * tb_p + (d[0]-c[0]) * tb_n ) + a3*c[0];
		out[1] = a0*b[1] + a1 * ( (b[1]-a[1]) * tb_p + (c[1]-b[1]) * tb_n ) + a2 * ( (c[1]-b[1]) * tb_p + (d[1]-c[1]) * tb_n ) + a3*c[1];
		out[2] = a0*b[2] + a1 * ( (b[2]-a[2]) * tb_p + (c[2]-b[2]) * tb_n ) + a2 * ( (c[2]-b[2]) * tb_p + (d[2]-c[2]) * tb_n ) + a3*c[2];
		return out;
	}

	static dxdy( info, pnts, out ){
		let t 	= info.t,
			ti 	= 1 - t,
			tt  = t * t,
			tt6 = 6 * tt,
			tt3 = 3 * tt,
			a0  = tt6 - 6*t,
			a1  = tt3 - 4*t + 1,
			a2  = tt3 - 2*t,
			a3  = 6*t - tt6;

		let a = pnts[ info.a ].pos,
			b = pnts[ info.b ].pos,
			c = pnts[ info.c ].pos,
			d = pnts[ info.d ].pos;

		let b_tension 	= pnts[ info.b ].data?.tension || 0, 
			c_tension 	= pnts[ info.c ].data?.tension || 0, 
			b_bias		= pnts[ info.b ].data?.bias || 0,
			c_bias		= pnts[ info.c ].data?.bias || 0;

		let tension	= b_tension * ti	+ c_tension * t,	// Lerp Tension between Points
			bias 	= b_bias * ti		+ c_bias * t,		// Lerp Bias between Points
			tb_n 	= ( 1 - bias) * ( 1 - tension ) * 0.5,
			tb_p 	= ( 1 + bias) * ( 1 - tension ) * 0.5;

		out[0] = a0 * b[0] + a1 * ( (b[0]-a[0]) * tb_p  + (c[0]-b[0]) * tb_n ) + a2 * ( (c[0]-b[0]) * tb_p  + (d[0]-c[0]) * tb_n ) + a3 * c[0];
		out[1] = a0 * b[1] + a1 * ( (b[1]-a[1]) * tb_p  + (c[1]-b[1]) * tb_n ) + a2 * ( (c[1]-b[1]) * tb_p  + (d[1]-c[1]) * tb_n ) + a3 * c[1];
		out[2] = a0 * b[2] + a1 * ( (b[2]-a[2]) * tb_p  + (c[2]-b[2]) * tb_n ) + a2 * ( (c[2]-b[2]) * tb_p  + (d[2]-c[2]) * tb_n ) + a3 * c[2];
		return out;
	}

	static spline_count( point_cnt, is_loop=false ){ return ( is_loop )? point_cnt : point_cnt - 3; }

	static spline_get( i, point_cnt, is_loop=false ){
		return ( is_loop )?
			{ a:mod( i-1, point_cnt ), b:i, c:mod( i+1, point_cnt ), d:mod( i+2, point_cnt ) } :
			{ a:i, b:i+1, c:i+2, d:i+3 };
	}

	static spline_t( t, point_cnt, is_loop=false ){
		let i, tt, ti, ai, bi, ci, di;

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Figure out the starting index of the curve and the time on the curve.
		if( t > 1 ) 		t = 1;
		else if( t < 0 )	t = 0;

		if( is_loop ){
			if( t != 1 ){
				tt = t * point_cnt;
				i  = tt | 0;
				tt -= i;	
			}else{
				i	= point_cnt - 1;
				tt	= 1;
			}	

			ti = 1 - tt;
			ai = mod( i-1, point_cnt );
			bi = i;
			ci = mod( i+1, point_cnt );
			di = mod( i+2, point_cnt );
		}else{ 								// Determine which curve is being accessed
			if( t != 1 ){
				tt	= t * (point_cnt - 3) 	// curve_cnt = point_cnt-3
				i 	= tt | 0;				// Curve index by stripping out the decimal, BitwiseOR 0 same op as Floor
				tt	-= i;					// Strip out the whole number to get the decimal norm to be used for the curve ( FRACT )
			}else{
				i	= point_cnt - 4;
				tt	= 1;
			}

			ti 	= 1 - tt;	// Time Inverse	
			ai 	= i;
			bi 	= i + 1;
			ci	= i + 2;
			di	= i + 3;
		}

		return { t:tt, a:ai, b:bi, c:ci, d:di };
	}
}

class BezierCubic{
	static at( info, pnts, out ){
		let t 	 	= info.t,
			i		= 1 - t,
			ii		= i * i,
			iii		= ii * i,
			tt 		= t * t,
			ttt 	= tt * t,
			iit3 	= 3 * ii * t,
			itt3 	= 3 * i * tt;

		let a = pnts[ info.a ].pos,
			b = pnts[ info.b ].pos,
			c = pnts[ info.c ].pos,
			d = pnts[ info.d ].pos;

		out[0] = iii * a[0] + iit3 * b[0] + itt3 * c[0] + ttt * d[0];
		out[1] = iii * a[1] + iit3 * b[1] + itt3 * c[1] + ttt * d[1];
		out[2] = iii * a[2] + iit3 * b[2] + itt3 * c[2] + ttt * d[2];
		return out;
	}

	static dxdy( info, pnts, out){
		let t 	= info.t,
			i	= 1 - t,
			ii3	= 3 * i * i,
			it6	= 6 * i * t,
			tt3	= 3 * t * t;

		let a = pnts[ info.a ].pos,
			b = pnts[ info.b ].pos,
			c = pnts[ info.c ].pos,
			d = pnts[ info.d ].pos;

		out[0] = ii3 * (b[0] - a[0])  +  it6 * (c[0] - b[0])  +  tt3 * (d[0] - c[0]);
		out[1] = ii3 * (b[1] - a[1])  +  it6 * (c[1] - b[1])  +  tt3 * (d[1] - c[1]);
		out[2] = ii3 * (b[2] - a[2])  +  it6 * (c[2] - b[2])  +  tt3 * (d[2] - c[2]);

		return out;
	}

	static spline_t( t, point_cnt, is_loop=false ){
		let i, a, b, c, d;
		if( is_loop ){
			if( t >= 1 ){ t = 1; a = point_cnt-1; b = point_cnt-2; c = 1; d = 0; }
			else if( t <= 0 ){ t = 0; a = 0; b = 1; c = 2; d = 3; }
			else{
				let curve_cnt = Math.round( (point_cnt - 1) * 0.33333333333 );
				t *= ( point_cnt + 2 ) * 0.33333333333;
				i = t | 0;	//Floor value
				t -= i;		// Fract

				if( i == curve_cnt ){ a = point_cnt-1; b = point_cnt-2; c = 1; d = 0; }
				else{
					i *= 3;
					a = i; b = i+1; c = i+2; d = i+3;
				}
			}
		}else{
			if(t >= 1){
				t = 1;
				i = point_cnt - 4;
			}else if( t <= 0 ){
				t = 0;
				i = 0;
			}else{ //Determine which curve is being accessed.
				if(t < 0) t = 0;
				t *= (point_cnt - 1) * 0.33333333333; // divide by 3
				i = t | 0;				// Curve index by stripping out the decimal
				t -= i;					// Strip out the whole number to get the decimal norm to be used for the curve ( FRACT )
				i *= 3;					// Each curve starts at the 4th point in the array, so times 3 gets us the index where the curve starts.	
			}

			a = i; b = i+1; c = i+2; d = i+3;
		}

		return { t, a, b, c, d };
	}
}

//####################################################################################
// MAP SPLINE BASED ON ARC LENGTH, EVEN OUT MOVEMENT ON THE CURVE.

class SplineMap{
	arc_len		= 0;	// Total Length of the Spline
	curve_cnt 	= 0;	// How many curves in spline
	samp_per 	= 0;	// How many samples per curve
	samp_cnt 	= 0;	// Total Sample Count
	len_ary 	= null;	// Total length at each sample 
	inc_ary 	= null;	// Length Traveled at each samples
	time_ary 	= null; // Curve T Value at each samples
	//spline 		= null;	// Reference to Spline

	constructor( s=null, samp_cnt=5 ){
		if( s ) this.from_spine( s, samp_cnt );
	}

	from_spine( s, samp_cnt=5 ){
		//this.spline 	= s;
		this.curve_cnt	= s.curve_count();
		this.samp_per 	= samp_cnt;
		this.samp_cnt	= this.curve_cnt * samp_cnt + 1;
		this.len_ary 	= new Array( this.samp_cnt );
		this.inc_ary	= new Array( this.samp_cnt );
		this.time_ary	= new Array( this.samp_cnt );
	
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		let v0	= new Vec3(),
			v1	= new Vec3(),
			a	= 1, 
			i, j, t, len;

		s.at( 0, v0 );
		this.len_ary[ 0 ]	= 0;
		this.inc_ary[ 0 ]	= 0;
		this.time_ary[ 0 ]	= 0;

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		for( i=0; i < this.curve_cnt; i++ ){				// One Iteration Per Curve
			for( j=1; j <= samp_cnt; j++ ){					// One Iteractin per Sample on 1 Curve
				t = j / samp_cnt;							// Time on the curve
				s.at_curve( i, t, v1 );						// Get Position of the curve

				//.................................
				len 				= Vec3.len( v0, v1 );
				this.arc_len		+= len;					// Total Length
				this.len_ary[ a ]	= this.arc_len;			// Current Total Length
				this.inc_ary[ a ]	= len;					// Length between Current+Previous Point
				this.time_ary[ a ]	= i + t;				// Time Curve Step

				//.................................
				v0.copy( v1 );								// Save for next loop
				a++;										// Move Array Index up
			}
		}
		return this;
	}

	// Compute the Spline's T Value based on a specific length of the curve
	at_len( len, a=null, b=null ){
		if( a == null ) a = 0;
		if( b == null ) b = this.samp_cnt-2;

		for( let i=b; i >= a; i-- ){
			if( this.len_ary[ i ] < len ){
				let tt	= ( len - this.len_ary[ i ] ) / this.inc_ary[ i+1 ]; 		// Normalize the Search Length   ( x-a / b-a )
				let ttt	= this.time_ary[ i ] * (1-tt) + this.time_ary[ i+1 ] * tt;	// Interpolate the Curve Time between two points
				return ttt / this.curve_cnt;	// Since time saved as as Curve# + CurveT, Normalize it based on total time which is curve count
			}
		}
		return 0;
	}

	// Get Spline T based on Time of Arc Length
	at( t ){
		if( t >= 1 ) return 1;
		if( t <= 0 ) return 0;
		return this.at_len( this.arc_len * t );
	}

	// Get Spline T based on Time between Two Main Points on the Spline
	at_range( a, b, t ){
		let ai 	= a * this.samp_per,
			bi	= b * this.samp_per,
			len	= this.len_ary[ ai ] * (1-t) + this.len_ary[ bi ] * t;
		return this.at_len( len, ai, bi );
	}
}


//####################################################################################

export default Spline;
export { Hermite, BezierCubic, SplineMap };

// #region samples
/*
async function init(){
	gSpline = Spline.from_hermite( true );
	//gSpline = gSpline = Spline.from_bezier_cubic( true );

	gSpline
		.add( [-1.5,1,-1.5],	{ tension:0, bias:0 } )
		.add( [-0.8,0.2,1.2],	{ tension:0, bias:0 } )
		.add( [1.4,0.5,1],		{ tension:0, bias:0 } )
		.add( [0.5,0,-0.5],		{ tension:0, bias:0 } );

	out_pnts( gSpline );
	out_path( gSpline, 30 );
	let map = gSpline.gen_map();
	out_map( gSpline, map );
	return true;
}

function out_pnts( s ){
	for( let p of s.points ) App.Debug.pnt( p.pos, 0x00ffff, 2, 15 );
}

function out_path( s, samp=10 ){
	let t, v0 = new Vec3(), v1 = new Vec3();

	s.at( 0, v0 );
	App.Debug.pnt( v0, 0xff0000, 2, 5 );

	for( let i=1; i <= samp; i++ ){
		t = i / samp;
		s.at( t, v1 );


		App.Debug.ln( v0, v1 );
		//App.Debug.pnt( v1, 0xff0000, 2, 5 );

		v0.copy( v1 );
	}
}

function out_map( s, m, samp=10 ){
	let t,tt, v = new Vec3(), d = new Vec3(), dd = new Vec3();

	for( let i=0; i <= samp; i++ ){
		t = i / samp;
		tt = m.at( t );
		
		s.at( tt, v );
		s.dxdy( tt, d ).norm();

		App.Debug
			.pnt( v, 0x00ff00, 1, 5 )
			.ln( v, dd.from_scale( d, 0.3 ).add( v ), 0x00ff00 );
	}
}
*/
// #endregion