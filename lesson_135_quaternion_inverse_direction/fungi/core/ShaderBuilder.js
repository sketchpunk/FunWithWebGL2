import App		from "../App.js";
import Shader	from "./Shader.js";

//############################################################
const vert_src = `#version 300 es
	##DEFINE##

	layout(location=0) in vec3 a_pos;

	uniform Global{ 
		mat4 proj_view; 
		mat4 camera_matrix;
		vec3 camera_pos;
		float delta_time;
		vec2 screen_size;
		float clock;
	} global;

	uniform Model{ 
		mat4 view_matrix;
	} model;

	void main(void){
		gl_PointSize 	= 10.0;
		vec4 world_pos 	= model.view_matrix * vec4( a_pos, 1.0 );
		gl_Position 	= global.proj_view * world_pos;
	}`;

const frag_src = `#version 300 es
	##DEFINE##

	precision mediump float;
	
	#ifdef BASE_COLOR
		uniform vec4 base_color;
	#endif

	out vec4 out_color;
	void main(void){
		out_color = vec4( 0.0, 0.0, 0.0, 0.0 );

		#ifdef BASE_COLOR
			out_color += base_color;
		#endif
	}`;


//############################################################
const opt_type_cnt = 1;
const opt_config = {
	"base_color" : { type:0, bit:1, def_frag:["BASE_COLOR"], def_vert:[], uniforms:[ "base_color", "rgba" ] },
	"cull_face"	 : { opt_name:"cullFace" },
}


//############################################################
/*
class ShaderBuiler{
	static config( json ){
		let bits = this.compute_bits( json );
		if( bits == null ) return null;

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// SHADER
		let i, sh, sh_name	= "dyn_sh_" + bits.code;
		if( !App.Cache.has_shader( sh_name ) ){

			// Get Shader Source Ready
			let info 	= this.compute_defs( json ),
				v_src	= vert_src.replace( "##DEFINE##", info.def_vert ),
				f_src	= frag_src.replace( "##DEFINE##", info.def_frag );

			// Compile Shader
			sh = Shader.from_src( sh_name, v_src, f_src ),
			sh.add_uniform_blocks( ["Global","Model"] );

			// Setup Uniforms
			for( i of bits.uniforms ) 
				sh.add_uniform( i.name, i.type, i.value );

			// Cache Shader for reuse.
			App.Cache.set_shader( sh_name, sh );

		}else sh = App.Cache.get_shader( sh_name ); // Reuse Shader

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// MATERIAL
		let mat = sh.new_material();
		for( i of bits.uniforms )	mat.set_uniform( i.name, i.value );
		for( i of bits.options )	mat.options[ i.name ] = i.value;

		return mat;
	}

	static compute_bits( json ){
		let opt_codes	= new Uint32Array( opt_type_cnt ),
			uniforms	= [],
			options 	= [],
			i, k, opt;

		for( k in json ){
			if( !opt_config[ k ] ){ console.error("ShaderBuiler - Unknown Option : ", k ); return null; }
			opt = opt_config[ k ];

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( opt.opt_name ){
				options.push( { name:opt.opt_name, value:json[ k ] } );
				continue;
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			opt_codes[ opt.type ] += opt.bit;

			if( opt.uniforms && opt.uniforms.length != 0 ){
				for( i=0; i < opt.uniforms.length; i+=2 ){
					uniforms.push( { name:opt.uniforms[i], type:opt.uniforms[i+1], value:json[k] } );
				}
			}
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		return {
			code : opt_codes.join("_"),
			uniforms,
			options,
		};
	}

	static compute_defs( json ){
		let def_vert 	= "",
			def_frag 	= "",
			i, k, opt;

		for( k in json ){
			opt = opt_config[ k ];

			if( opt.def_frag && opt.def_frag.length != 0 ){
				for( i of opt.def_frag ) def_frag += "#define " + i + ";\n";
			}

			if( opt.def_vert && opt.def_vert.length != 0 ){
				for( i of opt.def_vert ) def_vert += "#define " + i + ";\n";
			}
		}

		return { def_vert, def_frag };
	}
}
*/

function ShaderBuiler( json ){
	let bits = compute_bits( json );
	if( bits == null ) return null;

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// SHADER
	let i, sh, sh_name	= "dyn_sh_" + bits.code;
	if( !App.Cache.has_shader( sh_name ) ){

		// Get Shader Source Ready
		let info 	= compute_defs( json ),
			v_src	= vert_src.replace( "##DEFINE##", info.def_vert ),
			f_src	= frag_src.replace( "##DEFINE##", info.def_frag );

		// Compile Shader
		sh = Shader.from_src( sh_name, v_src, f_src ),
		sh.add_uniform_blocks( ["Global","Model"] );

		// Setup Uniforms
		for( i of bits.uniforms ) 
			sh.add_uniform( i.name, i.type, i.value );

		// Cache Shader for reuse.
		App.Cache.set_shader( sh_name, sh );

	}else sh = App.Cache.get_shader( sh_name ); // Reuse Shader

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// MATERIAL
	let mat = sh.new_material();
	for( i of bits.uniforms )	mat.set_uniform( i.name, i.value );
	for( i of bits.options )	mat.options[ i.name ] = i.value;

	return mat;
}

function compute_bits( json ){
	let opt_codes	= new Uint32Array( opt_type_cnt ),
		uniforms	= [],
		options 	= [],
		i, k, opt;

	for( k in json ){
		if( !opt_config[ k ] ){ console.error("ShaderBuiler - Unknown Option : ", k ); return null; }
		opt = opt_config[ k ];

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		if( opt.opt_name ){
			options.push( { name:opt.opt_name, value:json[ k ] } );
			continue;
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		opt_codes[ opt.type ] += opt.bit;

		if( opt.uniforms && opt.uniforms.length != 0 ){
			for( i=0; i < opt.uniforms.length; i+=2 ){
				uniforms.push( { name:opt.uniforms[i], type:opt.uniforms[i+1], value:json[k] } );
			}
		}
	}

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	return {
		code : opt_codes.join("_"),
		uniforms,
		options,
	};
}

function compute_defs( json ){
	let def_vert 	= "",
		def_frag 	= "",
		i, k, opt;

	for( k in json ){
		opt = opt_config[ k ];

		if( opt.def_frag && opt.def_frag.length != 0 ){
			for( i of opt.def_frag ) def_frag += "#define " + i + ";\n";
		}

		if( opt.def_vert && opt.def_vert.length != 0 ){
			for( i of opt.def_vert ) def_vert += "#define " + i + ";\n";
		}
	}

	return { def_vert, def_frag };
}

//############################################################
export default ShaderBuiler;