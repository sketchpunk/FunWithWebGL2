import gl from "./gl.js";
import Shader from "./Shader.js";

const BUF_V_NAME	= "vertices";
const BUF_N_NAME	= "normal";
const BUF_UV_NAME	= "uv";
const BUF_IDX_NAME	= "indices";
const BUF_BI_NAME	= "bones";
const BUF_BW_NAME	= "weight";

//######################################################################

class Buf{
	///////////////////////////////////////////////////////////////
	// Array Buffer
	///////////////////////////////////////////////////////////////
		static new_array( data, is_static=true, unbind=true ) {
			let ary	= ( data instanceof Float32Array )? data : new Float32Array( data ),
				id	= gl.ctx.createBuffer();
			gl.ctx.bindBuffer( gl.ctx.ARRAY_BUFFER, id );
			gl.ctx.bufferData( gl.ctx.ARRAY_BUFFER, ary, (is_static)? gl.ctx.STATIC_DRAW : gl.ctx.DYNAMIC_DRAW );

			if( unbind ) gl.ctx.bindBuffer( gl.ctx.ARRAY_BUFFER, null );
			return id;
		}

		static new_array_bin( data_view, b_start, b_len, is_static=true, unbind=true ) {
			let id	= gl.ctx.createBuffer();

			// Copy data from ArrayBuffer / DataView to the GPU
			gl.ctx.bindBuffer( gl.ctx.ARRAY_BUFFER, id );
			gl.ctx.bufferData( gl.ctx.ARRAY_BUFFER, data_view, (is_static)? gl.ctx.STATIC_DRAW : gl.ctx.DYNAMIC_DRAW, b_start, b_len );

			if( unbind ) gl.ctx.bindBuffer( gl.ctx.ARRAY_BUFFER, null );
			return id;
		}

		static empty_array( byte_cnt, is_static=true, unbind=true ){
			let id	= gl.ctx.createBuffer();
			gl.ctx.bindBuffer( gl.ctx.ARRAY_BUFFER, id );
			gl.ctx.bufferData( gl.ctx.ARRAY_BUFFER, byte_cnt, (is_static)? gl.ctx.STATIC_DRAW : gl.ctx.DYNAMIC_DRAW );

			if( unbind ) gl.ctx.bindBuffer( gl.ctx.ARRAY_BUFFER, null );
			return id;
		}


	///////////////////////////////////////////////////////////////
	// Element Array Buffer
	///////////////////////////////////////////////////////////////
		static new_element( data, is_static=true, unbind=true ) {
			let ary	= ( data instanceof Uint16Array )? data : new Uint16Array( data ),
				id	= gl.ctx.createBuffer();
			gl.ctx.bindBuffer( gl.ctx.ELEMENT_ARRAY_BUFFER, id );
			gl.ctx.bufferData( gl.ctx.ELEMENT_ARRAY_BUFFER, ary, (is_static)? gl.ctx.STATIC_DRAW : gl.ctx.DYNAMIC_DRAW );

			if( unbind ) gl.ctx.bindBuffer( gl.ctx.ELEMENT_ARRAY_BUFFER, null );
			return id;
		}

		static new_element_bin( data_view, b_start, b_len, is_static=true, unbind=true ) {
			let id	= gl.ctx.createBuffer();

			gl.ctx.bindBuffer( gl.ctx.ELEMENT_ARRAY_BUFFER, id );
			gl.ctx.bufferData( gl.ctx.ELEMENT_ARRAY_BUFFER, data_view, (is_static)? gl.ctx.STATIC_DRAW : gl.ctx.DYNAMIC_DRAW, b_start, b_len );

			if( unbind ) gl.ctx.bindBuffer( gl.ctx.ELEMENT_ARRAY_BUFFER, null );
			return id;
		}


	///////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////
		static set_attrib( attr_loc, comp_len, data_type, stride=0, offset=0 ){
			gl.ctx.enableVertexAttribArray( attr_loc );
			gl.ctx.vertexAttribPointer( attr_loc, comp_len, data_type, false, stride, offset );
			return this;
		}

		static bind_array( id ){ gl.ctx.bindBuffer( gl.ctx.ARRAY_BUFFER, id ); return this; }
		static unbind_array(){ gl.ctx.bindBuffer( gl.ctx.ARRAY_BUFFER, null ); return this; }

		static bind_element( id ){ gl.ctx.bindBuffer( gl.ctx.ELEMENT_ARRAY_BUFFER, id ); return this; }
		static unbind_element(){ gl.ctx.bindBuffer( gl.ctx.ELEMENT_ARRAY_BUFFER, null ); return this; }
}

