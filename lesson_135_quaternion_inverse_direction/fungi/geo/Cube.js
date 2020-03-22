import App	from "../App.js";

let MESH = null;

function Cube( name = "Cube", mat ){
    if( !MESH ){ build_mesh(); console.log("create meshx"); }
	return App.$Draw( name, MESH, mat, App.Mesh.TRI );
}

Cube.geo = function( ww=1, hh=1, dd=1 ){
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	let width = ww, height = hh, depth = dd, x = 0, y = 0, z = 0;
	let w = width*0.5, h = height*0.5, d = depth*0.5;
	let x0 = x-w, x1 = x+w, y0 = y-h, y1 = y+h, z0 = z-d, z1 = z+d;

	// Starting bottom left corner, then working counter clockwise to create the front face.
	// Backface is the first face but in reverse (3,2,1,0)
	// keep each quad face built the same way to make index and uv easier to assign
	let vert = [
		x0, y1, z1,	// 0 Front
		x0, y0, z1,
		x1, y0, z1,
		x1, y1, z1, 

		x1, y1, z0,	// 4 Back
		x1, y0, z0, 
		x0, y0, z0, 
		x0, y1, z0, 

		x1, y1, z1, // 3 Right
		x1, y0, z1, 
		x1, y0, z0, 
		x1, y1, z0, 

		x0, y0, z1, // 1 Bottom
		x0, y0, z0, 
		x1, y0, z0, 
		x1, y0, z1, 

		x0, y1, z0, // 7 Left
		x0, y0, z0,
		x0, y0, z1,
		x0, y1, z1,

		x0, y1, z0, // 7 Top
		x0, y1, z1,
		x1, y1, z1,
		x1, y1, z0,
	];

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	//Build the index of each quad [0,1,2, 2,3,0]
	let i, idx = [];
	for( i=0; i < vert.length / 3; i+=2 ) idx.push(i, i+1, (Math.floor(i/4)*4)+((i+2)%4));

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	//Build UV data for each vertex
	let uv = [
		0,0, 0,1, 1,1, 1,0, // Front
		0,0, 0,1, 1,1, 1,0,	// Back
		0,0, 0,1, 1,1, 1,0,	// Right
		0,0, 0,1, 1,1, 1,0,	// Bottom
		0,0, 0,1, 1,1, 1,0, // Left
		0,0, 0,1, 1,1, 1,0, // Top
	];

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	//Build Normal data for each vertex
	let norm = [
		 0, 0, 1,	 0, 0, 1,	 0, 0, 1,	 0, 0, 1,		//Front
		 0, 0,-1,	 0, 0,-1,	 0, 0,-1,	 0, 0,-1,		//Back
		-1, 0, 0,	-1, 0, 0,	-1, 0, 0,	-1, 0, 0,		//Left
		 0,-1, 0,	 0,-1, 0,	 0,-1, 0,	 0,-1, 0,		//Bottom
		 1, 0, 0,	 1, 0, 0,	 1, 0, 0,	 1, 0, 0,		//Right
		 0, 1, 0,	 0, 1, 0,	 0, 1, 0,	 0, 1, 0		//Top
	];

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	return { vert, idx, uv, norm };
}

function build_mesh(){
	let d	= Cube.geo(),
		m 	= new App.Mesh( "Cube" ),
		vao = new App.Vao().bind();

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	m.buf.idx = App.Buf.new_element( d.idx, true, false );
	vao.add_indices( m.buf.idx );

	m.buf.vert = App.Buf.new_array( d.vert, 3, true, false );
	vao.add_buf( m.buf.vert, App.Shader.POS_LOC );

	m.buf.norm = App.Buf.new_array( d.norm, 3, true, false );
	vao.add_buf( m.buf.norm, App.Shader.NORM_LOC );

	m.buf.uv = App.Buf.new_array( d.uv, 2, true, false );
	vao.add_buf( m.buf.uv, App.Shader.UV_LOC );

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	App.Vao.unbind();
	App.Buf.unbind_array();
	App.Buf.unbind_element();
	
	MESH = m.set( vao, d.idx.length );
}

export default Cube;