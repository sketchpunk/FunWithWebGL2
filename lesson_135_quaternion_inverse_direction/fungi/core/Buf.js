import gl from "./gl.js";

class Buf{
	constructor( btype=Buf.ARRAY, is_static=false ){
		this.ref 			= gl.ctx.createBuffer();	// Reference to buffer that will be modified
		this.usage 			= ( is_static )? gl.ctx.STATIC_DRAW : gl.ctx.DYNAMIC_DRAW;
		this.type			= btype;

		this.capacity		= 0;		// Capacity in bytes of the gpu buffer
		this.byte_len		= 0;		// How Many Bytes Currently Posted ot the GPU
		this.interleaved	= null;

		this.stride_len		= 0;
		this.offset 		= 0;
		this.comp_len 		= 1;

		this.data 			= null;
	}

	///////////////////////////////////////////////////////////////
	// 
	///////////////////////////////////////////////////////////////
		bind(){ gl.ctx.bindBuffer( this.type, this.ref ); return this; }
		unbind(){ gl.ctx.bindBuffer( this.type, null ); return this; }

		update( type_ary=null ){
			let b_len = type_ary.byteLength;
			gl.ctx.bindBuffer( this.type, this.ref );
			type_ary = type_ary || this.data;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// if the data size is of capacity on the gpu, can set it up as sub data.
			if( b_len <= this.capacity ) gl.ctx.bufferSubData( this.type, 0, type_ary, 0, null );
			else{
				this.capacity = b_len;
				// if( this.byte_len > 0) gl.ctx.bufferData( this.type, null, gl.ctx.DYNAMIC_DRAW ); // Clean up previus data
				gl.ctx.bufferData( this.type, type_ary, this.usage );
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			gl.ctx.bindBuffer( this.type, null ); // unbind buffer
			this.byte_len = b_len;
		}

		set_interleaved( i_info ){
			this.interleaved	= i_info;
			this.stride_len		= i_info.stride_len;
			this.comp_len 		= i_info.comp_len;
			return this;
		}

	///////////////////////////////////////////////////////////////
	// Initialize Data
	///////////////////////////////////////////////////////////////
		from_data( t_ary ){
			gl.ctx.bufferData( this.type, t_ary, this.usage );
			this.byte_len = this.capacity = t_ary.byteLength;
			return this;
		}

		from_bin( data_view, b_start, b_len ){
			gl.ctx.bufferData( this.type, data_view, this.usage, b_start, b_len );
			this.byte_len = this.capacity = b_len;
			return this;
		}

		from_empty( byte_size ){
			gl.ctx.bufferData( this.type, byte_size, this.usage );
			this.capacity = byte_size;
			return this;
		}

	///////////////////////////////////////////////////////////////
	// Array Buffer
	///////////////////////////////////////////////////////////////
		static new_array( data, comp_len=3, is_static=true, unbind=true ) {
			//TODO MUST CHECK IF ITS A TYPE ARRAY OR ARRAY, help fix stupid mistakes on my part
			//
			let ary	= ( data instanceof Float32Array )? data : new Float32Array( data ),
				b 	= new Buf( Buf.ARRAY, is_static ).bind().from_data( ary );

			b.comp_len = comp_len;
			if( unbind ) b.unbind();
			return b;
		}

		static new_array_bin( data_view, b_start, b_len, comp_len=3, is_static=true, unbind=true ) {
			let b = new Buf( Buf.ARRAY, is_static ).bind().from_bin( data_view, b_start, b_len );
			b.comp_len = comp_len;

			if( unbind ) b.unbind();
			return b;
		}

		static empty_array( byte_cnt, comp_len=3, is_static=true, unbind=true ){
			let b = new Buf( Buf.ARRAY, is_static ).bind().from_empty( byte_cnt );
			b.comp_len = comp_len;

			if( unbind ) b.unbind();
			return b;
		}


	///////////////////////////////////////////////////////////////
	// Element Array Buffer
	///////////////////////////////////////////////////////////////
		static new_element( data, is_static=true, unbind=true ) {
			let ary	= ( data instanceof Uint16Array )? data : new Uint16Array( data ),
				b 	= new Buf( Buf.ELEMENT, is_static ).bind().from_data( ary );
			if( unbind ) b.unbind();
			return b;
		}

		static new_element_bin( data_view, b_start, b_len, is_static=true, unbind=true ){
			let b = new Buf( Buf.ELEMENT, is_static ).bind().from_bin( data_view, b_start, b_len );
			if( unbind ) b.unbind();
			return b;
		}


	///////////////////////////////////////////////////////////////
	//
	///////////////////////////////////////////////////////////////
		static unbind_array(){ gl.ctx.bindBuffer( Buf.ARRAY, null ); return this; }
		static unbind_element(){ gl.ctx.bindBuffer( Buf.ELEMENT, null ); return this; }
		static unbind_uniform(){ gl.ctx.bindBuffer( Buf.UNIFORM, null ); return this; }
}

Buf.ARRAY 	= 34962;
Buf.ELEMENT	= 34963;
Buf.UNIFORM	= 35345;

export default Buf;