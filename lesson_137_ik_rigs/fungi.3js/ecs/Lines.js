import App, { THREE } from "../App.js";

const	DASH_SEG	= 1 / 0.07;
const	DASH_DIV 	= 0.4;

//################################################################################
class Lines{
	static $( name="lines", max_len=100 ){
		let e = App.$( name );
		e.add_com( "Lines" ).init( name, max_len );
		return e;
	}

    constructor(){
		this.cnt = 0;	// How many items are in the buffer.
	}

	init( name = "lines", max_len = 100 ){
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// BUFFERS
        this.buf_pos = new THREE.BufferAttribute( new Float32Array( max_len * 4 * 2 ), 4 );
		this.buf_pos.setUsage( THREE.DynamicDrawUsage );

		this.buf_clr = new THREE.BufferAttribute( new Float32Array( max_len * 3 * 2 ), 3 );
		this.buf_clr.setUsage( THREE.DynamicDrawUsage );

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// GEOMETRY
        this.geo = new THREE.BufferGeometry();
		this.geo.setAttribute( "position",	this.buf_pos );
		this.geo.setAttribute( "color",		this.buf_clr );
		this.geo.setDrawRange( 0, 0 );

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// MESH
		this.mesh = new THREE.LineSegments( this.geo, get_material() ); 
		this.mesh.name = name;

		// Apply Obj Reference
		App.get_e( this.entity_id ).Obj.set_ref( this.mesh );

		return this;
	}

	add( p0, p1, hex_0=0xff0000, hex_1=null, is_dash=false ){ return this.add_raw( p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, hex_0, hex_1, is_dash ); }
	add_raw( x0, y0, z0, x1, y1, z1, hex_0=0xff0000, hex_1=null, is_dash=false ){
		let idx 	= this.cnt * 2,
			len_0	= -1,
			len_1	= -1;

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// VERTEX POSITION - LEN
		if( is_dash ){
			len_0 = 0;
			len_1 = Math.sqrt(
				(x1 - x0) ** 2 +
				(y1 - y0) ** 2 +
				(z1 - z0) ** 2
			);
		}

		this.buf_pos.setXYZW( idx, x0, y0, z0, len_0 );
		this.buf_pos.setXYZW( idx+1, x1, y1, z1, len_1 );
		this.buf_pos.needsUpdate = true;

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// VERTEX COLOR
		let c0 = gl_color( hex_0 );
		let c1 = ( hex_1 != null )? gl_color( hex_1 ) : c0;

		this.buf_clr.setXYZ( idx, c0[0], c0[1], c0[2] );
		this.buf_clr.setXYZ( idx+1, c1[0], c1[1], c1[2] );
		this.buf_clr.needsUpdate = true;

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// INCREMENT AND UPDATE DRAW RANGE
		this.cnt++;
		this.geo.setDrawRange( 0, this.cnt * 2 );

		return this;
	}

	reset(){
		this.cnt = 0;
		this.geo.setDrawRange( 0, 0 );
		return this;
	}
}

//################################################################################
// #region SHADER
let gMat = null;
function get_material(){
	if( gMat ) return gMat;

	gMat = new THREE.RawShaderMaterial( { 
		vertexShader	: vert_src, 
		fragmentShader	: frag_src, 
		transparent 	: true, 
		uniforms 		: { 
			dash_seg : { value : DASH_SEG },
			dash_div : { value : DASH_DIV },
		}
	} );

	return gMat;
}

const vert_src = `#version 300 es
in	vec4	position;
in	vec3	color;

uniform 	mat4	modelViewMatrix;
uniform 	mat4	projectionMatrix;

out vec3	frag_color;
out float	frag_len;

void main(){
	vec4 ws_position 	= modelViewMatrix * vec4( position.xyz, 1.0 );
    frag_color			= color;
    frag_len			= position.w;
	gl_Position			= projectionMatrix * ws_position;	
}`;

const frag_src = `#version 300 es
precision mediump float;

uniform float dash_seg;
uniform float dash_div;

in vec3		frag_color;
in float	frag_len;

out	vec4	out_color;

void main(){
    float alpha = 1.0;
    if( frag_len >= 0.0 ) alpha = step( dash_div, fract( frag_len * dash_seg ) );
    out_color = vec4( frag_color, alpha );
}`;

// #endregion

//################################################################################
function gl_color( hex, out = null ){
	const NORMALIZE_RGB = 1 / 255;
	out = out || [0,0,0];

	out[0] = ( hex >> 16 & 255 ) * NORMALIZE_RGB;
	out[1] = ( hex >> 8 & 255 ) * NORMALIZE_RGB;
	out[2] = ( hex & 255 ) * NORMALIZE_RGB;

	return out;
}

//################################################################################

App.Components.reg( Lines );
export default Lines;