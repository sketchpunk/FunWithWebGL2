import App	from "../App.js";

let MATERIAL	= null;
let MESH		= null;

function FacedCube( name = "FaceCube" ){
	if( !MATERIAL ){ build_shader(); console.log("Create material"); }
	if( !MESH ){ 	build_mesh(); console.log("create mesh"); }
	return App.$Draw( name, MESH, MATERIAL, App.Mesh.TRI );
}

FacedCube.geo = function( ww=1, hh=1, dd=1 ){
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	let width = ww, height = hh, depth = dd, x = 0, y = 0, z = 0;
	let w = width*0.5, h = height*0.5, d = depth*0.5;
	let x0 = x-w, x1 = x+w, y0 = y-h, y1 = y+h, z0 = z-d, z1 = z+d;

	//Starting bottom left corner, then working counter clockwise to create the front face.
	//Backface is the first face but in reverse (3,2,1,0)
	//keep each quad face built the same way to make index and uv easier to assign
	let vert = [
		x0, y1, z1, 0,	//0 Front
		x0, y0, z1, 0,	//1
		x1, y0, z1, 0,	//2
		x1, y1, z1, 0,	//3 

		x1, y1, z0, 1,	//4 Back
		x1, y0, z0, 1,	//5
		x0, y0, z0, 1,	//6
		x0, y1, z0, 1,	//7 

		x1, y1, z1, 2,	//3 Right
		x1, y0, z1, 2,	//2 
		x1, y0, z0, 2,	//5
		x1, y1, z0, 2,	//4

		x0, y0, z1, 3,	//1 Bottom
		x0, y0, z0, 3,	//6
		x1, y0, z0, 3,	//5
		x1, y0, z1, 3,	//2

		x0, y1, z0, 4,	//7 Left
		x0, y0, z0, 4,	//6
		x0, y0, z1, 4,	//1
		x0, y1, z1, 4,	//0

		x0, y1, z0, 5,	//7 Top
		x0, y1, z1, 5,	//0
		x1, y1, z1, 5,	//3
		x1, y1, z0, 5	//4
	];

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	//Build the index of each quad [0,1,2, 2,3,0]
	let i, idx = [];
	for( i=0; i < vert.length / 4; i+=2) idx.push(i, i+1, (Math.floor(i/4)*4)+((i+2)%4));

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	//Build UV data for each vertex
	let uv = [];
	for( i=0; i < 6; i++) uv.push( 0,0,	0,1,  1,1,  1,0 );

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
	let d	= FacedCube.geo(),
		m 	= new App.Mesh( "FacedCube" ),
		vao = new App.Vao().bind();

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	m.buf.idx = App.Buf.new_element( d.idx, true, false );
	vao.add_indices( m.buf.idx );

	m.buf.vert = App.Buf.new_array( d.vert, 4, true, false );
	vao.add_buf( m.buf.vert, App.Shader.POS_LOC );

	m.buf.norm = App.Buf.new_array( d.norm, 3, true, false );
	vao.add_buf( m.buf.norm, App.Shader.NORM_LOC );

	m.buf.uv = App.Buf.new_array( d.uv, 2, true, false );
	vao.add_buf( m.buf.uv, App.Shader.UV_LOC );

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	App.Vao.unbind();
	App.Buf.unbind_array();
	App.Buf.unbind_element();

	m.elm_cnt	= d.idx.length;
	m.vao		= vao;
	MESH 		= m;
}

function build_shader(){
	let vert = `#version 300 es
		layout(location=0) in vec4 a_pos;

		uniform Global{ 
			mat4 proj_view; 
			mat4 camera_matrix;
			vec3 camera_pos;
			float delta_time;
			vec2 screen_size;
			float clock;
		} global;
		uniform Model{ mat4 view_matrix; } model;
		uniform vec3 color_ary[ 6 ];
		out vec3 color;

		void main(void){
			color			= color_ary[ int( a_pos.w ) ];		
			vec4 world_pos 	= model.view_matrix * vec4( a_pos.xyz, 1.0 );
			gl_Position 	= global.proj_view * world_pos;
		}`;

	let frag = `#version 300 es
		precision mediump float;

		in vec3 color;
		out vec4 out_color;

		void main(void){ out_color = vec4( color, 1.0); }`;

	let sh = App.Shader.from_src( "vec_w_color", vert, frag )
		.add_uniform_blocks( ["Global","Model"] )
		.add_uniform( "color_ary", "rgb", ["#ff0000","#00dd00","#0000ff","#555555","#999999","#dddddd" ] );

	MATERIAL = sh.new_material();
}

export default FacedCube;