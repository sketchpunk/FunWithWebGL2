import App from "../App.js";

const vert_src = `#version 300 es
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
		gl_PointSize = 10.0;
		//gl_Position = projMatrix * viewMatrix * vec4( a_pos, 1.0 );

		vec4 world_pos = model.view_matrix * vec4( a_pos, 1.0 );

		gl_Position = global.proj_view * world_pos;
		//gl_Position = global.proj_view * vec4( a_pos, 1.0 );
		//gl_Position = model.view_matrix * vec4( a_pos, 1.0 );
	}`;

const frag_src = `#version 300 es
	precision mediump float;
	uniform vec3 color;
	out vec4 out_color;
	void main(void){ out_color = vec4( color, 1.0 ); }`;

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
let sh = App.Shader.from_src( "BaseColor", vert_src, frag_src )
	.add_uniform_blocks( ["Global","Model"] )
	.add_uniform( "color", "rgb", "black" );

App.Cache.set_shader( sh.name, sh );

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
export default sh;