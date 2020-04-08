import Vec3			from "../maths/Vec3.js";
import Vec3Buffer	from "../maths/Vec3Buffer.js";
import Util			from "./Util.js";

function Capsule( name="capsule", mat, lathe_cnt=8, arc_div=5, radius=0.5, height=0.25 ){
	let geo	= Capsule.geo( lathe_cnt, arc_div, radius, height ),
		m 	= App.Mesh.from_data( name, geo.vert, geo.ind, geo.norm );
	return App.$Draw( name, m, mat, App.Mesh.TRI );
}

Capsule.geo = function( lathe_cnt=8, arc_div=5, radius=0.5, height=0.25 ){
	let x = Capsule.vertices( lathe_cnt, arc_div, radius, height );
	return {
		vert	: x.vert,
		norm	: x.norm,
		ind		: Capsule.indices( lathe_cnt, arc_div ),
	};
}

Capsule.vertices = function( lathe_cnt=6, arc_div=5, radius=1, height=0.3 ){
	// Create Arc without top point
	let arc = Util.arc_verts( Math.PI * 0.5, 0, arc_div, radius, 1 ); 

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Create Top Dome
	let vert_ary 		= Util.lathe( arc, lathe_cnt, "y" ),							// loop Copy the Points
		wall_vert_cnt 	= vert_ary.len;

	vert_ary
		.expand_by( wall_vert_cnt + 2 )	// Make room for buttom half.
		.push_raw( 0, radius, 0 );		// Add Center Point of Dome

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~	
	// Create Normals for Top and Bottom Dome
	let norm_ary	= new Vec3Buffer( vert_ary.capacity, true ),
		end			= wall_vert_cnt + 1,
		v 			= new Vec3(),
		i;

	for( i=0; i < end; i++ ){
		norm_ary.copy( i, vert_ary.copy_to( i, v ).norm() );
		v[1] = -v[1];	// Flip Y for the bottom dome normal.
		norm_ary.copy( end + i, v );
	}

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Access the Buffer directly to clone the top dome as a bottom dome.
	let idx = vert_ary.buf_len,	// How Many Floats in the Buffer currenly in use
		buf = vert_ary.buffer;	// Direct access to raw buffer.

	vert_ary.len = vert_ary.capacity;
	for( i=0; i < idx; i+=3 ){
		buf[ i + 1 ] 	 	+= height;			// Shift Vert Up for the Top Dome

		buf[ idx + i ]		=  buf[ i ];
		buf[ idx + i + 1 ]	= -buf[ i + 1 ];	// Shift Y to negative in the clone vert.
		buf[ idx + i + 2 ]	=  buf[ i + 2 ];
	}

	return { vert: vert_ary.buffer, norm: norm_ary.buffer } ;
}


Capsule.indices = function( lathe_cnt=6, arc_div=5 ){
	let vert_cnt 		= lathe_cnt * (arc_div - 1),	// How Many Verts in the First Wall
		col_cnt 		= arc_div - 1,					// How many Points that makes a row in the wall
		row_cnt 		= lathe_cnt,					// How Many Rows in the wall
		wall_idx_cnt	= grid_row_indices_cnt( col_cnt, row_cnt, true ),	// How many Indices needed for all
		tip_idx_cnt		= lathe_cnt * 3, // Connect the point, 3 Index for each triangle of the Triangle Fan
		stitch_idx_cnt 	= row_cnt * 6;

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Calc the points that make up the left edge of the grid.
	let edge_a = new Array( row_cnt ), // Top Grid Side of Top Dome
		edge_t = new Array( row_cnt ), // Bottom Grid side of Top Dome
		edge_b = new Array( row_cnt ), // Top Grid side of Bottom Dome
		i;

	for( i=0; i < row_cnt; i++ ){
		edge_a[ i ] = i * col_cnt;
		edge_t[ i ] = edge_a[ i ] + col_cnt - 1;
		edge_b[ i ] = edge_t[ i ] + vert_cnt + 1;
	}

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	let idx_ary	= new Uint16Array( (wall_idx_cnt + tip_idx_cnt) * 2 + stitch_idx_cnt ),
		idx		= 0;

	idx = grid_row_indices( idx_ary, idx, col_cnt, row_cnt, true );						// Create Top Wall
	idx = fan_indices( idx_ary, idx, vert_cnt, edge_a )								// Create Top Point
	idx = grid_row_indices( idx_ary, idx, col_cnt, row_cnt, true, vert_cnt+1, true );	// Create Bottom Wall

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Create Button Point
	for( i=0; i < row_cnt; i++ ) edge_a[ i ] += vert_cnt+1 ; // Shift the indices values to match the bottom wall edge
	
	idx = fan_indices( idx_ary, idx, vert_cnt*2+1, edge_a, true );

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Stitch The two Domes Together
	edge_stitch_indices( idx_ary, idx, edge_t, edge_b, true );

	return idx_ary;
}



