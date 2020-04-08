import gl 		from "./gl.js";
import Vao		from "./Vao.js";
import Buf 		from "./Buf.js";
import Shader	from "./Shader.js";

//#############################################################################
class Mesh{
	constructor( name="mesh_000" ){
		this.name			= name;
		this.vao 			= null;
		this.elm_cnt 		= 0;
		this.elm_type		= gl.ctx.UNSIGNED_SHORT; //UNSIGNED_INT
		this.instance_cnt	= 0;
		this.is_instanced	= false;

		this.buf 		= {
			idx			: null,
			vert		: null,
			norm		: null,
			uv			: null,
			bone_idx	: null,
			bone_wgt	: null,
		};
	}

	set( vao, elm_cnt=null, inst_cnt=null ){
		this.vao = vao;
		if( elm_cnt ) this.elm_cnt = elm_cnt;
		if( inst_cnt != null ){
			this.instance_cnt = inst_cnt;
			this.is_instanced = true;
		}
		return this;
	}

	//////////////////////////////////////////////////////////
	//
	//////////////////////////////////////////////////////////
		static from_data( name, vert, idx=null, norm=null, uv=null, b_idx=null, b_wgt=null, bone_limit=4 ){
			let m 	= new Mesh( name ),
				vao = new Vao().bind();

			m.buf.vert = Buf.new_array( vert, 3, true, false );
			vao.add_buf( m.buf.vert, Shader.POS_LOC );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( idx ){
				if( idx instanceof Uint16Array ) 		m.elm_type = gl.ctx.UNSIGNED_SHORT;
				else if( idx instanceof Uint32Array ) 	m.elm_type = gl.ctx.UNSIGNED_INT;

				m.buf.idx = Buf.new_element( idx, true, false );
				vao.add_indices( m.buf.idx );
			}

			if( norm ){
				m.buf.norm = Buf.new_array( norm, 3, true, false );
				vao.add_buf( m.buf.norm, Shader.NORM_LOC );
			}

			if( uv ){
				m.buf.uv = Buf.new_array( uv, 2, true, false );
				vao.add_buf( m.buf.uv, Shader.UV_LOC );
			}

			if( b_idx && b_wgt ){
				m.buf.bone_idx = Buf.new_array( b_idx, bone_limit, true, false );
				vao.add_buf( m.buf.bone_idx, Shader.BONE_IDX_LOC );

				m.buf.bone_wgt = Buf.new_array( b_wgt, bone_limit, true, false );
				vao.add_buf( m.buf.bone_wgt, Shader.BONE_WGT_LOC );
			}
			
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			Vao.unbind();
			Buf.unbind_array();
			if( idx ) Buf.unbind_element();

			m.elm_cnt	= ( idx )? idx.length : vert.length / 3;
			m.vao		= vao;

			//console.log( m, m.name );
			return m;
		}

		static from_data_vert4( name, vert, idx=null, norm=null ){
			let m 	= new Mesh( name ),
				vao = new Vao().bind();

			m.buf.vert = Buf.new_array( vert, 4, true, false );
			vao.add_buf( m.buf.vert, Shader.POS_LOC );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			
			if( idx ){
				m.buf.idx = Buf.new_element( idx, true, false );
				vao.add_indices( m.buf.idx );
			}

			if( norm ){
				m.buf.norm = Buf.new_array( norm, 3, true, false );
				vao.add_buf( m.buf.norm, Shader.NORM_LOC );
			}
			
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			Vao.unbind();
			Buf.unbind_array();
			if( idx ) Buf.unbind_element();

			m.elm_cnt	= ( idx )? idx.length : vert.length / 4;
			m.vao		= vao;

			return m;
		}

		static from_bin( name, json, bin, load_skin=false ){
			let m 	= new Mesh( name ),
				vao = new Vao().bind(),
				dv  = ( bin instanceof ArrayBuffer )? new DataView( bin ) : bin,
				o;

			// VERTICES
			o = json.vertices;
			m.buf.vert = Buf.new_array_bin( dv, o.byte_start, o.byte_cnt, o.comp_len, true, false );
			vao.add_buf( m.buf.vert, Shader.POS_LOC );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// INDICES
			if( json.indices ){
				o = json.indices;

				// Indices can be imported as different Int types.
				switch( o.array_type ){
					case "Uint16": m.elm_type = gl.ctx.UNSIGNED_SHORT; break;
					case "Uint32": m.elm_type = gl.ctx.UNSIGNED_INT; break;
					default: console.log("Unknown Array Type when Adding Indices", o.array_type ); break;
				}

				m.buf.idx = Buf.new_element_bin( dv, o.byte_start, o.byte_cnt, true, false );
				vao.add_indices( m.buf.idx );
			}

			// NORMAL
			if( json.normal ){
				o = json.normal;
				m.buf.norm = Buf.new_array_bin( dv, o.byte_start, o.byte_cnt, o.comp_len, true, false );
				vao.add_buf( m.buf.norm, Shader.NORM_LOC );
			}

			// UV
			if( json.uv ){
				o = json.uv;
				m.buf.uv = Buf.new_array_bin( dv, o.byte_start, o.byte_cnt, o.comp_len, true, false );
				vao.add_buf( m.buf.uv, Shader.UV_LOC );
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// BONE INDICES AND WEIGHTS
			if( load_skin && json.joints && json.weights ){
				// JOINT INDICES
				// Can make this work BUT need to parse joints out of BIN as a Uint16 array, then pass
				// that to Buffer.array instead of fromBin. Javascript knows well enough how to convert
				// Uint16Array to Float32Array before saving it to the GPU. This is an issue because
				// there does not seem to be a way to use Uint16 Buffers other then Index. Only option is
				// to use float buffers, so this conversion is needed.

				// elmCount * compLen = Total Uints ( not total bytes )
				o = json.joints;
				let ui16 = new Uint16Array( bin, o.byte_start, o.elm_cnt * o.comp_len );
				m.buf.bone_idx = Buf.new_array( ui16, o.comp_len, true, false );
				vao.add_buf( m.buf.bone_idx, Shader.BONE_IDX_LOC );

				o = json.weights;
				m.buf.bone_wgt = Buf.new_array_bin( dv, o.byte_start, o.byte_cnt, o.comp_len, true, false );
				vao.add_buf( m.buf.bone_wgt, Shader.BONE_WGT_LOC );
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			Vao.unbind();
			Buf.unbind_array();
			if( json.indices ) Buf.unbind_element();

			return m.set( vao, (( json.indices )? json.indices.elm_cnt : json.vertices.elm_cnt) );
		}


	//////////////////////////////////////////////////////////
	//
	//////////////////////////////////////////////////////////
		static draw( mesh, draw_mode = Mesh.PNT, do_bind=true ){
			if( do_bind ) gl.ctx.bindVertexArray( mesh.vao.ref );

			if( mesh.elm_cnt != 0 ){
				if( mesh.buf.idx )	gl.ctx.drawElements( draw_mode, mesh.elm_cnt, gl.ctx.UNSIGNED_SHORT, 0 );
				else				gl.ctx.drawArrays( draw_mode, 0, mesh.elm_cnt );
			}

			if( do_bind ) gl.ctx.bindVertexArray( null );
			return this;
		}
}

Mesh.PNT		= 0;
Mesh.LINE		= 1;
Mesh.LINE_LOOP	= 2;
Mesh.LINE_STRIP	= 3;
Mesh.TRI		= 4;
Mesh.TRI_STRIP	= 5;


//#############################################################################
export default Mesh;