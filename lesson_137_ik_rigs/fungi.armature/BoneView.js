import gl	from "../fungi/core/gl.js";
import App	from "../fungi/App.js";

let SHADER = null, MATERIAL = null;

//#################################################################
/** Create a preview mesh of armature bones */
class BoneView{
	static init( priority=810 ){
		if( !SHADER ){
			init_shader();
			App.Components.reg( BoneView );
			App.ecs.sys_add( BoneViewSys, priority );
		}
	}

	/////////////////////////////////////////////////
	//
	/////////////////////////////////////////////////
		constructor(){
			this.fbuf_rot	= null;
			this.fbuf_pos	= null;
			this.fbuf_scl 	= null;
			this.mesh		= null;
		}

		init(){
			let e 		= App.get_e( this.entity_id ),
				bones 	= e.Armature.bones,
				blen 	= bones.length;

			if( blen == 0 ){
				console.error( "Armature does not have any bones, Bones Needed for BoneView");
				return this;
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Setup Float Buffers
			this.fbuf_rot	= new Float32Array( blen * 4 );
			this.fbuf_pos	= new Float32Array( blen * 3 );
			this.fbuf_scl	= new Float32Array( blen * 3 );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Build a float buffer of all the lengths of the bones
			let ilen = new Float32Array( bones.length );
			for( let i=0; i < bones.length; i++ ) ilen[ i ] = bones[ i ].len;
			
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Build Preview Instance Mesh
			this.mesh = build_mesh( this, ilen );
			e.Draw.add( this.mesh, MATERIAL, App.Mesh.LINE );

			return this;
		}

	/////////////////////////////////////////////////
	//
	/////////////////////////////////////////////////
		update(){
			let i, ii, iii, nw, 
				bones 	= App.get_e( this.entity_id ).Armature.bones,
				pos 	= this.fbuf_pos,
				rot 	= this.fbuf_rot,
				scl 	= this.fbuf_scl;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Flatten Data
			for( i=0; i < bones.length; i++ ){
				nw	= bones[ i ].ref.Node.world;
				ii	= i * 4;
				iii	= i * 3;

				rot[ii+0]	= nw.rot[0];
				rot[ii+1]	= nw.rot[1];
				rot[ii+2]	= nw.rot[2];
				rot[ii+3]	= nw.rot[3];

				pos[iii+0]	= nw.pos[0];
				pos[iii+1]	= nw.pos[1];
				pos[iii+2]	= nw.pos[2];

				scl[iii+0]	= nw.scl[0];
				scl[iii+1]	= nw.scl[1];
				scl[iii+2]	= nw.scl[2];
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Save to GPU
			this.mesh.buf.i_rot.update( rot );
			this.mesh.buf.i_pos.update( pos );
			this.mesh.buf.i_scl.update( scl );

			return this;
		}
}


//###################################################################################
function BoneViewSys( ecs ){
	let e, ary = ecs.query_entities( [ "Armature", "BoneView" ] );
	if( ary == null ) return;
	for( e of ary ) if( e.Armature.updated ) e.BoneView.update();
}


//###################################################################################

function init_shader(){
	SHADER = App.Shader.from_src( "BoneView", v_src, f_src )
		.add_uniform_blocks( ["Global","Model"] );

	//SHADER.options.cullFace	= false;
	SHADER.options.depthTest	= false;
	SHADER.options.blend		= true;
	SHADER.options.sampleAlphaCoverage = true;


	MATERIAL = SHADER.new_material();
}

function geo_axis(){
	const	x	= 0.035,
			z	= 0.035;

	const vert	= [
		0, 0, 0, 0,				// 0 Bottom
		0, 1, 0, 1,				// 1 Top
		x, 0, 0, 0,
		0, 0, z, 0,
	];

	const color = [
		0.4, 0.4, 0.4,
		0.7, 0.7, 0.7,
		1, 0, 0,
		0, 0.7, 0,
	];

	const idx = [ 0, 1, 0, 2, 0, 3, 1, 2, 1, 3, 2, 3 ];

	return { vert, idx, color };
}

function build_mesh( bv, i_len ){
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	let geo 	= geo_axis(),
		m 		= new App.Mesh( "BoneView" ),
		vao		= new App.Vao().bind();
	
	m.vao			= vao;
	m.elm_cnt		= geo.idx.length;
	m.instance_cnt 	= i_len.length;
	m.is_instanced	= true;

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Instanced Data	
	m.buf.i_rot = App.Buf.new_array( bv.fbuf_rot, 4, false, false );
	vao.add_buf( m.buf.i_rot, 10, true );

	m.buf.i_pos = App.Buf.new_array( bv.fbuf_pos, 3, false, false );
	vao.add_buf( m.buf.i_pos, 11, true );

	m.buf.i_scl = App.Buf.new_array( bv.fbuf_scl, 3, false, false );
	vao.add_buf( m.buf.i_scl, 12, true );

	m.buf.i_len = App.Buf.new_array( i_len, 1, true, false );
	vao.add_buf( m.buf.i_len, 13, true );

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Mesh Data
	m.buf.idx = App.Buf.new_element( geo.idx, true, false );
	vao.add_indices( m.buf.idx );

	m.buf.vert = App.Buf.new_array( geo.vert, 4, true, false );
	vao.add_buf( m.buf.vert, App.Shader.POS_LOC );

	m.buf.color = App.Buf.new_array( geo.color, 3, true, false );
	vao.add_buf( m.buf.color, App.Shader.COL_LOC );

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
	layout(location=0) in vec4 a_pos;
	layout(location=3) in vec3 a_color;

	layout(location=10) in vec4 i_rot;
	layout(location=11) in vec3 i_pos;
	layout(location=12) in vec3 i_scl;
	layout(location=13) in float i_len;

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

	vec3 quat_mul_vec( vec4 q, vec3 v ){ return v + cross(2.0 * q.xyz, cross(q.xyz, v) + q.w * v); }

	void main(void){
		vec4 w_pos	= vec4( a_pos.xyz, 1.0 ); 

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// setup bone instance position
		if( a_pos.w == 1.0 ) w_pos.y = i_len;
		//w_pos.xyz = quat_mul_vec( i_rot, w_pos.xyz * i_scl ) + i_pos;
		w_pos.xyz = quat_mul_vec( i_rot, w_pos.xyz ) * i_scl + i_pos;
 
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		v_color		= a_color;
		//w_pos		= model.view_matrix * w_pos;
		gl_Position	= global.proj_view * w_pos;
	}`;


//-----------------------------------------------
let f_src = `#version 300 es
	precision mediump float;
	in vec3 v_color;
	out vec4 out_color;
	void main(void){ out_color = vec4( v_color, 1.0 ); }`;


//#################################################################
export default BoneView;