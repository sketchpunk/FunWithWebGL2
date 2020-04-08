import App 			from "../App.js";
import Util			from "./Util.js";
import Vec3Buffer	from "../maths/Vec3Buffer.js";

// TODO, there is a few other different torus shapes that can be programmed.
// https://blackpawn.com/texts/pqtorus/

//###########################################################################################
// PLAIN TORUS

function Torus( name, mat, col_cnt=8, row_cnt=10, tube_radius=0.2, radius=0.5 ){
	let geo		= Torus.geo( col_cnt, row_cnt, tube_radius, radius );
	let mesh	= App.Mesh.from_data( name + "_mesh", geo.vert, geo.idx );
	return App.$Draw( name, mesh, mat, App.Mesh.TRI );
}

Torus.geo = function( col_cnt=8, row_cnt=10, tube_radius=0.2, radius=0.5 ){
	let shape	= Util.circle_verts( col_cnt, tube_radius ).rng_add( radius, 0, 0 );
	let v_ary 	= Util.lathe( shape, row_cnt, "y" );

	// Compute Verts a different way to include normals.

	return { 
		vert	: v_ary.dissolve(), 
		//norm	: n_ary.dissolve(),
		idx 	: Util.grid_indices( col_cnt, row_cnt, true, true, false )
	};
}


//###########################################################################################
// TORUS KNOT

Torus.knot = function( name, mat, col_cnt=6, row_cnt=90, tube_radius=0.3, curve_p=2, curve_q=3, curve_radius=1.0 ){
	let geo		= Torus.knot_geo( col_cnt, row_cnt, tube_radius, curve_p, curve_q, curve_radius );
	let mesh	= App.Mesh.from_data( name + "_mesh", geo.vert, geo.idx, geo.norm );
	return App.$Draw( name, mesh, mat, App.Mesh.TRI );
}

Torus.knot_geo = function( col_cnt=10, row_cnt=60, tube_radius=0.3, curve_p=2, curve_q=3, curve_radius=1.0 ){	
	let shape	= Util.circle_verts( col_cnt, tube_radius ), // Shape to Extrude
		v_ary	= new Vec3Buffer( col_cnt * row_cnt ),	// Vertex Buffer
		n_ary	= new Vec3Buffer( col_cnt * row_cnt ),	// Vertex Normal Buffer
		p		= new App.Vec3(),	// Curve Position
		v		= new App.Vec3(),	// Final vertex
		n		= new App.Vec3(),	// Final vertex norma.
		fwd		= new App.Vec3(),	// axis directions
		lft		= new App.Vec3(),
		up		= new App.Vec3(),
		q		= new App.Quat(),	// Rotation for extruded shape
		ct, i, j;

	for( i=0; i < row_cnt; i++ ){
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		ct = i / row_cnt; // Curve Time

		torus_knot( p, ct, curve_p, curve_q, curve_radius );							// Pos On Curve
		torus_knot_dxdy( fwd, ct, curve_p, curve_q, curve_radius );						// Fwd Dir of Point
		torus_knot_dxdy( up, (i + 0.00001) / row_cnt, curve_p, curve_q, curve_radius );	// Near Future Fwd Dir
		
		fwd.norm();							// Forward
		up.add( p );						// Temp Up ( Adding to pos makes it twist less )
		lft.from_cross( up, fwd ).norm();	// Left
		up.from_cross( fwd, lft ).norm();	// Orthogonal Up
	
		q.from_axis( lft, up, fwd );		// Create Rotation Based on Orthogonal Axis

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		for( j=0; j < shape.len; j++ ){
			shape.copy_to( j, v );	// Get position from vert buffer
			v.transform_quat( q )	// Rotate the vector
			n.from_norm( v );		// Normalize a copy
			v.add( p );				// Move vert into position

			v_ary.push( v );		// Save Verts
			n_ary.push( n ); 		// Save Normal
		}
	}

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	return { 
		vert	: v_ary.dissolve(), 
		norm	: n_ary.dissolve(),
		idx 	: Util.grid_indices( col_cnt, row_cnt, true, true, true )
	};
}

// p : winds around its axis of rotational symmetry
// q : winds around a circle in the interior
function torus_knot( out, t, p=2, q=5, radius=1 ){
	// https://blackpawn.com/texts/pqtorus/
	// https://en.wikipedia.org/wiki/Torus_knot
	let x 		= t * p * Math.PI * 2,
		qpx		= q / p * x,
		rh		= radius * 0.5,
		qpx_xy	= rh * (2 + Math.cos( qpx ));

	out[0] = qpx_xy * Math.cos( x );
	out[1] = qpx_xy * Math.sin( x );
	out[2] = rh * Math.sin( qpx );
	return out;
}

// first derivative - tangent of curve
function torus_knot_dxdy( out, t, p=2, q=5, radius=1 ){
	let x 		= t * p * Math.PI * 2,
		rh 		= radius * 0.5,
		pi 		= 1 / p,
		qpx		= q * x * pi,
		sin_x	= Math.sin( x ),
		cos_x 	= Math.cos( x ),
		sin_qpx	= Math.sin( qpx ),
		cos_qpx	= Math.cos( qpx );

	// https://www.symbolab.com/solver/derivative-calculator
	// Original Torus Knot Equation
	// x = r * ( 2 + cos( q/p * x ) ) * 0.5 * cos( x )
	// y = r * ( 2 + cos( q/p * x ) ) * 0.5 * sin( x )
	// z = r * sin( q/p * x ) * 0.5

	out[0] = rh * ( -sin_x * ( 2 + cos_qpx ) - q*sin_qpx*cos_x*pi );
	out[1] = rh * ( cos_x * ( 2 + cos_qpx ) - q*sin_qpx*sin_x*pi );
	out[2] = rh * q * cos_qpx * pi ;
	return out;
}

// second derivative - normal of curve
function torus_knot_dxdy2( out, t, p=2, q=5, radius=1 ){
	let x 		= t * p * Math.PI * 2,
		rh 		= radius * 0.5,
		pq2 	= 2 * p * q,
		qxp		= q * x / p,
		pp		= p*p,
		ppi 	= 1 / pp,
		qq		= q*q,
		cos_x	= Math.cos( x ),
		sin_x	= Math.sin( x ),
		cos_qxp	= Math.cos( qxp ),
		sin_qxp	= Math.sin( qxp ),
		com 	= (pp + qq) * cos_qxp + 2 * pp,
		n_rh_pp	= -rh * ppi;

	// https://www.wolframalpha.com/
	// First Derivative
	// 0.5 * r * ( -sin( x ) * ( 2 + cos( q * x / p ) ) - ( q * sin( q * x / p ) * cos( x ) / p ) )
	// 0.5 * r * ( cos( x ) * ( 2 + cos( q * x / p ) ) - ( q * sin( q * x / p ) * sin( x ) / p ) )
	// r * 0.5 * q * cos( q * x / p ) / p

	out[0] = n_rh_pp * ( cos_x * com - pq2 * sin_x * sin_qxp );
	out[1] = n_rh_pp * ( sin_x * com + pq2 * cos_x * sin_qxp );
	out[2] = -0.5 * qq * radius * sin_qxp * ppi;
	return out;
}

//###########################################################################################

export default Torus;