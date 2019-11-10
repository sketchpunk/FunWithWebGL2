let vert_shader = `#version 300 es

##DEFINE##

layout(location=0) in vec4 a_position;

#ifdef UV
	layout(location=2) in vec2 a_uv;
	out vec2 v_uv;
#endif

uniform UBOGlobal{
	mat4	projViewMatrix;
	vec3	cameraPos;
	float	globalTime;
	vec2	screenSize;
};

uniform UBOModel{
	mat4 	modelMatrix;
	mat3	normalMatrix;
};

#ifdef POINT_SIZE
	uniform float point_size;
#endif

void main(void){
	#ifdef POINT_SIZE
		gl_PointSize = point_size;
	#endif

	//-------------------------------------------------------------
	#ifdef UV
		v_uv = a_uv;
	#endif

	//-------------------------------------------------------------
	gl_Position = projViewMatrix * modelMatrix * vec4( a_position.xyz, 1.0 );
}`;

let frag_shader = `	#version 300 es

##DEFINE##

precision mediump float;

out vec4 out_color;

#ifdef BASE_COLOR
	uniform vec4 base_color;
#elseif BASE_TEX
	uniform sampler2D base_tex;
#endif

#ifdef UV
	in vec2 v_uv;
#endif

void main(void){
	out_color = vec4( 0.0, 0.0, 0.0, 0.0 );

	//-------------------------------------------------------------
	#ifdef BASE_COLOR
		out_color += base_color;
	#elseif BASE_TEX
		out_color += texture( base_tex, v_uv );
	#endif

	//-------------------------------------------------------------
	#if defined(CIRCLE_POINT) && defined(POINT_SIZE)
		out_color.a = smoothstep( 0.5, 0.45, length( gl_PointCoord - vec2( 0.5 ) ) );
	#endif
}`


const opt_config = {
	"point_size"	: { type:0, opt:1, def_frag:["POINT_SIZE"], def_vert:["POINT_SIZE"], uniforms:[ "point_size", "float" ] },
	"circle_point"	: { type:0, opt:2, def_frag:["CIRCLE_POINT"], def_vert:[], blend:true },

	"base_color"	: { type:1, opt:1, def_frag:["BASE_COLOR"], def_vert:[], uniforms:[ "base_color", "rgba" ] },
	"base_tex"		: { type:1, opt:2, def_frag:["BASE_TEX", "UV"], def_vert:["UV"], uniforms:[ "base_tex", "sample2D" ] },

	"norm_vert"		: { type:1, opt:4, def_frag:["NORM_VERT"], def_vert:["NORM_VERT"], },
	"norm_tex"		: { type:1, opt:8, def_frag:["NORM_TEX", "UV"], def_vert:["UV"] },
	"norm_poly"		: { type:1, opt:16, def_frag:["NORM_POLY"] },

	"phong"			: { type:1, opt:32, def_frag:[ "PHONG", "LIGHTING" ] },
}



let shader_test = {
	base_color		: "#ff00FFff",
	point_size		: 8,
	circle_point	: true,
};

let shader_test2 = {
	base_tex	: "tex01",
};

class DynamicShader{
	constructor( sh_name ){
		this.shader_name 	= sh_name;
		this.vert_define 	= "";
		this.frag_define 	= "";
		this.uniforms		= new Array();
		this.shader 		= null;

		this.mat_options	= {
			depthTest			: true,
			blend				: false,
			sampleAlphaCoverage : false,
			cullFace			: true,
		};

		this.opt_value		= 0;
		this.opt_rend_value	= 0;
	}

	////////////////////////////////////////////////////////////////////
	// Configure Helper Functions
	////////////////////////////////////////////////////////////////////
		/*
		def_both( def ){ this.vert_define += "#define " +def+ " \n"; this.frag_define += "#define " +def+ " \n"; return this; }
		def_vert( def ){ this.vert_define += "#define " +def+ " \n"; return this; }
		def_frag( def ){ this.frag_define += "#define " +def+ " \n"; return this; }

		uniform( name, type, value ){ this.uniforms.push( { name, type, value } ); return this; }
		set_blend( v=true ){ this.mat_options.blend = v; return this; }

		opt( v ){ this.opt_value |= v; return this; }
		opt_rend( v ){ this.opt_rend_value |= v; return this; }
		*/

