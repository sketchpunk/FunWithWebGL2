import App		from "../App.js";
import Colour	from "../core/Colour.js";
import Quad		from "./Quad.js";
import InterleavedFloatArray from "../data/InterleavedFloatArray.js";

const	INITAL_CNT	= 10;
let		SHADER		= null, 
		MATERIAL	= null;

//###################################################################################
class Points{
	static $( name, e=null ){
		if( !SHADER ){
			init_shader();
			App.ecs.sys_add( PointsSys, 801 );
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		if( !e )		e = App.$Draw( name );
		if( !e.Draw )	e.add_com( "Draw" );

		let c = e.add_com( "Points" ),
			m = make_mesh( c.buf );

		e.Draw.add( m, MATERIAL );
		c.mesh = m;
		return e;
	}

	constructor(){
		this.mesh 		= null;
		this.use_size 	= 0.1;
		this.use_shape 	= 0;
		this.updated	= true;

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		this.byte_buf	= new InterleavedFloatArray()
			.add_var( "pos",	3 )
			.add_var( "color",	3 )
			.add_var( "size",	1 )
			.add_var( "shape",	1 )
			.expand_by( INITAL_CNT );

		this.byte_buf.auto_expand = 10;

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		let i_info = this.byte_buf.get_stride_info();
		this.buf = App.Buf
			.new_array( this.byte_buf.buffer, i_info.comp_len, false, false )
			.set_interleaved( i_info );
	}

	add( a, col="red", size=null, shape=null ){
		this.updated = true;
		if( shape == null ) shape = this.use_shape;
		return this.byte_buf.push( a, Colour( col ), size || this.use_size, shape );
	}

	update(){
		if( !this.updated ) return this;

		this.mesh.instance_cnt	= this.byte_buf.len;
		this.updated			= false;

		// Update the GPU buffers with the new data.
		if( this.mesh.instance_cnt > 0 ) this.buf.update( this.byte_buf.buffer );

		return this;
	}

	reset(){
		this.byte_buf.reset();
		this.updated = true;
	}
} App.Components.reg( Points );


function PointsSys( ecs ){
	let c, ary = ecs.query_comp( "Points" );
	if( !ary ) return;
	for( c of ary ) if( c.updated ) c.update();
}


//###################################################################################

function init_shader(){
	SHADER = App.Shader.from_src( "LineDash", v_src, f_src )
		.add_uniform_blocks( ["Global","Model"] );

	SHADER.options.cullFace	= false;
	SHADER.options.blend	= true;
	SHADER.options.sampleAlphaCoverage = true;

	MATERIAL = SHADER.new_material();
}

function make_mesh( i_buf ){
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	let quad 	= Quad.geo(),
		m 		= new App.Mesh( "Points" ),
		vao		= new App.Vao().bind();
	
	m.vao			= vao;
	m.elm_cnt		= quad.idx.length;
	m.is_instanced	= true;

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Instanced Data
	vao.add_interleaved( i_buf, [6,7,8,9], true );

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Quad Data
	m.buf.idx = App.Buf.new_element( quad.idx, true, false );
	vao.add_indices( m.buf.idx );

	m.buf.vert = App.Buf.new_array( quad.vert, 3, true, false );
	vao.add_buf( m.buf.vert, App.Shader.POS_LOC );

	m.buf.norm = App.Buf.new_array( quad.norm, 3, true, false );
	vao.add_buf( m.buf.norm, App.Shader.NORM_LOC );

	m.buf.uv = App.Buf.new_array( quad.uv, 2, true, false );
	vao.add_buf( m.buf.uv, App.Shader.UV_LOC );

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Clean up
	App.Vao.unbind();
	App.Buf.unbind_array().unbind_element();

	return m;
}

//-----------------------------------------------
// https://github.com/glslify/glsl-circular-arc
//
// http://www.opengl-tutorial.org/intermediate-tutorials/billboards-particles/billboards/
let v_src = `#version 300 es
	layout(location=0) in vec3 a_pos;
	layout(location=1) in vec3 a_norm;
	layout(location=2) in vec2 a_uv;

	layout(location=6) in vec3 i_pos;
	layout(location=7) in vec3 i_color;
	layout(location=8) in float i_size;
	layout(location=9) in float i_shape;

	uniform Global{ 
		mat4 proj_view; 
		mat4 camera_matrix;
		vec3 camera_pos;
		float delta_time;
		vec2 screen_size;
		float clock;
	} global;
	uniform Model{ mat4 view_matrix; } model;

	out vec2 v_uv;
	flat out vec3 v_color;
	flat out int v_shape;

	void main(void){
		vec4 w_pos	= vec4( a_pos, 1.0 ); 

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Spherical billboarding
		vec3 right 	= vec3( global.camera_matrix[0][0], global.camera_matrix[1][0], global.camera_matrix[2][0] ),
			 up		= vec3( global.camera_matrix[0][1], global.camera_matrix[1][1], global.camera_matrix[2][1] ); 
		// up = vec3(0.0, 1.0, 0.0); // Cylindrical

		w_pos.xyz *= i_size;										// Scale Quad Down
		w_pos.xyz  = i_pos + ( right * w_pos.x ) + ( up * w_pos.y ); // Rotate vertex toward camera
 
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		w_pos		= model.view_matrix * w_pos;
		v_color		= i_color;
		v_shape		= int( i_shape );
		v_uv		= a_uv;
		gl_Position	= global.proj_view * w_pos;
	}`;


//-----------------------------------------------
let f_src = `#version 300 es
	precision mediump float;

	#define PI	3.14159265359
	#define PI2	6.28318530718

	in vec2 v_uv;
	flat in vec3 v_color;
	flat in int v_shape;
	out vec4 out_color;

	float circle(){ 
		//return smoothstep( 0.5, 0.45, length( v_uv - vec2(0.5) ) );
		
		//float len = length( v_uv - vec2(0.5) );
		//float delta = fwidth( len );
		//return smoothstep( 0.5, 0.5-delta, len );

		vec2 coord		= v_uv * 2.0 - 1.0;
		float radius	= dot( coord, coord );
		float dxdy 		= fwidth( radius );
		return smoothstep( 0.90 + dxdy, 0.90 - dxdy, radius );
	}

	float ring(){ 
		vec2 coord		= v_uv * 2.0 - 1.0;
		float radius	= dot( coord, coord );
		float dxdy 		= fwidth( radius );
		return	smoothstep( 0.2 - dxdy, 0.2 + dxdy, radius ) - 
				smoothstep( 1.0 - dxdy, 1.0 + dxdy, radius );
	}

	float diamond(){
		// http://www.numb3r23.net/2015/08/17/using-fwidth-for-distance-based-anti-aliasing/
		const float radius = 0.5;
		//vec2 coord = v_uv - vec2(0.5);
		//float dst = dot( abs(coord), vec2(1.0) );
		//return 1.0 - step( radius, dst );

		float dst = dot( abs(v_uv-vec2(0.5)), vec2(1.0) );
		float aaf = fwidth( dst );
		return 1.0 - smoothstep( radius - aaf, radius, dst );
	}

	float poly( int sides, float offset, float scale ){
		// https://thebookofshaders.com/07/
		vec2 coord = v_uv * 2.0 - 1.0;
		
		coord.y += offset;
		coord *= scale;

		float a = atan( coord.x, coord.y ) + PI; // Angle of Pixel
		float r = PI2 / float( sides ); // Radius of Pixel
		float d = cos( floor( 0.5 + a / r ) * r-a ) * length( coord );
		float f = fwidth( d );
		return smoothstep( 0.5, 0.5 - f, d );
	}

	void main(void){
		float alpha = 1.0;

		if( v_shape == 1 ) alpha = circle();
		if( v_shape == 2 ) alpha = diamond();
		if( v_shape == 3 ) alpha = poly( 3, 0.2, 1.0 );		// Triangle
		if( v_shape == 4 ) alpha = poly( 5, 0.0, 0.65 ); 	// Pentagram
		if( v_shape == 5 ) alpha = poly( 6, 0.0, 0.65 );	// Hexagon
		if( v_shape == 6 ) alpha = ring();

		out_color = vec4( v_color, alpha );
	}`;


/*
	How to scale at the same rate

	camera_adjust( e ){
		let vEye	= Vec3.sub( App.camera.Node.local.pos, e.Node.local.pos ),
			eyeLen 	= vEye.len(),
			scl 	= e.Node.local.scl;

		vEye.norm();
		scl.set( 1, 1, 1 ).scale( eyeLen / GizmoSystem.CameraScale );

		if( Vec3.dot( vEye, Vec3.LEFT )		< GizmoSystem.MinAdjust )	scl.x *= -1;
		if( Vec3.dot( vEye, Vec3.FORWARD )	< GizmoSystem.MinAdjust )	scl.z *= -1;
		if( Vec3.dot( vEye, Vec3.UP )		< GizmoSystem.MinAdjust )	scl.y *= -1;
		
		e.Node.isModified = true;
	}
*/

//###################################################################################
export default Points;