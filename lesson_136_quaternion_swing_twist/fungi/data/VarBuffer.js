
class VarBuffer{
	constructor( size ){
		this.$buffer = new ArrayBuffer( size );
		this.$config = new Array();
	}

	static config( ary ){
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Compute Buffer Byte Length and the Offset position for each variable.
		let i, blen, total_len = 0;
		for( i of ary ){
			switch( i.type ){
				case "float": case "int32": case "uint32": i.byte_len = i.size * 4; break;
				case "vec2"		: i.byte_len = 2 * 4;	i.type = "float"; i.size = 2; break;
				case "vec3"		: i.byte_len = 3 * 4;	i.type = "float"; i.size = 3; break;
				case "vec4"		: i.byte_len = 4 * 4;	i.type = "float"; i.size = 4; break;
				case "mat4x4"	: i.byte_len = 16 * 4;	i.type = "float"; i.size = 16; break;
			}
			i.byte_offset	= total_len;
			total_len 		+= i.byte_len;
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		let rtn = new VarBuffer( total_len );

		for( i of ary ){ //console.log( i );
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Create Type Array that will act as pointer to a slice of the Array Buffer.
			let c = { name:i.name, buf:null }; // Hand any information about the variable

			rtn.$config.push( c );
			switch( i.type ){
				case "float"	: c.buf = new Float32Array( rtn.$buffer, i.byte_offset, i.size ); break;
				case "int32"	: c.buf = new Int32Array( rtn.$buffer, i.byte_offset, i.size ); break;
				case "uint32"	: c.buf = new Uint32Array( rtn.$buffer, i.byte_offset, i.size ); break;
			}	

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Dynamically Create fields to access the slices
			if( i.size == 1 ){
				// If a single value, create a special object that will manage get/set into the type array.
				Object.defineProperty( rtn, i.name, {
					get: function(){ return c.buf[0]; },
					set: function(v){ c.buf[0] = v; },
				});
			}else rtn[ c.name ] = c.buf;
		}

		return rtn;
	}
}

export default VarBuffer;