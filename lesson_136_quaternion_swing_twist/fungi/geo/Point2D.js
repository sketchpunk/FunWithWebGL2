import App		from "../App.js";
import Colour	from "../core/Colour.js";
import InterleavedFloatArray from "../data/InterleavedFloatArray.js";

const	INITAL_CNT	= 10;
const	AUTO_EXTEND = 10;
let 	SHADER		= null, 
		MATERIAL	= null;

//###################################################################################

class Point2D{
	static $( name, e=null ){
		if( !SHADER ){
			init_shader();
			App.ecs.sys_add( Point2DSys, 801 );
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		if( !e )		e = App.$Draw( name );
		if( !e.Draw )	e.add_com( "Draw" );

		let c = e.add_com( "Point2D" ),
			m = make_mesh( c.buf );

		e.Draw.add( m, MATERIAL, App.Mesh.PNT );
		c.mesh = m;
		return e;
	}

	constructor(){
		this.updated	= true;
		this.mesh 		= null;

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		this.byte_buf	= new InterleavedFloatArray()
			.add_var( "pos",	2 )
			.add_var( "color",	3 )
			.add_var( "size",	1 )
			.expand_by( INITAL_CNT );

		this.byte_buf.auto_expand = AUTO_EXTEND;

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		let i_info = this.byte_buf.get_stride_info();
		this.buf = App.Buf
			.new_array( this.byte_buf.buffer, i_info.comp_len, false, false )
			.set_interleaved( i_info );
	}

	add( pos, col="red", size=10 ){
		this.updated = true;
		return this.byte_buf.push( pos, Colour( col ), size ); // Return Point Index for Line
	}

	update(){
		if( !this.updated ) return this;
		this.mesh.elm_cnt	= this.byte_buf.len;
		this.updated		= false;

		// Update the GPU buffers with the new data.
		if( this.mesh.elm_cnt > 0 ) this.buf.update( this.byte_buf.buffer );
		
		return this;
	}

	reset(){
		this.byte_buf.reset();
		this.updated = false;
	}
} App.Components.reg( Point2D );


function Point2DSys( ecs ){
	let c, ary = ecs.query_comp( "Point2D" );
	if( !ary ) return;
	for( c of ary ) if( c.updated ) c.update();
}


//###################################################################################
function init_shader(){
	SHADER = App.Shader.from_src( "Point2D", v_src, f_src )
		.add_uniform_blocks( ["Global"] );
	MATERIAL = SHADER.new_material();
}


function make_mesh( i_buf ){
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	let m 		= new App.Mesh( "Point2D" ),
		vao		= new App.Vao().bind();
	
	m.vao			= vao;
	m.elm_cnt		= 0;

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Vertex Data
	vao.add_interleaved( i_buf, [0,1,2], false );

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Clean up
	App.Vao.unbind();
	App.Buf.unbind_array();

	return m;
}


//-----------------------------------------------
let v_src = `#version 300 es
	layout(location=0) in vec2 a_pos;
	layout(location=1) in vec3 a_color;
	layout(location=2) in float a_size;

	uniform Global{ 
		mat4 proj_view; 
		mat4 camera_matrix;
		vec3 camera_pos;
		float delta_time;
		vec2 screen_size;
		float clock;
	} global;

	out vec3 v_color;

	void main(void){
		v_color			= a_color;
		gl_PointSize 	= a_size;

		// Normalize Position based on Screen Size. Then remap to normalized screen space ( -1, 1 );
		// For Y, Flip the normalized position before remaping. Y = 0 at the top of the screen, not bottom.
		gl_Position		= vec4(
			a_pos.x / global.screen_size.x * 2.0 - 1.0,
			( 1.0 - a_pos.y / global.screen_size.y ) * 2.0 - 1.0,
			0.0,
			1.0
		);
	}`;

//-----------------------------------------------
let f_src = `#version 300 es
	precision mediump float;
	in	vec3 v_color;
	out	vec4 out_color;
	void main(void){
		out_color = vec4( v_color, 1.0 );
	}`;


//###################################################################################
export default Point2D;