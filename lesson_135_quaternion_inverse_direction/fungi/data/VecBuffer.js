class VecBuffer{
	constructor( capacity=3, comp_len=3, use_all=false ){
		this.comp_len		= comp_len;
		this.capacity 		= capacity;
		this.buffer			= new Float32Array( capacity * comp_len );
		this.len 			= ( !use_all )? 0 : capacity;
		this.auto_expand	= 0;
	}

	// #region manage data
	push(){
		// Check of push will go over compacity.
		if( this.len + arguments.length > this.capacity ){
			if( !this.auto_expand ){
				console.log("VecBuffer is at capacity");
				return this;
			}else this.expand_by( this.auto_expand );
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		let offset = this.len * this.comp_len;
		for( let i=0; i < arguments.length; i++ ){
			if( arguments[ i ].length != this.comp_len ){
				console.log( "VecBuffer Push: Array's Len does not equal component len.");
				continue;
			}

			this.buffer.set( arguments[ i ], offset );	// Copy Array To Buffer
			offset += arguments[ i ].length;			// Move Offset to Next
			this.len++;									// Increment Vec Length
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		return this;
	}

	set( i, v ){
		if( v.length != this.comp_len ){
			console.log( "VecBuffer Set: Array's Len does not equal component len.");
			return this;
		}

		i *= this.comp_len;
		this.buffer.set( v, i );
		return this;
	}

	set_raw( i, ...arg ){
		if( arg.length != this.comp_len ){
			console.log( "VecBuffer SetRaw: Array's Len does not equal component len.");
			return this;
		}
		i *= this.comp_len;
		this.buffer.set( arg, i );
		return this;
	}

	expand_by( size, use_all=false ){
		let capacity	= this.capacity + size,
			fb			= new Float32Array( capacity * this.comp_len );

		fb.set( this.buffer );

		this.capacity	= capacity;
		this.buffer		= fb;

		if( use_all ) this.len = this.capacity;
		return this;
	}
	// #endregion ////////////////////////////////////////////////////////////////////

	// #region Getters
	get byte_capacity(){ return this.buffer.byteLength; }	// Get the Capacity Length in Bytes
	get byte_len(){ return this.len * this.comp_len * 4; }
	get buf_len(){ return this.len * this.comp_len; }
	get buf_capacity(){ return this.buffer.length; }
	// #endregion ////////////////////////////////////////////////////////////////////
}



/*
class VecBuffer{
	constructor( comp_len, capacity  ){
		this.comp_len	= comp_len;
		this.capacity 	= capacity;
		this.len 		= 0;
		this.buffer		= null;
	}

	static from_buf( buf, comp_len=3 ){
		let vb = new VecBuffer( comp_len, buf.length / comp_len );
		vb.buffer	= buf;
		vb.len 		= vb.capacity;
		return vb;
	}

	static mk( capacity=3, comp_len=3, use_all ){
		let vb = new VecBuffer( comp_len, capacity );
		vb.buffer	= new Float32Array( capacity * comp_len );
		vb.len 		= ( !use_all )? 0 : capacity;
		return vb;
	}

	///////////////////////////////////////////////////////////////////
	// Buffer Data Management
	///////////////////////////////////////////////////////////////////

		push(){
			let t_len = this.len + arguments.length;
			if( t_len > this.capacity ){ console.log("VecBuffer is at capacity"); return this; }

			let j, i, ii, offset = this.len * this.comp_len;
			for( i=0; i < arguments.length; i++ ){
				ii = offset + i * this.comp_len;

				for( j=0; j < this.comp_len; j++ ) this.buffer[ ii+j ] = arguments[ i ][ j ];
			}

			this.len = t_len;
			return this;
		}


		rm( i ){
			if( i >= this.len ){ console.log( "Can not remove, Index is greater then length"); return this; }

			//If removing last one, Just change the length
			let b_idx = this.len - 1;
			if( i == b_idx ){ this.len--; return this; }

			let a_idx				= i * this.comp_len;	// Index of Vec to Remove
			b_idx					*= this.comp_len;		// Index of Final Vec.
			this.buffer[ a_idx ]	= this.buffer[ b_idx ];
			this.buffer[ a_idx+1 ]	= this.buffer[ b_idx+1 ];
			this.buffer[ a_idx+2 ]	= this.buffer[ b_idx+2 ];
			this.len--;
			
			console.error("VecArray.rm is not implemented");
			return this;
		}

		expand_by( size, use_all=false ){
			let capacity	= this.capacity + size,
				fb			= new Float32Array( capacity * this.comp_len ),
				i;

			for( i=0; i < this.buffer.length; i++ ) fb[ i ] = this.buffer[ i ];

			this.capacity	= capacity;
			this.buffer		= fb;

			if( use_all ) this.len = this.capacity;
			return this;
		}


	///////////////////////////////////////////////////////////////////
	// Getters / Setters
	///////////////////////////////////////////////////////////////////
		get byte_capacity(){ return this.buffer.byteLength; }	// Total Bytes Available
		get byte_len(){ return this.len * this.comp_len * 4; }	// Length of Bytes in Use
		get buf_len(){ return this.len * this.comp_len; }
		get buf_capacity(){ return this.buffer.length; }

		set( i, v ){
			i *= this.comp_len;
			for( let j=0; j < this.comp_len; j++ ){ this.buffer[ i+j ] = v[ j ]; }
			return this;
		}

		set_raw( i ){
			i *= this.comp_len;
			for( let j=1; j < arguments.length; j++ ) this.buffer[ i++ ] = arguments[ j ];
			return this;
		}
}
*/

export default VecBuffer;