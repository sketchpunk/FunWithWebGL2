
import { gl } from "../engine/App.js";

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

export default DynBuffer;