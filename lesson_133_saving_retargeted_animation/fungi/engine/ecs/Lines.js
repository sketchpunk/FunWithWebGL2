import App, { gl, Entity, Components, Shader, Material } from "../App.js";
import Vao, { Buf }		from "../../core/Vao2.js";
import { Vec3 } 		from "../../maths/Maths.js";
import Colour 			from "../../data/Colour.js";
import DynBuffer 		from "../../data/DynBuffer.js";
import InterleavedArray	from "../../data/InterleavedArray.js";

//###################################################################################

class Lines{
	static $( e, capacity=6 ){
		if( !e ) e = App.$Draw();
		if( e instanceof Entity && !e.Points ) Entity.com_fromName( e, "Lines" );

		e.Lines.init( capacity );
		e.Draw.add( e.Lines.vao, g_material, 1 );

		g_material
			.add_uniform( "dash_seg", 1 / e.Lines.dash_seg )
			.add_uniform( "dash_div", e.Lines.dash_div );

		return e;
	}

	////////////////////////////////////////////////////////
	// 
	////////////////////////////////////////////////////////
		constructor(){
			this.vao			= null;
			this.is_modified	= true;
			this.data			= null;
			this.data_dbuf		= null;

			this.dash_seg		= 0.06;
			this.dash_div		= 0.5;
		}

		init( capacity=6 ){
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( !g_shader ) init_shader();

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			this.data = new InterleavedArray()
				.add_var( "pos", 3 )
				.add_var( "color", 3 )
				.add_var( "len", 1 )
				.expand_by( capacity )
				.set_expand( 5 );
			
			let data_buf	= Buf.empty_array( this.data.byte_capacity, false );	// Create Empty Buffers on the GPU with the capacity needed.

			this.data_dbuf	= new DynBuffer( data_buf, this.data.byte_capacity );	// Manage Updating / Resizing the Buffers on the GPU
			
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let stride_blen = this.data.stride_byte_len;
			this.vao = new Vao()
				.bind()
				.add_buf( "vertices", data_buf, 0, 3, "FLOAT", stride_blen, this.data.var_byte_offset("pos") )
				.add_partition( 1, 3, "FLOAT", stride_blen, this.data.var_byte_offset("color") )
				.add_partition( 2, 1, "FLOAT", stride_blen, this.data.var_byte_offset("len") )
				.unbind_all()
				.set( 0 );
			
			return this;
		}

		reset(){ this.data.reset(); return true; }

	////////////////////////////////////////////////////////
	// 
	////////////////////////////////////////////////////////
		set( idx, data, v_name="pos" ){
			if( v_name == "color" ) data = Colour( data );

			this.data.set( idx, v_name, data ); 
			this.is_modified = true; 
			return this;
		}

		add( a, b, col_a=null, col_b=null, is_dash=true ){
			this.is_modified = true;
			let alen = -1, blen = -1;

			if( is_dash ){
				alen = 0;
				blen = Vec3.len( a, b );
			}	

			col_a = Colour( col_a );
			col_b = ( col_b )? Colour( col_b ) : col_a;
			return [ 
				this.data.push( a, col_a, alen ),
				this.data.push( b, col_b, blen ),
			];
		}

	////////////////////////////////////////////////////////
	// 
	////////////////////////////////////////////////////////
		update(){
			if( !this.is_modified ) return this;

			// Update the GPU buffers with the new data.
			this.data_dbuf.update( this.data.buffer );

			this.vao.elmCount	= this.data.len;
			this.is_modified	= false;
			return this;
		}
} Components( Lines );


//###################################################################################

let g_shader = null, g_material = null;
function init_shader(){
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// SETUP SHADER
	g_shader = Shader.build( "LineDash", v_shader_src, f_shader_src );
	Shader.prepareUniformBlock( g_shader, "UBOGlobal" );
	Shader.prepareUniform( g_shader, "dash_seg", "float" );
	Shader.prepareUniform( g_shader, "dash_div", "float" );


	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// SETUP MATERIAl
	g_material = new Material( "LineDash", g_shader )
		.opt_blend( true )
		.add_uniform( "dash_seg", 1 / 0.1 )
		.add_uniform( "dash_div", 0.4 );
}

//-----------------------------------------------
let v_shader_src = `#version 300 es
	layout(location=0) in vec3 a_position;
	layout(location=1) in vec3 a_color;
	layout(location=2) in float a_len;

	uniform UBOGlobal{
		mat4	projViewMatrix;
		vec3	cameraPos;
		float	globalTime;
		vec2	screenSize;
		float	deltaTime;
	};

	out vec3 v_color;
	out float v_len;

	void main(void){
		v_len 			= a_len;
		v_color			= a_color;
		gl_Position 	= projViewMatrix * vec4( a_position.xyz, 1.0 );
	}`;

//-----------------------------------------------
let f_shader_src = `#version 300 es
	precision mediump float;

	in vec3 v_color;
	in float v_len;

	uniform float dash_seg;
	uniform float dash_div;

	out vec4 oFragColor;

	void main(void){
		float alpha = 1.0;
		if( v_len >= 0.0 ) alpha = step( dash_div, fract( v_len * dash_seg ) );

		oFragColor = vec4( v_color, alpha );
	}`;


//###################################################################################
export default Lines;