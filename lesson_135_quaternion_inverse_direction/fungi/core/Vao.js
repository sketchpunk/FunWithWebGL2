import gl		from "./gl.js";

//######################################################################
class Vao{
	constructor(){
		this.ref = gl.ctx.createVertexArray();
	}

	///////////////////////////////////////////////////////////////
	// Buffers
	///////////////////////////////////////////////////////////////
		add_indices( buf ){ gl.ctx.bindBuffer( buf.type, buf.ref ); return this; }

		add_buf( buf, attrib_loc, is_instance=false ){
			gl.ctx.bindBuffer( buf.type, buf.ref );
			gl.ctx.enableVertexAttribArray( attrib_loc );
			gl.ctx.vertexAttribPointer( attrib_loc, buf.comp_len, gl.ctx.FLOAT, false, buf.stride_len, buf.offset );
			
			if( is_instance ) gl.ctx.vertexAttribDivisor( attrib_loc, 1 );
			return this;
		}

		add_partition( attrib_loc, comp_len=3, stride=0, offset=0, is_instance=false ){
			gl.ctx.enableVertexAttribArray( attrib_loc );
			gl.ctx.vertexAttribPointer( attrib_loc, comp_len, gl.ctx.FLOAT, false, stride, offset );

			if( is_instance ) gl.ctx.vertexAttribDivisor( attrib_loc, 1 );
			return this;
		}

		/* {
			comp_len 	: How Many Floats Make the Stride
			stride_len	: IN_BYTES
			partition	: [
				{ name, comp_len:x, offset:IN_BYTES }
			],
		} */
		add_interleaved( buf, attrib_loc_ary, is_instance=false ){
			gl.ctx.bindBuffer( buf.type, buf.ref );

			let i_info = buf.interleaved,
				attr_loc, i, p;

			for( i=0; i < i_info.partition.length; i++ ){
				attr_loc 	= attrib_loc_ary[ i ];
				p			= i_info.partition[ i ];
				gl.ctx.enableVertexAttribArray( attr_loc );
				gl.ctx.vertexAttribPointer( attr_loc, p.comp_len, gl.ctx.FLOAT, false, i_info.stride_len, p.offset );

				if( is_instance ) gl.ctx.vertexAttribDivisor( attr_loc, 1 );
			}

			return this;
		}


	///////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////
		static unbind(){ gl.ctx.bindVertexArray( null ); return this; }

		bind(){ gl.ctx.bindVertexArray( this.ref ); return this; }
		unbind(){ gl.ctx.bindVertexArray( null ); return this; }

		dispose(){ console.log("VAO DISPOSE TODO"); }
}

//######################################################################
export default Vao;