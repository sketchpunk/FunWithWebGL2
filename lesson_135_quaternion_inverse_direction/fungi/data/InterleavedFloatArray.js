/*
	// TEST
	let sf_buf = new InterleavedFloatArray();
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
class InterleavedFloatArray{
	constructor(){
		this.buffer 		= null;			// Array Object that will hold the raw aata.
		this.capacity 		= 0;			// Total Possible Elements (Note Bytes)
		this.len			= 0;			// Count of Elements ( Total set of stride components )
		this.stride_len 	= 0; 			// Stride Length in Float Count, not Bytes
		this.vars 			= new Array();	// Definition of Interleaved Data 
		this.map 			= {};			// Map The Names to the Array Index of the Vars

		this.auto_expand	= 0;			
	}


	///////////////////////////////////////////////////////////////////
	// 
	///////////////////////////////////////////////////////////////////
	get byte_capacity(){ return this.buffer.byteLength; }	// Get the Capacity Length in Bytes
	get stride_byte_len(){ return this.stride_len * 4; }	// Get the Stride Length in Bytes
	get byte_len(){ return this.len * this.stride_len * 4; }
	var_byte_offset( v_name ){ return this.vars[ this.map[ v_name ] ].offset * 4; } // Get Byte Offset of specific variable
	var_comp_len( v_name ){ return this.vars[ this.map[ v_name ] ].len; }

	get_stride_info(){
		let i, out = {
			comp_len 	: this.stride_len,
			stride_len	: this.stride_len * 4,
			partition	: [],
		};

		for( i of this.vars ){
			out.partition.push( { name:i.name, comp_len: i.len, offset: i.offset * 4 } );
		}

		return out;
	}

	///////////////////////////////////////////////////////////////////
	// 
	///////////////////////////////////////////////////////////////////
		reset(){ this.len = 0; return this; }

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

		expand_by( size, use_all=false ){
			let capacity	= this.capacity + size,
				fb			= new Float32Array( capacity * this.stride_len );

			if( this.buffer ){
				for( let i=0; i < this.buffer.length; i++ ) fb[ i ] = this.buffer[ i ];
			}

			this.capacity	= capacity;
			this.buffer		= fb;

			if( use_all ) this.len = this.capacity;
			return this;
		}


	///////////////////////////////////////////////////////////////////
	// 
	///////////////////////////////////////////////////////////////////
		// Set a specific var at a specific element index
		set_var( idx, v_name, data ){
			let vr = this.vars[ this.map[ v_name ] ];

			idx = (idx * this.stride_len) + vr.offset;

			if( vr.len == 1 )	this.buffer[ idx ] = data;
			else				this.buffer.set( data, idx );

			//for( let i=0; i < vr.len; i++ ) this.buffer[ idx + i ] = data[ i ];
			//}

			return this;
		}

		set( idx ){
			let i, v;
			idx *= this.stride_len;

			for( i=1; i < arguments.length; i++ ){
				v = this.vars[ i-1 ];

				if( v.len == 1 ) 	this.buffer[ idx + v.offset ] = arguments[ i ];
				else				this.buffer.set( arguments[ i ], idx + v.offset );
			}

			return this;
		}

		set_all(){
			// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Validation
			let v, i, arg_len = arguments.length
			if( arg_len != this.vars.length ){ console.error( "set_all argument length mismatch for var length" ); return null; }

			// Make sure all the arguments are of the right size.
			for( i=0; i < arg_len; i++ ){
				v = this.vars[ i ];
				if( v.len > 1 && arguments[ i ].length != v.len ){ console.error( "Variable len mismatch for ", v.name ); return null; }
			}
			
			// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let ii, j;
			for( i=0; i < this.capacity; i++ ){
				ii = i * this.stride_len;

				for( j=0; j < arg_len; j++ ){
					v = this.vars[ j ];

					if( v.len == 1 ) 	this.buffer[ ii + v.offset ] = a;
					else				this.buffer.set( arguments[ j ], ii + v.offset );
				}
			}

			return this;
		}

		push(){
			// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Validation
			if( arguments.length != this.vars.length ){ console.error( "push argument length mismatch for var length" ); return null; }

			if( this.len >= this.capacity ){ 
				if( this.auto_expand == 0 ){
					console.error( "InterleavedFloatArray is at capacity" );
					return null;
				}else this.expand_by( this.auto_expand );
			}

			// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let i, v, idx = this.len, offset = idx * this.stride_len;

			for( i=0; i < arguments.length; i++ ){
				v = this.vars[ i ];

				if( v.len > 1 && arguments[ i ].length != v.len ){ console.error( "Variable len mismatch for ", v.name ); return null; }

				if( v.len == 1 )	this.buffer[ offset + v.offset ] = arguments[ i ];
				else				this.buffer.set( arguments[ i ], offset + v.offset );
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

export default InterleavedFloatArray;