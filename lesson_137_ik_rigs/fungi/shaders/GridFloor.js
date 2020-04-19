import App from "../App.js";

// http://madebyevan.com/shaders/grid/

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
		vec4 world_pos	= model.view_matrix * vec4( a_pos, 1.0 );
		frag_pos		= world_pos.rgb;
		gl_Position		= global.proj_view * world_pos;
	}`;

const frag_src = `#version 300 es
	precision mediump float;
	
	in vec3 frag_pos;
	out	vec4 out_color;

	float pixel_thin( vec2 step_pos ){ //step_pos = frag_pos.xz / step;
		vec2 grid = abs( fract( step_pos - 0.5 ) - 0.5 ) / fwidth( step_pos );
        return 1.0 - min( grid.x, grid.y );
	}
	float grad_thick2( vec2 step_pos, float grad_width ){
		vec2 pos 	= step_pos - 0.5;	// Move to the Center of Gradient
		vec2 fpos	= fract( pos );		// Normalize, get 0 -> 1
		vec2 px		= fwidth( pos );	// Pixel Width of POS
		vec2 grid	= 
			smoothstep( 0.5 - grad_width - px,	vec2(0.5) - grad_width,	fpos ) - 
			smoothstep( vec2(0.5) + grad_width,	0.5 + grad_width + px,	fpos );
		return max( grid.x, grid.y );
	}
	float ring( vec2 pos, float min_radius, float max_radius ){
		float len 	= length( pos );
		float px	= fwidth( len );
		return smoothstep( min_radius - px, min_radius + px, len )
			- smoothstep( max_radius - px, max_radius + px, len );
	}

	void main(void){
		vec4 base_color		= vec4( vec3(0.24), 0.0);
        vec4 grid_min_color	= vec4( vec3(0.24), 1.0);
		vec4 grid_max_color	= vec4( vec3(0.29), 1.0);
		vec4 ring_color		= vec4( vec3(0.29), 1.0);

		// Inner Grid
		float a = pixel_thin( frag_pos.xz / 0.2 );
		out_color = mix( base_color, grid_min_color, a );

		// Outer Grid
		float b = grad_thick2( frag_pos.xz, 0.01 );
		out_color = mix( out_color, grid_max_color, b*b*b*b );
		
		// Color Axis Lines
		float px_z = fwidth( frag_pos.z );
		if( abs( frag_pos.z ) <= 0.01 + px_z ) out_color.rgb = vec3(0.58823529411,0.25490196078,0.30588235294); //#96414E
		if( abs( frag_pos.x ) <= 0.01  ) out_color.rgb = vec3( 0.42745098039,0.58431372549,0.16078431372); //#6D9529

		// Draw Ring
		float c = ring( frag_pos.xz, 0.40, 0.5 );
		out_color = mix( out_color, ring_color, c*c*c );

		// Cut hole at origin
		float ring_len = length( frag_pos );
		float ring_px = fwidth( ring_len );
		out_color.a *= smoothstep( 0.4 - ring_px, 0.4 + ring_px*2.0, ring_len );
	}`;



/*
		float _gridCount = 5.0;
		float _lineWidth = 0.02;
		vec2 gpos 	= frag_pos.xz * _gridCount + 0.5;
		vec2 apos 	= abs( fract( gpos ) - 0.5 );
		vec2 grid 	= smoothstep( fwidth( gpos ).x + _lineWidth, _lineWidth, apos );
		float x 	= max( grid.x, grid.y ); // The grid lines in grayscale
		out_color 	= vec4( x, x, x, 1.0 );
*/
/*		
float x = 0.0;
float step = 1.0;
float w = 0.02;

vec2 spos = ( frag_pos.xz / step );
vec2 fpos = fract( spos );
vec2 dpos = fwidth( spos );

//x = 1.0 - ( smoothstep( w - dpos.x*2.0 , w + dpos.x, fpos.x ) -
//	smoothstep( 1.0 - w - dpos.x*2.0, 1.0 - w - dpos.x, fpos.x ) );

//x = 1.0 - ( smoothstep( w - dpos.x*2.0 , w + dpos.x, fpos.x ) -
//	smoothstep( 1.0 - w - dpos.x*2.0, 1.0 - w - dpos.x, fpos.x ) );

vec2 xx = smoothstep( w - dpos * 2.0 , w + dpos, fpos ) -
	smoothstep( 1.0 - w - dpos*2.0, 1.0 - w - dpos, fpos );

x = 1.0 - min( xx.x, xx.y );

//vec2 minorGrid = abs(fract( frag_pos.xz / step - 0.5) - 0.5) / fwidth( frag_pos.xz / step);
//x = 1.0 - min(minorGrid.x, minorGrid.y);

//x = pixel_thin( frag_pos.xz / step );

//x *= 0.2;
*/


/*
https://forum.unity.com/threads/wireframe-grid-shader.60071/
half _Glossiness;
half _Metallic;
fixed4 _Color;
float _GridStep;
float _GridWidth;

void surf (Input IN, inout SurfaceOutputStandard o) {
	// Albedo comes from a texture tinted by color
	fixed4 c = tex2D (_MainTex, IN.uv_MainTex) * _Color;
	
	// grid overlay
	float2 pos = IN.worldPos.xz / _GridStep;
	float2 f  = abs(frac(pos)-.5);
	float2 df = fwidth(pos) * _GridWidth;
	float2 g = smoothstep(-df ,df , f);
	float grid = 1.0 - saturate(g.x * g.y);
	c.rgb = lerp(c.rgb, float3(1,1,1), grid);
	
	o.Albedo = c.rgb;
	// Metallic and smoothness come from slider variables
	o.Metallic = _Metallic;
	o.Smoothness = _Glossiness;
	o.Alpha = c.a;
}

		float x = 0.0;
		float step = 0.2;
		float w = 1.0;

		vec2 pos = frag_pos.xz / step;
		vec2 f = abs( fract(pos) - 0.5 );
		vec2 df = fwidth( pos ) * w;
		vec2 g = smoothstep(-df ,df , f);
		x = 1.0 - clamp(g.x * g.y, 0.0, 1.0 );

        out_color = vec4( x, x, x, 1.0 );

*/

/*
WORKING ANTI ALIAS RING
		float dist = length( frag_pos );
		float delta = fwidth( dist );

		float x = fract( dist / 1.0 );
		x = smoothstep( 0.5-delta, 0.5+delta, dist )
			- smoothstep( 0.6-delta, 0.6+delta, dist);

		//x = 1.0 - abs( fract(c / len - 0.5) - 0.5 ) / fwidth(c / len);
		out_color = vec4( x, x, x, 1.0 );
*/


/*
		float len 		= 0.2;
		float rng 		= 0.00;
		float th 		= rng * 0.5;

		vec2 coord 		= frag_pos.xz;
		vec2 coord_d	= coord / len;
		vec2 coord_w 	= fwidth( coord_d );
		vec2 coord_f	= fract( coord_d );
		vec2 coord_s 	= coord_f * len;

		float x = coord_f.x;
		//if( !( coord_s.x >= 0.0 && coord_s.x <= 0.2) ) x = 0.0;


		//coord_w 	= fwidth( coord_s );
		//x = smoothstep( th-coord_w.x, th + coord_w.x, coord_s.x  ) -
		//	smoothstep( len-th-coord_w.x, len-th + coord_w.x, coord_s.x  );
		

		//vec2 minorGrid = abs(fract(coord / len - 0.5) - 0.5) / fwidth(coord / len);
		//x = 1.0 - min(minorGrid.x, minorGrid.y);
		//x = 1.0 - abs( fract(coord / len - 0.5).x - 0.5 ) / fwidth(coord / len).x;

		out_color = vec4( x, x, x, 1.0 );
*/

/*
float getShape(float thickness, float outer, vec2 uv){
    uv *= 2.0;
    float a = atan(uv.x,-uv.y) + 3.1415926;
    float r = 3.1415926 * 2. / vSides;
    float d = cos( floor( .5 + a / r ) * r - a ) * length( uv );
    return smoothstep(thickness - fwidth(d), thickness + fwidth(d), d) - smoothstep(outer - fwidth(d), outer + fwidth(d), d);
}

float getShape(float thickness, float outer, vec2 uv){
    uv *= 2.0;
    float a = atan(uv.x,-uv.y) + 3.1415926;
    float r = 3.1415926 * 2. / vSides;
    float d = cos( floor( .5 + a / r ) * r - a ) * length( uv );
    //d = 0.5 + 0.01 * (d - 0.5);
    return smoothstep(thickness - fwidth(d), thickness + fwidth(d), d) - smoothstep(outer - fwidth(d), outer + fwidth(d), d);
}

float circle(float inner, float outer, vec2 uv){
      float dist = length(uv);
      return smoothstep(inner - 0.01, inner, dist) - smoothstep(outer - 0.01, outer,  dist);
    }
    
    float square(float inner, float outer, vec2 uv){
      vec2 absUv = abs(uv);
      float maxUv = abs(max(absUv.x, absUv.y));
      return smoothstep(inner - 0.01, inner, maxUv) - smoothstep(outer - 0.01, outer, maxUv);
    }
    
    // honestly stolen from https://www.shadertoy.com/view/lsBfRc
    float triangle(float inner, float outer, vec2 uv){
        uv *= 2.0;
        float a = atan(uv.x,-uv.y)+PI;
        float r = 3.1415926 * 2.0 / 3.0;

        float d = cos( floor( .5 + a/r ) * r - a ) * length( uv );

        return smoothstep(inner - 0.01, inner, d) - smoothstep(outer - 0.01, outer,d);
	}
	

	float ring(vec2 st)
	{
		float r = 0.4;   								// radius
		float dr = 0.15; 								// delta radius (thickness)
								
		float d = length(st);							// distance of this pixel from origin
		float c = smoothstep(r, r - (dr / 2.0), d) + 	// calculate color of this pixel based on
				smoothstep(r, r + (dr / 2.0), d); 	// ring parameters

			float c = smoothstep(0.0, dr / 2.0, abs(d - r)); rewrite c as this to remove both smoothsteps
		return c;
	}
*/

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
let sh = App.Shader.from_src( "GridFloor", vert_src, frag_src )
    .add_uniform_blocks( ["Global","Model"] )
    .opt_blend( true );

App.Cache.set_shader( sh.name, sh );

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
export default sh;