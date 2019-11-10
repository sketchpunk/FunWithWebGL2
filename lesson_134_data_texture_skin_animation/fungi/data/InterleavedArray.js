/*
	// TEST
	let sf_buf = new InterleavedArray();
	sf_buf
		.add_var( "pos", 3 )
		.add_var( "size", 1 )
		.add_var( "color", 3 )
		.add_var( "shape", 1 )
		.expand_by( 3 );
	sf_buf.push( [1,2,3], 5, [0,0,0], 0 );
	sf_buf.push( [4,5,6], 6, [0,0,0], 0 );
	sf_buf.push( [7,8,9], 7, [0,0,0], 0 );
	sf_buf.set( 1, "size", 100 );
	sf_buf.set( 2, "pos", [300,200,100] );
*/
class InterleavedArray{
	constructor(){
		this.capacity		= 0;			// Total Possible Elements (Note Bytes)
		this.buffer			= null;			// Array Object that will hold the raw aata.
		this.len 			= 0;			// Count of Elements ( Total set of stride components )
		this.stride_len		= 0;			// Stride Length in Float Count (Not bytes)
		this.vars			= new Array();	// Definition of Interleaved Data
		this.map 			= {};			// Map The Names to the Array Index of the Vars

		this.auto_expand	= 0;			// When at compacity, how many elements to expand.
	}

	get byte_capacity(){ return this.buffer.byteLength; }	// Get the Capacity Length in Bytes
	get stride_byte_len(){ return this.stride_len * 4; }	// Get the Stride Length in Bytes
	get byte_len(){ return this.len * this.stride_len * 4; }
	var_byte_offset( v_name ){ return this.vars[ this.map[ v_name ] ].offset * 4; } // Get Byte Offset of specific variable

	///////////////////////////////////////////////////////////////////
	// 
	///////////////////////////////////////////////////////////////////
		add_var( name, float_len ){
			this.map[ name ] = this.vars.length;
			this.vars.push({
				name 	: name,
				len		: float_len,
				offset	: this.stride_len,
			});
			this.stride_len += float_len;
			return this;
		}

		expand_by( size ){
			let capacity	= this.capacity + size,
				fb			= new Float32Array( capacity * this.stride_len );

			if( this.buffer ){
				let i;
				for( i=0; i < this.buffer.length; i++ ) fb[ i ] = this.buffer[ i ];
			}

			this.capacity	= capacity;
			this.buffer		= fb;
			return this;
		}

		set_expand( n ){ this.auto_expand = n; return this; }

		reset(){ this.len = 0; return this; }

	///////////////////////////////////////////////////////////////////
	// 
	///////////////////////////////////////////////////////////////////
		// Set a specific var at a specific element index
		set( idx, v_name, data ){
			let vr = this.vars[ this.map[ v_name ] ];

			idx = (idx * this.stride_len) + vr.offset;

			if( vr.len == 1 ) this.buffer[ idx ] = data;
			else{
				let i;
				for( i=0; i < vr.len; i++ ) this.buffer[ idx + i ] = data[ i ];
			}

			return this;
		}

		push(){
			// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Validation
			if( arguments.length != this.vars.length ){ console.error( "push argument length mismatch for stride buffer" ); return this; }
			
			if( this.len >= this.capacity ){
				if( this.auto_expand == 0 ){
					console.error( "InterleavedArray is at capacity" ); 
					return this;
				}else this.expand_by( this.auto_expand );
			}

			// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let j, i, a, v, idx = this.len, offset = idx * this.stride_len;

			for( i=0; i < arguments.length; i++ ){
				a = arguments[ i ];
				v = this.vars[ i ];

				if( v.len > 1 && a.length != v.len ){ console.error( "Variable len mismatch for ", v.name ); return this; }

				if( v.len == 1 ){
					this.buffer[ offset + v.offset ] = a;
				}else{
					for( j=0; j < v.len; j++ ) this.buffer[ offset + v.offset + j ] = a[ j ];
				}
			}

			this.len++;
			return idx;
		}

		rm( i ){
			/*
			if( i >= this.len ){ console.log( "Can not remove, Index is greater then length"); return this; }

			//If removing last one, Just change the length
			let b_idx = this.len - 1;
			if( i == b_idx ){ this.len--; return this; }

			let a_idx				= i * B_LEN;	// Index of Vec to Remove
			b_idx					*= B_LEN;		// Index of Final Vec.
			this.buffer[ a_idx ]	= this.buffer[ b_idx ];
			this.buffer[ a_idx+1 ]	= this.buffer[ b_idx+1 ];
			this.buffer[ a_idx+2 ]	= this.buffer[ b_idx+2 ];
			this.len--;
			*/
		
			return this;
		}
}

export default InterleavedArray;