	////////////////////////////////////////////////////////////////////
	//
	////////////////////////////////////////////////////////////////////
		// TODO, break process_json down into steps. First Get the Configuration Number.
		// if config, loop through to make shader code which only needs defines.
		// If config exists or just created. Loop Through to create uniform values for material

		gen_config_id( json ){
			let opt_base = 0,
				opt_rend = 0,
				elm, config,

			for( elm in json ){
				if( (config = opt_config[ elm ]) ){
					switch( config.type ){
						case 0 : opt_base	|= config.opt; break;
						case 1 : opt_rend	|= config.opt; break;
					}
				}
			}

			return opt_base + "_" + op_rend;
		}

		gen_defines( json ){
			let vert = "",
				frag = "",
				elm, config,

			for( elm in json ){
				if( (config = opt_config[ elm ]) ){
					if( config.def_vert && config.def_vert.length != 0 ){
						for( i of config.def_vert ) this.vert += "#define " +i+ " \n";
					}

					if( config.def_frag && config.def_frag.length != 0 ){
						for( i of config.def_frag ) this.frag += "#define " +i+ " \n";
					}
				}
			}

			return { vert, frag };
		}

		//TODO, Loop Through to fill in Material


		process_json( json ){
			let elm, config, i;
			for( elm in json ){
				if( !(config = opt_config[ elm ]) ) continue;

				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				// Save Option Bit ID
				switch( config.type ){
					case 0 : this.opt_value			|= config.opt; break;
					case 1 : this.opt_rend_value	|= config.opt; break;
				}

				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				// Save DEFINEs
				if( config.def_vert && config.def_vert.length != 0 ){
					for( i of config.def_vert ) this.vert_define += "#define " +i+ " \n";
				}

				if( config.def_frag && config.def_frag.length != 0 ){
					for( i of config.def_frag ) this.frag_define += "#define " +i+ " \n";
				}

				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				// Setup Uniform plus it data
				if( config.uniforms && config.uniforms.length != 0 ){
					for( i=0; i < config.uniforms.length; i+=2 ){
						 this.uniforms.push({
						 	config.uniforms[ i ],
						 	config.uniforms[ i+1 ],
						 	json[ elm ]
						 });
					}
				}

				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				// Material Options
				if( config.blend != undefined ) this.mat_options.blend = config.blend;

				/*
				switch( elm ){
					//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
					// Basic Options
					case "point_size":		this.opt(1).def_both( "POINT_SIZE" ).uniform( "point_size", "float", json[elm] ); break;
					case "circle_point":	this.opt(2).def_frag( "CIRCLE_POINT" ).set_blend(); break;
					
					//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
					// Render Options
					case "base_color":		this.opt_rend(1).def_frag( "BASE_COLOR" ).uniform( "base_color", "rgba", json[elm] ); break;
					case "base_tex":		this.opt_rend(2).def_frag( "BASE_TEX" ).def_both("UV").uniform( "base_tex", "sample2D", json[elm] ); break;
				}
				*/
			}
			//console.log("option", this.opt_value );
			return this;	
		}


	////////////////////////////////////////////////////////////////////
	//
	////////////////////////////////////////////////////////////////////
		create_shader(){
			let sh_name = "dynamic_sh_" + this.opt_value + "_" + this.opt_rend_value;
			//TODO, Check if exists in cache.

			let v_src	= vert_shader.replace( "##DEFINE##", this.vert_define ),
				f_src	= frag_shader.replace( "##DEFINE##", this.frag_define ),
				sh		= Shader.build( sh_name, v_src, f_src ),
				elm;

			Shader.bind( sh );
			Shader.prepareUniformBlock( sh, "UBOGlobal" );
			Shader.prepareUniformBlock( sh, "UBOModel" );

			for( elm of this.uniforms ) Shader.prepareUniform( sh, elm.name, elm.type );

			gl.ctx.useProgram( null ); // TODO BUG IN BIND CODE, Need to Fix Shader.bind();

			this.shader = sh;
			return this;
		}

		create_material(){
			let elm, mat = new Material( this.shader_name, this.shader );
			for( elm of this.uniforms )		mat.add_uniform( elm.name, elm.value );
			for( elm in this.mat_options )	mat.options[ elm ] = this.mat_options[ elm ];

			return mat;
		}


	////////////////////////////////////////////////////////////////////
	//
	////////////////////////////////////////////////////////////////////
		static mk( json ){
			return new DynamicShader()
				.process_json( json )
				.create_shader()
				.create_material();
		}
}