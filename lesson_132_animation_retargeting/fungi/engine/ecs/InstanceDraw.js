import App, { gl, Entity, Components } from "../App.js";
import Vao, { Buf }	from "../../core/Vao2.js";
import Vec3Buffer	from "../../maths/Vec3Buffer.js";
import QuatBuffer	from "../../maths/QuatBuffer.js";

//###################################################################################
const INST_POS_LOC = 14;
const INST_ROT_LOC = 15;

class InstanceDraw{
	static $( e ){
		if( !e ) e = App.$Draw();
		if( e instanceof Entity && !e.InstanceDraw ) Entity.com_fromName( e, "InstanceDraw" );

		//e.InstanceDraw.init( size, vec_ary, idx_ary, uv_ary, norm_ary );
		//e.Draw.add( e.InstanceDraw.vao, mat, mode );

		return e;
	}

	constructor(){
		this.vao			= null;
		this.is_modified	= false;

		this.pos_data		= null;	// Instance Data
		this.rot_data		= null;
		this.pos_dbuf		= null; // Dynamic Buffer Handler	
		this.rot_dbuf		= null;
	}

	init( size ){
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		this.pos_data	= new Vec3Buffer( size );
		this.rot_data	= new QuatBuffer( size );

		// Create Empty Buffers on the GPU with the capacity needed.
		let pos_buf		= Buf.empty_array( this.pos_data.byte_capacity, false );
		let rot_buf		= Buf.empty_array( this.rot_data.byte_capacity, false );

		// Manage Updating / Resizing the Buffers on the GPU
		this.pos_dbuf	= new DynBuffer( pos_buf, this.pos_data.byte_capacity );
		this.rot_dbuf	= new DynBuffer( rot_buf, this.rot_data.byte_capacity );
		
		/*
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		let vao = new Vao().bind();
		
		// Standard Mesh Buffers
		vao.add_vertices( vec_ary );
		if( idx_ary ) vao.add_indices( idx_ary );

		// Custom Instance Buffers
		vao.add_buf( "inst_pos", pos_buf, INST_POS_LOC, 3, "FLOAT", 0, 0, true );
		vao.add_buf( "inst_rot", rot_buf, INST_ROT_LOC, 4, "FLOAT", 0, 0, true );

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Finalize the VAO
		let elm_cnt = ( idx_ary )? idx_ary.length : vec_ary.length / 3;
		this.vao = vao.unbind_all().set( elm_cnt, true, this.pos_data.len );
		*/
		return this;
	}

	vao_bin( spec, dv, mat ){
		let v_buf	= Buf.new_array_bin( dv, spec.vertices.byteStart, spec.vertices.byteLen, true, true );
		let u_buf	= Buf.new_array_bin( dv, spec.uv.byteStart, spec.uv.byteLen, true, true );
		let i_buf	= Buf.new_element_bin( dv, spec.indices.byteStart, spec.indices.byteLen, true, true );
		
		let vao		= new Vao().bind();

		vao.add_vertices( v_buf );
		vao.add_indices( i_buf );
		vao.add_uv( u_buf );

		vao.add_buf( "inst_pos", this.pos_dbuf.buf, INST_POS_LOC, 3, "FLOAT", 0, 0, true );
		vao.add_buf( "inst_rot", this.rot_dbuf.buf, INST_ROT_LOC, 4, "FLOAT", 0, 0, true );

		vao.set( spec.indices.elmCount, true, 0 );
		vao.unbind_all();
		
		this.vao = vao;

		let e = App.ecs.entity_by_id( this.entityID );
		e.Draw.add( vao, mat );

		return this;
	}

	add( pos=null, rot=null ){
		if( pos )	this.pos_data.push( pos );
		else 		this.pos_data.push_raw( 0, 0, 0 );

		if( rot )	this.rot_data.push( rot );
		else 		this.rot_data.push_raw( 0, 0, 0, 1 );

		this.is_modified = true;
		return this;
	}

	update(){
		if( !this.is_modified ) return this;

		// Update the GPU buffers with the new data.
		this.pos_dbuf.update( this.pos_data.buffer );
		this.rot_dbuf.update( this.rot_data.buffer );

		// Update the Instance count, else it won't render the correct number.
		this.vao.instanceCount = this.pos_data.len;

		this.is_modified = false;
		return this;
	}

} Components( InstanceDraw );


//###################################################################################
class DynBuffer{
	constructor( buf, cap, is_ary_buf=true ){
		this.target		= (is_ary_buf)? gl.ctx.ARRAY_BUFFER : gl.ctx.ELEMENT_ARRAY_BUFFER;
		this.capacity	= cap;	// Capacity in bytes of the gpu buffer
		this.byte_len	= 0;	// How Many Bytes Currently Posted ot the GPU
		this.buf 		= buf;	// Reference to buffer that will be modified
	}

	update( type_ary ){
		let b_len = type_ary.byteLength;

		gl.ctx.bindBuffer( this.target, this.buf );

		// if the data size is of capacity on the gpu, can set it up as sub data.
		if( b_len <= this.capacity ) gl.ctx.bufferSubData( this.target, 0, type_ary, 0, null );
		else{
			this.capacity = b_len;
			// if( this.byte_len > 0) gl.ctx.bufferData( this.target, null, gl.ctx.DYNAMIC_DRAW ); // Clean up previus data
			gl.ctx.bufferData( this.target, type_ary, gl.ctx.DYNAMIC_DRAW );
		}

		gl.ctx.bindBuffer( this.target, null ); // unbind buffer
		this.byte_len = b_len;
	}
}

//###################################################################################
export default InstanceDraw;