function edge_stitch_indices( out, idx, edge_a, edge_b, rev_quad=false ){
	let i, ii, len = edge_a.length;
	let a, b, c, d;

	for( i=0; i < len; i++ ){
		ii = (i + 1) % len;

		a = edge_a[ i ];
		b = edge_a[ ii ];
		c = edge_b[ ii ];
		d = edge_b[ i ];

		if( !rev_quad ){
			out[ idx++ ] = a;			// Counter-ClockWise
			out[ idx++ ] = b;
			out[ idx++ ] = c;
			out[ idx++ ] = c;
			out[ idx++ ] = d;
			out[ idx++ ] = a;
		}else{
			out[ idx++ ] = a;			// ClockWise
			out[ idx++ ] = d;
			out[ idx++ ] = c;
			out[ idx++ ] = c;
			out[ idx++ ] = b;
			out[ idx++ ] = a;
		}
	}
	return idx;
}



function fan_indices( out, idx, c_idx, edge_ary, rev_quad=false ){
	let i, ii, len = edge_ary.length;
	for( i=0; i < len; i++ ){
		ii = (i + 1) % len;

		if( !rev_quad ){
			out[ idx++ ] = c_idx;
			out[ idx++ ] = edge_ary[ i ];
			out[ idx++ ] = edge_ary[ ii ];
		}else{
			out[ idx++ ] = c_idx;
			out[ idx++ ] = edge_ary[ ii ];
			out[ idx++ ] = edge_ary[ i ];
		}
	}
	return idx;
}



// Vert Counts of Columns and Rows, convert to quad counts.
// How many columns of Quads, * How Many Rows of Quads * 6 Points Per Quad.
function grid_row_indices_cnt( col_cnt, row_cnt, do_loop=false ){ 
	return ((do_loop)? row_cnt : row_cnt-1) * (col_cnt - 1) * 6;
}

// Grid Looping around by Row
function grid_row_indices( out, idx, col_cnt, row_cnt, do_loop=false, start_vert_idx=0, rev_quad=false ){
	let row_stop = ( do_loop )? row_cnt : row_cnt - 1,
		col_stop = col_cnt - 1,
		rr, cc, r0, r1, a, b, c, d;

	for( rr=0; rr < row_stop; rr++ ){
		r0 = start_vert_idx + col_cnt * rr;
		r1 = start_vert_idx + col_cnt * ((rr + 1) % row_cnt) ;

		//console.log( "Row", rr, r0, r1 );

		for( cc=0; cc < col_stop; cc++ ){
			a 	= r0 + cc;					// Defined the Vertex Index of a Quad
			b 	= r0 + cc + 1;
			d 	= r1 + cc;
			c 	= r1 + cc + 1;

			//console.log("Quad", cc, a, b, c, d );

			// Save the Quad as Two Triangles
			if( !rev_quad ){
				out[ idx++ ] = a;			// Counter-ClockWise
				out[ idx++ ] = b;
				out[ idx++ ] = c;
				out[ idx++ ] = c;
				out[ idx++ ] = d;
				out[ idx++ ] = a;
			}else{
				out[ idx++ ] = a;			// ClockWise
				out[ idx++ ] = d;
				out[ idx++ ] = c;
				out[ idx++ ] = c;
				out[ idx++ ] = b;
				out[ idx++ ] = a;
			}
		}
	}

	return idx;
}
 

export default Capsule;