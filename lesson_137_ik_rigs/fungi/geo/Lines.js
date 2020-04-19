import App		from "../App.js";
import Colour	from "../core/Colour.js";
import InterleavedFloatArray from "../data/InterleavedFloatArray.js";

const	INITAL_CNT	= 2;
const	DASH_SEG	= 1 / 0.07;
const	DASH_DIV 	= 0.4;
let 	SHADER		= null, 
		MATERIAL	= null;

//###################################################################################

class Lines{
	static $( name, e=null ){
		if( !SHADER ){
			init_shader();
			App.ecs.sys_add( LinesSys, 801 );
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		if( !e )		e = App.$Draw( name );
		if( !e.Draw )	e.add_com( "Draw" );

		let c = e.add_com( "Lines" ),
			m = make_mesh( c.buf );

		e.Draw.add( m, MATERIAL, App.Mesh.LINE );
		c.mesh = m;
		return e;
	}

	constructor(){
		this.updated	= true;

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		this.byte_buf	= new InterleavedFloatArray()
			.add_var( "pos",	3 )
			.add_var( "color",	3 )
			.add_var( "len",	1 )
			.expand_by( INITAL_CNT );

		this.byte_buf.auto_expand = 10;

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		let i_info = this.byte_buf.get_stride_info();
		this.buf = App.Buf
			.new_array( this.byte_buf.buffer, i_info.comp_len, false, false )
			.set_interleaved( i_info );
	}

	add( a, b, col_a=null, col_b=null, is_dash=false ){
		let alen = -1, blen	= -1;
		this.updated = true;

		// Set Color
		col_a	= Colour( col_a ),
		col_b	= ( col_b )? Colour( col_b ) : col_a;

		// Calc Line Length if its dashed
		if( is_dash ){
			alen = 0;
			blen = App.Vec3.len( a, b );
		}	

		// Return Point Index for Line
		return [ 
			this.byte_buf.push( a, col_a, alen ),
			this.byte_buf.push( b, col_b, blen ),
		];
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
		this.updated = true;
	}
} App.Components.reg( Lines );


function LinesSys( ecs ){
	let c, ary = ecs.query_comp( "Lines" );
	if( !ary ) return;
	for( c of ary ) if( c.updated ) c.update();
}


//###################################################################################
function init_shader(){
	SHADER = App.Shader.from_src( "LineDash", v_src, f_src )
		.add_uniform_blocks( ["Global","Model"] )
		.add_uniform( "dash_seg", "float", DASH_SEG )
		.add_uniform( "dash_div", "float", DASH_DIV );
	
	SHADER.options.blend = true;

	MATERIAL = SHADER.new_material();
}


function make_mesh( i_buf ){
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	let m 		= new App.Mesh( "Lines" ),
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
	layout(location=0) in vec3 a_pos;
	layout(location=1) in vec3 a_color;
	layout(location=2) in float a_len;

	uniform Global{ 
		mat4 proj_view; 
		mat4 camera_matrix;
		vec3 camera_pos;
		float delta_time;
		vec2 screen_size;
		float clock;
	} global;
	uniform Model{ mat4 view_matrix; } model;

	out vec3 v_color;
	out float v_len;

	void main(void){
		v_len 			= a_len;
		v_color			= a_color;
		vec4 world_pos 	= model.view_matrix * vec4( a_pos.xyz, 1.0 );
		gl_Position 	= global.proj_view * world_pos;
	}`;

//-----------------------------------------------
let f_src = `#version 300 es
	precision mediump float;

	in vec3 v_color;
	in float v_len;

	uniform float dash_seg;
	uniform float dash_div;

	out vec4 out_color;

	void main(void){
		float alpha = 1.0;
		if( v_len >= 0.0 ) alpha = step( dash_div, fract( v_len * dash_seg ) );
		out_color = vec4( v_color, alpha );
	}`;


//###################################################################################
export default Lines;