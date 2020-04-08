import App from "../App.js";

// http://madebyevan.com/shaders/grid/
// https://www.shadertoy.com/view/XtXfDS
// https://www.shadertoy.com/view/4tfSz2
// https://www.shadertoy.com/view/4t3BW4 GORGOUS
// https://www.shadertoy.com/view/Md2GDz
// https://www.shadertoy.com/view/MdSXRm
// https://www.shadertoy.com/view/ld23Dm
// https://www.shadertoy.com/view/MtG3zm Animated Grid Noise, Really Nice
// https://www.shadertoy.com/view/4sdSzH
// https://www.shadertoy.com/view/Ms3GzS
// https://www.shadertoy.com/view/wdSXzm PERFECT GRID LAYOUT
// https://www.shadertoy.com/view/Mltyz8 cool circle grid;
// https://www.shadertoy.com/view/WsBGW3 really nice grid
// https://www.shadertoy.com/view/MtcBW7
// https://www.shadertoy.com/view/4lfXDM Triplanar Hatching
// https://www.shadertoy.com/view/WlSGzR
// https://www.shadertoy.com/view/lsj3z3 Improved Triplanar
// https://www.shadertoy.com/view/Xd3XDS Triplanar
// https://github.com/bobbykaz/spatial-mapping-shaders/tree/master/Source/Unity/spatial-mapping-shader-tests/Assets/Materials

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

	out vec3 frag_pos;

	void main(void){
		vec4 world_pos = model.view_matrix * vec4( a_pos, 1.0 );

		frag_pos	= world_pos.rgb;
		gl_Position	= global.proj_view * world_pos;
	}`;

const frag_src = `#version 300 es
	precision mediump float;
	
	const float PI = 3.141592653589793;

	uniform vec4	color_a;
	uniform vec4	color_b;
	uniform float	radius;
	uniform float	division; //const float scale = 4.0;

	in	vec3 frag_pos;
	out	vec4 out_color;

	void main(void){ 
		vec2 coord = vec2( length( frag_pos.xz ) / radius, atan(frag_pos.x, frag_pos.z) * division / PI );

		// http://madebyevan.com/shaders/grid/
		// Handling the wrap-around is tricky in this case. The function atan()
		// is not continuous and jumps when it wraps from -pi to pi. The screen-
		// space partial derivative will be huge along that boundary. To avoid
		// this, compute another coordinate that places the jump at a different
		// place, then use the coordinate where the jump is farther away.
		//
		// When doing this, make sure to always evaluate both fwidth() calls even
		// though we only use one. All fragment shader threads in the thread group
		// actually share a single instruction pointer, so threads that diverge
		// down different conditional branches actually cause both branches to be
		// serialized one after the other. Calling fwidth() from a thread next to
		// an inactive thread ends up reading inactive registers with old values
		// in them and you get an undefined value.
		// 
		// The conditional uses +/-scale/2 since coord.y has a range of +/-scale.
		// The jump is at +/-scale for coord and at 0 for wrapped.
		vec2 wrapped		= vec2( coord.x, fract(coord.y / (2.0 * division)) * (2.0 * division) );
		vec2 coordWidth		= fwidth( coord );
		vec2 wrappedWidth	= fwidth( wrapped );
		vec2 width 			= coord.y < -division * 0.5 || coord.y > division * 0.5 ? wrappedWidth : coordWidth;

		// Compute anti-aliased world-space grid lines
		vec2 grid 			= abs(fract(coord - 0.5) - 0.5) / width;
		float line 			= min( grid.x, grid.y );
		float alpha			= 1.0 - min( line, 1.0 );

		// Just visualize the grid lines directly
		//vec3 color = color_a.rgb;
		//if( abs( v_wpos.x ) < width.x ) color = vec3( 1.0, 0.0, 0.0 );

		out_color = mix( color_a, color_b, alpha );
	}`;

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
let sh = App.Shader.from_src( "CircleGrid", vert_src, frag_src )
	.add_uniform_blocks( ["Global","Model"] )
	.add_uniform( "color_a", "rgba", "#000000FF" )
	.add_uniform( "color_b", "rgba", "#FFFFFFFF" )
	.add_uniform( "radius", "float", 0.3 )
	.add_uniform( "division", "float", 2 );

App.Cache.set_shader( sh.name, sh );

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
export default sh;