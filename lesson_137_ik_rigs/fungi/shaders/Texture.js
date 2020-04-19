import App from "../App.js";

const vert_src = `#version 300 es
	layout(location=0) in vec3 a_pos;
	layout(location=2) in vec2 a_uv;

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

	uniform vec2 tex_scale;
	out vec2 v_uv;

	void main(void){
		vec4 world_pos	= model.view_matrix * vec4( a_pos, 1.0 );

		v_uv		= a_uv * tex_scale;
		gl_Position	= global.proj_view * world_pos;
	}`;

const frag_src = `#version 300 es
	precision mediump float;
	
	in vec2 v_uv;
	uniform sampler2D base_tex;

	out vec4 out_color;
	void main(void){ out_color = texture( base_tex, v_uv ); }`;

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
let sh = App.Shader.from_src( "Texture", vert_src, frag_src )
	.add_uniform_blocks( ["Global","Model"] )
	.add_uniform( "base_tex", "sampler2D", null )
	.add_uniform( "tex_scale", "vec2", new Float32Array([1,1]) );

App.Cache.set_shader( sh.name, sh );

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
export default sh;