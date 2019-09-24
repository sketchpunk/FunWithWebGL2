

/*
UVSphere.vertData = function(){
	var yLen	= 18,
		xLen	= 25,
		radius	= 0.5;

	var aVert	= [],
		aNorm	= [],
		aUV		= [],
		aIndex	= [];

	//...........................................
	// Create Vertex and its Attributes (UV,Norms)
	var xp, yp, zp, mag,
		yRad	= Math.PI,				// Look Angles
		xRad	= Math.PI * 2,
		yInc	= Math.PI / yLen,		// Loop Increment
		xInc	= Math.PI * 2 / xLen,
		xUV		= 1 / xLen,				// UV Increment
		yUV		= 1 / yLen;

	for(var x=0; x <= xLen; x++){
		yRad = Math.PI;
		for(var y=0; y <= yLen; y++){
			//---------------------------
			//Calculate the vertex position based on the polar coord
			xp = radius * Math.sin(yRad) * Math.cos(xRad);
			yp = radius * Math.cos(yRad);					
			zp = radius * Math.sin(yRad) * Math.sin(xRad); // Y & Z are flipped.

			aVert.push( xp, yp, zp );

			//Calc the normal direction.
			mag = 1 / Math.sqrt( xp*xp + yp*yp + zp*zp );
			aNorm.push( xp*mag, yp*mag, zp*mag );
			//Fungi.debugLine.addRawLine(xp, yp, zp,0, xp*mag, yp*mag, zp*mag,0);

			//---------------------------
			//Calc the vertex's UV value
			aUV.push(
				//(x < xLen) ? x * xUV : 1,
				//(y < yLen) ? y * yUV : 1
				x * xUV,
				y * yUV
			);
			//---------------------------
			//Move onto the next Latitude position
			yRad -= yInc;
		}
		xRad -= xInc;	//Move onto the next Longitude
	}

	//...........................................
	// Triangulate all the vertices for Triangle Strip
	var iLen = (xLen)*(yLen+1);
	for(var i=0; i < iLen; i++){
		xp = Math.floor(i / (yLen+1));	//Current longitude
		yp = i % (yLen+1);				//Current latitude

		//Column index of row R and R+1
		aIndex.push(xp * (yLen+1) + yp, (xp+1) * (yLen+1) + yp);

		//Create Degenerate Triangle, Last AND first index of the R+1 (next row that becomes the top row )
		if(yp == yLen && i < iLen-1) aIndex.push( (xp+1) * (yLen+1) + yp, (xp+1) * (yLen+1));
	}

	return { vertices:aVert, normals:aNorm, uv:aUV, index:aIndex }
}
*/

import App from "../engine/App.js";
import Vao from "../core/Vao2.js";


//#####################################################################################
class UVSphere{
	static verts( y_len=18, x_len=25, radius = 0.5, close_loop=true ){
		let y_rad	= Math.PI,				// Look Angles
			x_rad	= Math.PI * 2,
			y_inc	= Math.PI / y_len,		// Loop Increment
			x_inc	= Math.PI * 2 / x_len,
			x_stop  = (close_loop)? x_len : x_len - 1,
			cnt		= ( y_len + 1 ) * ( x_stop + 1 ) * 3,
			out 	= new Float32Array( cnt ),
			i		= 0,
			x_cos, x_sin, y_sin;

		for(let x=0; x <= x_stop; x++){
			y_rad = Math.PI;
			x_cos = Math.cos( x_rad ) * radius;
			x_sin = Math.sin( x_rad ) * radius;

			for(var y=0; y <= y_len; y++){
				y_sin = Math.sin( y_rad );

				//Calculate the vertex position based on the polar coord
				out[i++] = y_sin * x_cos;
				out[i++] = radius * Math.cos( y_rad );					
				out[i++] = y_sin * x_sin; // Y & Z are flipped.

				y_rad -= y_inc;
			}
			x_rad -= x_inc;	//Move onto the next Longitude
		}
		return out;
	}

	static uv(){
		//TODO
	}

	static tri_strip_idx( y_len=18, x_len=25, close_loop=true ){
		//...........................................
		// Triangulate all the vertices for Triangle Strip
		let vert_cnt 	= (close_loop)? ( x_len ) * ( y_len + 1 ) : ( x_len-1 ) * ( y_len + 1 ),
			idx_cnt		= ((y_len+1) * 2) * x_len + (x_len-1) * 2,	// Y = col, X is Rows, TODO fix to take into account no closed_loop
			out 		= new Uint16Array( idx_cnt ), // out = [],
			ii			= 0,
			x, y; 

		for(var i=0; i < vert_cnt; i++){
			x = Math.floor( i / ( y_len + 1 ) );	// Current longitude
			y = i % ( y_len + 1 );					// Current latitude

			//Column index of row R and R+1
			//out.push( x * ( y_len + 1 ) + y,  ( x + 1 ) * ( y_len + 1 ) + y );
			out[ii++] = x * ( y_len + 1 ) + y;
			out[ii++] = ( x + 1 ) * ( y_len + 1 ) + y;

			//Create Degenerate Triangle, Last AND first index of the R+1 (next row that becomes the top row )
			if( y == y_len && i < vert_cnt-1 ){
				//out.push( (x+1) * (y_len+1) + y, (x+1) * (y_len+1) );
				out[ii++] = (x+1) * (y_len+1) + y;
				out[ii++] = (x+1) * (y_len+1);
			}
		}

		return out;
	}

	static entity( name, mat, mode=5, y_len=18, x_len=25, radius = 0.5 ){
		let verts 	= UVSphere.verts(  y_len, x_len, radius ),
			indices = UVSphere.tri_strip_idx(  y_len, x_len ),
			vao		= Vao.standard_by_data( name, verts, 3, indices );

		return App.$Draw( name, vao, mat, mode );
	}
}


//#####################################################################################
export default UVSphere;