//######################################################################

class Vao{
	constructor( name="BlankVAO" ){
		this.id				= gl.ctx.createVertexArray();
		this.name			= name;
		this.elmCount		= 0;
		this.instanceCount	= 0;
		this.isIndexed		= false;
		this.isInstanced	= false;
		this.buf 			= {};
	}

	set( elm_cnt=0, is_instance=false, instCnt=0 ){
		this.elmCount		= elm_cnt;
		this.isInstanced	= is_instance;
		this.instanceCount	= instCnt;
		return this;
	}

	///////////////////////////////////////////////////////////////
	// Raw Buffers
	///////////////////////////////////////////////////////////////
	
		add_buf( name, id, attr_loc, comp_len=3, data_type="FLOAT", stride=0, offset=0, is_instance=false ){
			gl.ctx.bindBuffer( gl.ctx.ARRAY_BUFFER, id );
			gl.ctx.enableVertexAttribArray( attr_loc );
			gl.ctx.vertexAttribPointer( attr_loc, comp_len, gl.ctx[data_type], false, stride, offset );

			if( is_instance ) gl.ctx.vertexAttribDivisor( attr_loc, 1 );

			this.buf[ name ] = { id }; 
			return this;
		}

		add_partition( attr_loc, comp_len=3, data_type="FLOAT", stride=0, offset=0, is_instance=false ){
			gl.ctx.enableVertexAttribArray( attr_loc );
			gl.ctx.vertexAttribPointer( attr_loc, comp_len, gl.ctx[data_type], false, stride, offset );

			if( is_instance ) gl.ctx.vertexAttribDivisor( attr_loc, 1 );
			return this;
		}


	///////////////////////////////////////////////////////////////
	// Specific Buffers, Simplify API
	///////////////////////////////////////////////////////////////
	
		add_vertices( id, comp_len=3, stride=0, offset=0 ){
			return this.add_buf( BUF_V_NAME, id, Shader.POSITION_LOC, comp_len, "FLOAT", stride, offset );
		}

		add_vertices_bin( dv, byte_start, byte_len, is_static=true ){
			let buf = Buf.new_array_bin( dv, byte_start, byte_len, is_static, false );
			return this.add_buf( BUF_V_NAME, buf, Shader.POSITION_LOC, 3, "FLOAT", 0, 0 );
		}

		//--------------------------------------------

		add_normals( id, stride=0, offset=0 ){
			return this.add_buf( BUF_N_NAME, id, Shader.NORMAL_LOC, 3, "FLOAT", stride, offset );
		}

		//--------------------------------------------

		add_uv( id, stride=0, offset=0 ){
			return this.add_buf( BUF_UV_NAME, id, Shader.UV_LOC, 2, "FLOAT", stride, offset );
		}

		//--------------------------------------------

		add_bones( id, comp_len=4, stride=0, offset=0 ){
			return this.add_buf( BUF_BI_NAME, id, Shader.BONE_IDX_LOC, comp_len, "FLOAT", stride, offset );
		}

		add_bones_bin( arybuf, byte_start, elm_cnt, comp_len=4, is_static=true ){ //Must pass in ArrayBuffer, Dataview wont work.
			// JOINT INDICES
			// Can make this work BUT need to parse joints out of BIN as a Uint16 array, then pass
			// that to Buffer.array instead of fromBin. Javascript knows well enough how to convert
			// Uint16Array to Float32Array before saving it to the GPU. This is an issue because
			// there does not seem to be a way to use Uint16 Buffers other then Index. Only option is
			// to use float buffers, so this conversion is needed.

			// elmCount * compLen = Total Uints ( not total bytes )
			let ui16	= new Uint16Array( arybuf, byte_start, elm_cnt * comp_len ),
				buf		= Buf.new_array( ui16, true, false );
			return this.add_buf( BUF_BI_NAME, buf, Shader.BONE_IDX_LOC, comp_len, "FLOAT", 0, 0 );
		}

		//--------------------------------------------

		add_weights( id, comp_len=4, stride=0, offset=0 ){
			return this.add_buf( BUF_BW_NAME, id, Shader.BONE_WEIGHT_LOC, comp_len, "FLOAT", stride, offset );
		}

		add_weights_bin( dv, byte_start, byte_len, comp_len=4, is_static=true ){
			let buf = Buf.new_array_bin( dv, byte_start, byte_len, is_static, false );
			return this.add_buf( BUF_BW_NAME, buf, Shader.BONE_WEIGHT_LOC, comp_len, "FLOAT", 0, 0 );
		}

