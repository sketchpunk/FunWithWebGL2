let vert_shader = `#version 300 es

##DEFINE##

layout(location=0) in vec4 a_position;

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

	gl_Position = projViewMatrix * modelMatrix * vec4(a_position.xyz, 1.0);
}`;

let frag_shader = `	#version 300 es

##DEFINE##

precision mediump float;

out vec4 out_color;

#ifdef BASE_COLOR
	uniform vec4 base_color;
#endif

void main(void){
	out_color = vec4( 0.0, 0.0, 0.0, 0.0 );

	#ifdef BASE_COLOR
		out_color += base_color;
	#endif

	#if defined(CIRCLE_POINT) && defined(POINT_SIZE)
		out_color.a = smoothstep( 0.5, 0.45, length( gl_PointCoord - vec2( 0.5 ) ) );
	#endif
}`


let shader_test = {
	color			: "#ff00FFff",
	point_size		: 8,
	circle_point	: true,
}

class DynamicShader{
	constructor( sh_name ){
		this.shader_name 	= sh_name;
		this.vert_define 	= "";
		this.frag_define 	= "";
		this.uniforms		= new Array();
		this.shader 		= null;
		this.mat_options	= {
			depthTest			: true,
			blend				: true,
			sampleAlphaCoverage : false,
			cullFace			: true,
		};

		this.opt_value 		= 0;
	}

	def_both( def ){ this.vert_define += "#define " +def+ " \n"; this.frag_define += "#define " +def+ " \n"; return this; }
	def_vert( def ){ this.vert_define += "#define " +def+ " \n"; return this; }
	def_frag( def ){ this.frag_define += "#define " +def+ " \n"; return this; }
	add_uniform( name, type, value ){ this.uniforms.push( { name, type, value } ); return this; }
	set_blend( v=true ){ this.mat_options.blend = v; return this; }

	add_opt( v ){ this.opt_value |= v; return this; }

	process_json( json ){
		let elm;
		for( elm in json ){
			switch( elm ){
				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				case "color":			this.add_opt(1).def_frag( "BASE_COLOR" ).add_uniform( "base_color", "rgba", json[elm] ); break;
				case "point_size":		this.add_opt(2).def_both( "POINT_SIZE" ).add_uniform( "point_size", "float", json[elm] ); break;
				case "circle_point":	this.add_opt(4).def_frag( "CIRCLE_POINT" ).set_blend(); break;
			}
		}
		//console.log("option", this.opt_value );
		return this;	
	}

	create_shader(){
		let sh_name = "dynamic_sh_" + this.opt_value;
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

	static mk( json ){
		return new DynamicShader()
			.process_json( json )
			.create_shader()
			.create_material();
	}
}