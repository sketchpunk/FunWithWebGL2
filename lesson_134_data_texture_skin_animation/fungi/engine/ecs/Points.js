import App, { gl, Entity, Components, Shader, Material } from "../App.js";
import Vao, { Buf }		from "../../core/Vao2.js";
import Colour 			from "../../data/Colour.js";
import DynBuffer 		from "../../data/DynBuffer.js";
import InterleavedArray	from "../../data/InterleavedArray.js";

//###################################################################################

class Points{
	static $( e, capacity=5, dsize=10 ){
		if( !e ) e = App.$Draw();
		if( e instanceof Entity && !e.Points ) Entity.com_fromName( e, "Points" );

		e.Points.init( capacity, dsize );
		e.Draw.add( e.Points.vao, g_material, 0 );
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
			this.default_size 	= 10;
		}

		init( capacity=5, dsize=10 ){
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( !g_shader ) init_shader();

			this.default_size = dsize;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			this.data = new InterleavedArray()
				.add_var( "pos", 3 )
				.add_var( "size", 1 )
				.add_var( "color", 3 )
				.add_var( "shape", 1 )
				.expand_by( capacity )
				.set_expand( 5 );
			
			// Create Empty Buffers on the GPU with the capacity needed.
			let data_buf	= Buf.empty_array( this.data.byte_capacity, false );	

			// Manage Updating / Resizing the Buffers on the GPU
			this.data_dbuf	= new DynBuffer( data_buf, this.data.byte_capacity );	
			
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let stride_blen = this.data.stride_byte_len;
			this.vao = new Vao()
				.bind()
				.add_buf( "vertices", data_buf, 0, 3, "FLOAT", stride_blen, this.data.var_byte_offset("pos") )
				.add_partition( 1, 1, "FLOAT", stride_blen, this.data.var_byte_offset("size") )
				.add_partition( 2, 3, "FLOAT", stride_blen, this.data.var_byte_offset("color") )
				.add_partition( 3, 1, "FLOAT", stride_blen, this.data.var_byte_offset("shape") )
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

		add(){ this.is_modified = true; return this.data.push.apply( this.data, arguments );; }
		add_square	( pos, color=null, size=null ){ return this.add( pos, size || this.default_size, Colour( color ), 0 ); }
		add_circle	( pos, color=null, size=null ){ return this.add( pos, size || this.default_size, Colour( color ), 1 ); }
		add_diamond	( pos, color=null, size=null ){ return this.add( pos, size || this.default_size, Colour( color ), 2 ); }
		add_tri 	( pos, color=null, size=null ){ return this.add( pos, size || this.default_size, Colour( color ), 3 ); }
		add_penta	( pos, color=null, size=null ){ return this.add( pos, size || this.default_size, Colour( color ), 4 ); }
		add_hex		( pos, color=null, size=null ){ return this.add( pos, size || this.default_size, Colour( color ), 5 ); }

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
} Components( Points );


//###################################################################################

let g_shader = null, g_material = null;
function init_shader(){
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// SETUP SHADER
	g_shader = Shader.build( "PointShapes", v_shader_src, f_shader_src );
	Shader.prepareUniformBlock( g_shader, "UBOGlobal" );

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// SETUP MATERIAl
	g_material = new Material( "PointShape", g_shader )
		.opt_blend( true );
}

//-----------------------------------------------
let v_shader_src = `#version 300 es
	layout(location=0) in vec3 a_position;
	layout(location=1) in float a_point_size;
	layout(location=2) in vec3 a_color;
	layout(location=3) in float a_shape;

	uniform UBOGlobal{
		mat4	projViewMatrix;
		vec3	cameraPos;
		float	globalTime;
		vec2	screenSize;
		float	deltaTime;
	};

	flat out vec3 v_color;
	flat out int v_shape;

	void main(void){
		v_shape 		= int( a_shape );
		v_color			= a_color;
		gl_PointSize 	= a_point_size;
		gl_Position 	= projViewMatrix * vec4( a_position.xyz, 1.0 );
	}`;

//-----------------------------------------------
let f_shader_src = `#version 300 es
	precision mediump float;
	#define PI	3.14159265359
	#define PI2	6.28318530718

	flat in vec3 v_color;
	flat in int v_shape;

	out vec4 oFragColor;

	float circle(){ 
		//return smoothstep( 0.5, 0.45, length( gl_PointCoord - vec2(0.5) ) );
		
		//float len = length( gl_PointCoord - vec2(0.5) );
		//float delta = fwidth( len );
		//return smoothstep( 0.5, 0.5-delta, len );

		vec2 coord		= gl_PointCoord * 2.0 - 1.0;
		float radius	= dot( coord, coord );
		float dxdy 		= fwidth( radius );
		return smoothstep( 0.90 + dxdy, 0.90 - dxdy, radius );
	}

	float diamond(){
		// http://www.numb3r23.net/2015/08/17/using-fwidth-for-distance-based-anti-aliasing/
		const float radius = 0.5;
		//vec2 coord = gl_PointCoord - vec2(0.5);
		//float dst = dot( abs(coord), vec2(1.0) );
		//return 1.0 - step( radius, dst );

		float dst = dot( abs(gl_PointCoord-vec2(0.5)), vec2(1.0) );
		float aaf = fwidth( dst );
		return 1.0 - smoothstep( radius - aaf, radius, dst );
	}

	float poly( int sides, float offset, float scale ){
		// https://thebookofshaders.com/07/
		vec2 coord = gl_PointCoord * 2.0 - 1.0;
		
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
		if( v_shape == 3 ) alpha = poly( 3, 0.2, 1.0 ); // Triangle
		if( v_shape == 4 ) alpha = poly( 5, 0.0, 0.65 ); // Pentagram
		if( v_shape == 5 ) alpha = poly( 6, 0.0, 0.65 ); // Hexagon

		oFragColor = vec4( v_color, alpha );
	}`;


//###################################################################################
export default Points;