		//--------------------------------------------

		add_indices( id ){ 
			gl.ctx.bindBuffer( gl.ctx.ELEMENT_ARRAY_BUFFER, id );

			this.buf[ BUF_IDX_NAME ]	= { id };
			this.isIndexed				= true;
			return this;
		}

		add_indices_bin( dv, byte_start, byte_len, is_static=true ){
			let buf = Buf.new_element_bin( dv, byte_start, byte_len, is_static, false );
			return this.add_indices( buf );
		}


	///////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////
	
		bind(){ gl.ctx.bindVertexArray( this.id ); return this; }
		unbind(){ gl.ctx.bindVertexArray( null ); return this; }
		unbind_all(){
			gl.ctx.bindVertexArray( null );
			gl.ctx.bindBuffer( gl.ctx.ARRAY_BUFFER, null );

			if( this.isIndexed ) gl.ctx.bindBuffer( gl.ctx.ELEMENT_ARRAY_BUFFER, null );
			return this;
		}

		static unbind(){ gl.ctx.bindVertexArray( null ); return this; }
		static set_cache( vao ){ Cache.vaos.set( vao.name, vao ); return this; }


	///////////////////////////////////////////////////////////////
	// Standard VAOs, Build in different ways.
	///////////////////////////////////////////////////////////////

		static standard_by_buf( uName, elm_cnt, comp_len, vert_id, idx_id = null ){
			let vao = new Vao( uName ).bind();

			vao.add_vertices( vert_id, comp_len );
			if( idx_id ) vao.add_indices( idx_id );

			return vao.set( elm_cnt ).unbind_all();
		}

		static standard_by_data( uName, vert_ary, comp_len=3, idx_ary = null, uv_ary=null, norm_ary=null, bone_ary=null, weight_ary=null, bone_limit=4 ){
			let vao = new Vao( uName ).bind();

			vao.add_vertices( Buf.new_array( vert_ary, true, false ), comp_len );
			
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( bone_limit > 0 && bone_ary && weight_ary ){
				vao.add_bones( Buf.new_array( bone_ary, true, false ), bone_limit );
				vao.add_weights( Buf.new_array( weight_ary, true, false ), bone_limit );
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( idx_ary ){
				vao.add_indices( Buf.new_element( idx_ary, true, false ) );
				vao.elmCount = idx_ary.length;
			}else{
				vao.elmCount = vert_ary.length / comp_len;
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			return vao.unbind_all();
		}

		static standard_by_bin( uName, spec, bin ){
			let dv 	= ( bin instanceof ArrayBuffer )? new DataView( bin ) : bin,
				vao	= new Vao( uName ).bind();

			vao.add_vertices( Buf.new_array_bin( dv, spec.vertices.byteStart, spec.vertices.byteLen, true, false ), spec.vertices.compLen );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( spec.joints && spec.weights ){
				vao.add_weights( Buf.new_array_bin( dv, spec.weights.byteStart, spec.weights.byteLen, true, false ), spec.weights.compLen );

				// JOINT INDICES
				// Can make this work BUT need to parse joints out of BIN as a Uint16 array, then pass
				// that to Buf.new_array instead of fromBin. Javascript knows well enough how to convert
				// Uint16Array to Float32Array before saving it to the GPU. This is an issue because
				// there does not seem to be a way to use Uint16 Buffers other then Index. Only option is
				// to use float buffers, so this conversion is needed.
				if( spec.joints.arrayType == "Uint16" ){
					// elmCount * compLen = Total Uints ( not total bytes )
					let uint = new Uint16Array( bin, spec.joints.byteStart, spec.joints.elmCount * spec.joints.compLen );
					vao.add_bones( Buf.new_array( uint, true, false ), spec.joints.compLen );
				}else{
					console.error("Vao.standard_by_bin : Joints are not the type Uint16 ");
					return vao;
				}
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( spec.indices ){
				vao.add_indices( Buf.new_element_bin( dv, spec.indices.byteStart, spec.indices.byteLen, true, false ) );
				vao.elmCount = spec.indices.elmCount;
			}else{
				vao.elmCount = spec.vertices.elmCount;
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			return vao.unbind_all();
		}

		static standard_empty( uName, vert_cnt, comp_len=3 ){
			let vao 			= new Vao( uName ).bind(),
				vert_byte_cnt 	= Float32Array.BYTES_PER_ELEMENT * comp_len * vert_cnt;

			vao.add_vertices( Buf.empty_array( vert_byte_cnt, false, false ), comp_len );

			return vao.unbind_all();
		}
}

//######################################################################
export default Vao;
export { Buf };