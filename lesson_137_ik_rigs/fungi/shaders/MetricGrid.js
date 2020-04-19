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

/*
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
 
    float cx = ceil(iResolution.x / 2.0);
    float cy = ceil(iResolution.y / 2.0);
    
    float x = fragCoord.x - cx;
    float y = fragCoord.y - cy;
        
    vec4 background = vec4(vec3(0.129, 0.168, 0.2), 1.0);
    
    // ======= Lines + Bold lines    
    background.xyz += step(1.0 - 1.0 / 10.0, fract(x / 10.0)) * 0.1;
    background.xyz += step(1.0 - 1.0 / 50.0, fract(x / 50.0)) * 0.2;

    background.xyz += step(1.0 - 1.0 / 10.0, fract(y / 10.0)) * 0.1;
    background.xyz += step(1.0 - 1.0 / 50.0, fract(y / 50.0)) * 0.2;
    
    // ======= AXES
    float xb = step(abs(x) - 0.5, 0.0);
    float yb = step(abs(y) - 0.5, 0.0);
    background.rgb = mix(background.rgb, vec3(0.964, 0.447, 0.443), (xb));
    background.rgb = mix(background.rgb, vec3(0.341, 0.8, 0.560), (yb));
    
    // ======= CENTER
    float cb = (1.0 - step(0.0, abs(x) - 2.5)) * (1.0 - step(0.0, abs(y) - 2.5));
    background.rgb = mix(background.rgb, vec3(1.0, 1.0, 1.0), cb);
    
    fragColor = background;    
}

Good Looking One.
void stroke(float dist, vec3 color, inout vec3 fragColor, float thickness, float aa)
{
    float alpha = smoothstep(0.5 * (thickness + aa), 0.5 * (thickness - aa), abs(dist));
    fragColor = mix(fragColor, color, alpha);
}

void fill(float dist, vec3 color, inout vec3 fragColor, float aa)
{
    float alpha = smoothstep(0.5*aa, -0.5*aa, dist);
    fragColor = mix(fragColor, color, alpha);
}

void renderGrid(vec2 pos, out vec3 fragColor)
{
    vec3 background = vec3(1.0);
    vec3 axes = vec3(0.4);
    vec3 lines = vec3(0.7);
    vec3 sublines = vec3(0.95);
    float subdiv = 8.0;

    float thickness = 0.003;
    float aa = length(fwidth(pos));

    fragColor = background;

    vec2 toSubGrid = pos - round(pos*subdiv)/subdiv;
    stroke(min(abs(toSubGrid.x), abs(toSubGrid.y)), sublines, fragColor, thickness, aa);

    vec2 toGrid = pos - round(pos);
    stroke(min(abs(toGrid.x), abs(toGrid.y)), lines, fragColor, thickness, aa);

    stroke(min(abs(pos.x), abs(pos.y)), axes, fragColor, thickness, aa);
}


HEX GRID
bool hex(vec2 p) {
        p.x *= 0.57735*2.0;
        p.y += mod(floor(p.x), 2.0)*0.5;
        p = abs((mod(p, 1.0) - 0.5));
        return abs(max(p.x*1.5 + p.y, p.y*2.0) - 1.0) > 0.05;
}


vec3 palette(float i) {
        return vec3(1.0, 1.0, 1.0);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) { 
		bool h = hex(fragCoord.xy/100.0);        
        
        fragColor.rgb = vec3(h,h,h);
        fragColor.a = 1.0;
}

CHECKBOX GRID
vec4 grid(vec2 fragCoord)
{
    vec2 index = ceil(fragCoord * 0.1);
   	
    return vec4(0.7 + 0.5*mod(index.x + index.y, 2.0));
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    fragColor = grid(fragCoord);
}


 */

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
	
	in vec3 frag_pos;
	out	vec4 out_color;

	void main(void){ 
		out_color = vec4( vec3(0.129, 0.168, 0.2), 1.0 );

		/*================
		// Compute anti-aliased world-space grid lines
		vec2 grid = abs(fract(frag_pos.xz - 0.5) - 0.5) / fwidth(frag_pos.xz);
		float line = min(grid.x, grid.y);

		// Just visualize the grid lines directly
		out_color = vec4( vec3(1.0 - min(line, 1.0) ), 1.0);
		*/

		/*=================== 
		// Pick a coordinate to visualize in a grid
		float len = length(frag_pos.xz);

		// Compute anti-aliased world-space grid lines
		float line = abs(fract(len - 0.5) - 0.5) / fwidth(len);

		// Just visualize the grid lines directly
		out_color = vec4( vec3(1.0 - min(line, 1.0)), 1.0 );
		*/

		/*=================== */
        vec2 coord = frag_pos.xz;
        vec4 u_plateColor = vec4(0.1, 0.1, 0.1, 0.0);
        vec4 u_gridColor1 = vec4(0.30, 0.30, 0.30, 1.0);
        vec4 u_gridColor0 = vec4(0.48, 0.48, 0.48, 1.0);

        // Compute anti-aliased world-space minor grid lines
        vec2 minorGrid = abs(fract(coord / 0.2 - 0.5) - 0.5) / fwidth(coord / 0.2);
        float minorLine = min(minorGrid.x, minorGrid.y);

        vec4 minorGridColor = mix(u_plateColor, u_gridColor1, 1.0 - min(minorLine, 1.0));

        // Compute anti-aliased world-space major grid lines
        vec2 majorGrid = abs(fract(coord / 1.0 - 0.5) - 0.5) / fwidth(coord / 1.0);
        float majorLine = min(majorGrid.x, majorGrid.y);

        out_color = mix(minorGridColor, u_gridColor0, 1.0 - min(majorLine, 1.0));
   


		//float x = frag_pos.x;
		//float y = frag_pos.z;
		// ======= Lines + Bold lines    
    	//out_color.rgb += step( 1.0 - 1.0 / 1.0, fract( x / 1.0) ) * 0.1;
    	//out_color.rgb += step( 1.0 - 1.0 / 5.0, fract( x / 5.0) ) * 0.2;

		//out_color.rgb += step( 1.0 - 1.0 / 1.0, fract( y / 1.0) ) * 0.1;
		//out_color.rgb += step( 1.0 - 1.0 / 5.0, fract( y / 5.0) ) * 0.2;

		// ======= AXES
		//float xb = step( abs(x) - 0.5, 0.0 );
		//float yb = step( abs(y) - 0.5, 0.0 );
		//out_color.rgb = mix( out_color.rgb, vec3(0.964, 0.447, 0.443), (xb) );
		//out_color.rgb = mix( out_color.rgb, vec3(0.341, 0.8, 0.560), (yb) );

		// ======= CENTER
		//float cb = (1.0 - step(0.0, abs(x) - 2.5)) * (1.0 - step(0.0, abs(y) - 2.5));
		//out_color.rgb = mix(out_color.rgb, vec3(1.0, 1.0, 1.0), cb);

	}`;

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
let sh = App.Shader.from_src( "MetricGrid", vert_src, frag_src )
    .add_uniform_blocks( ["Global","Model"] )
    .opt_blend( true );

	//.add_uniform( "color_a", "rgba", "#000000FF" )
	//.add_uniform( "color_b", "rgba", "#FFFFFFFF" )
	//.add_uniform( "radius", "float", 0.3 )
	//.add_uniform( "division", "float", 2 );

App.Cache.set_shader( sh.name, sh );

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
export default sh;