import gl		from "./gl.js";
import Cache	from "./Cache.js";

// [[ NOTES ]]
// http://www.geeks3d.com/20140704/gpu-buffers-introduction-to-opengl-3-1-uniform-buffers-objects/

//##################################################################
class Ubo{
	constructor( name = "ubo_000" ){
		this.name		= name;
		this.vars 		= new Map();
		this.bind_pnt	= null; 		// Need this to bind UBO to shaders later on.
		this.buf_ref	= null;
		this.buf_Size	= 0;
		this.byte_buf 	= null;
	}


	///////////////////////////////////////////////////////
	// METHODS
	///////////////////////////////////////////////////////
		unbind(){ gl.ctx.bindBuffer( gl.ctx.UNIFORM_BUFFER, null);  }
		bind(){ gl.ctx.bindBuffer( gl.ctx.UNIFORM_BUFFER, this.buf_ref ); return this; }

		set_var( name, data ){
			let itm = this.vars.get(name);

			switch( itm.type ){
				case "float": case "mat3": case "mat4": case "vec2": case "vec3": case "vec4": case "mat2x4":
					let ary = ( Array.isArray( data ) && !(data instanceof Float32Array) )? 
						new Float32Array( data ) : data;

					this.byte_buf.set_float( itm.offset, ary );
					break;

				case "int":
					this.byte_buf.set_int32( itm.offset, data );
					break;

				default: console.log( "Ubo Type unknown for item ", name ); break;
			}

			return this;
		}

		update(){
			gl.ctx.bindBuffer( gl.ctx.UNIFORM_BUFFER, this.buf_ref ); 
			gl.ctx.bufferSubData( gl.ctx.UNIFORM_BUFFER, 0, 
				this.byte_buf.dv, 0, 
				this.byte_buf.ab.byteLength
			);
			gl.ctx.bindBuffer( gl.ctx.UNIFORM_BUFFER, null );
			return this;
		}

		/*
		updateItemNow(name, data){ 
			gl.ctx.bufferSubData(gl.ctx.UNIFORM_BUFFER, this.items.get(name).offset, data, 0, null);
			return this;
		}
		*/

	///////////////////////////////////////////////////////
	// STATIC BUILDING FUNCTIONS
	///////////////////////////////////////////////////////
		static build( name, bind_pnt, vars ){
			let i, ubo = new Ubo( name );

			for( i of vars ) Ubo.add_var( ubo, i.name, i.type, i.ary_len || 0 );

			Ubo.finalize( ubo, bind_pnt );

			Cache.set_ubo( ubo );
			return ubo;
		}

		static finalize( ubo, bind_pnt ){
			// Finish Setting up UBO
			ubo.buf_size	= Ubo.calculate( ubo.vars );			// Calc all the Offsets and Lengths
			ubo.buf_ref 	= gl.ctx.createBuffer();				// Create Standard Buffer
			ubo.byte_buf	= new ByteBuffer( ubo.buf_size );
			ubo.bind_pnt	= bind_pnt;

			// GPU Buffer
			gl.ctx.bindBuffer( gl.ctx.UNIFORM_BUFFER, ubo.buf_ref );						// Bind it for work
			gl.ctx.bufferData( gl.ctx.UNIFORM_BUFFER, ubo.buf_size, gl.ctx.DYNAMIC_DRAW );	// Allocate Space in empty buf
			gl.ctx.bindBuffer( gl.ctx.UNIFORM_BUFFER, null );								// Unbind
			gl.ctx.bindBufferBase( gl.ctx.UNIFORM_BUFFER, bind_pnt, ubo.buf_ref );			// Save Buffer to Uniform Buffer Bind point

			return Ubo;
		}

		static add_var( ubo, iName, iType, ary_len = 0){ 
			ubo.vars.set( iName, { type:iType, offset: 0, block_size: 0, data_size: 0, ary_len } );
			return Ubo;
		}


	///////////////////////////////////////////////////////
	// STATIC SUPPORT AND DEBUG FUNCTION
	///////////////////////////////////////////////////////
		//Size of types and alignment for calculating offset positions
		static get_size( type ){ 
			switch(type){ //[Alignment,Size]
				case "float": case "int": case "b": return [4,4];
				case "mat2x4":	return [32,32]; //16*2
				case "mat4": 	return [64,64]; //16*4
				case "mat3":	return [48,48]; //16*3
				case "vec2":	return [8,8];
				case "vec3":	return [16,12]; //Special Case
				case "vec4":	return [16,16];
				default:		return [0,0];
			}
		}

		static calculate( m ){
			let blockSpace	= 16,	//Data size in Bytes, UBO using layout std140 needs to build out the struct in blocks of 16 bytes.
				offset		= 0,	//Offset in the buffer allocation
				prevItem	= null,
				size,				//Data Size of the current type
				key, itm, i;

			for( [key,itm] of m ){
				//.....................................
				// When dealing with arrays, Each element takes up 16 bytes regardless of type, but if the type
				// is a factor of 16, then that values times array length will work, in case of matrices
				size = Ubo.get_size( itm.type );
				if( itm.ary_len > 0 ){
					for(i=0; i < 2; i++){
						if( size[i] < 16 )	size[i] =  itm.ary_len * 16;
						else				size[i] *= itm.ary_len;
					}
				}

				//.....................................
				// Check if there is enough block space, if not 
				// give previous item the remainder block space
				// If the block space is full and the size is equal too or greater, dont give back to previous
				if( blockSpace >= size[0] ) blockSpace -= size[1];
				else if( blockSpace > 0 && prevItem && !(blockSpace == 16 && size[1] >= 16) ){
					prevItem.block_size	+= blockSpace;
					offset 				+= blockSpace;
					blockSpace			= 16 - size[1];
				}

				//.....................................
				// Save data about the item
				itm.offset		= offset;
				itm.block_size	= size[1];
				itm.data_size	= size[1];
				
				//.....................................
				// Cleanup
				offset			+= size[1];
				prevItem		= itm;

				if(blockSpace <= 0) blockSpace = 16; //Reset
			}
			
			// Must pad the rest of the buffer to keep things 16Byte Aligned
			// If not, will break on Macs
			let padding = offset % 16;
			if( padding != 0) offset += 16 - padding;

			return offset;
		}

		static debug_visualize( ubo ){
			var str		= "",
				chunk 	= 0,
				tchunk 	= 0,
				i		= 0,
				x, key, itm;

			console.log("======================================vDEBUG");
			console.log("Buffer Size : %d", ubo.buf_size);
			for( [key,itm] of ubo.vars ){
				console.log("Item %d : %s",i, key, itm);
				chunk = itm.block_size / 4;
				for(x = 0; x < chunk; x++){
					str += (x == 0 || x == chunk-1)? "|."+i+"." : "|...";	//Display the index
					tchunk++;
					if(tchunk % 4 == 0) str += "| ~ ";
				}
				i++;
			}

			if(tchunk % 4 != 0) str += "|";
			console.log(str);
		}

		static test_shader( shader, ubo, doBinding = false ){
			if(doBinding) shader.bind();

			console.log("======================================TEST SHADER");	
			
			var blockIdx = gl.ctx.getUniformBlockIndex(shader.program, ubo.name);
			console.log("BlockIndex : %d", blockIdx );

			//Get Size of Uniform Block
			console.log("Data Size : %d",
				gl.ctx.getActiveUniformBlockParameter(shader.program, blockIdx, gl.ctx.UNIFORM_BLOCK_DATA_SIZE));

			console.log("Indice ",
				gl.ctx.getActiveUniformBlockParameter(shader.program, blockIdx, gl.ctx.UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES));

			console.log("Uniforms : %d",
				gl.ctx.getActiveUniformBlockParameter(shader.program, blockIdx, gl.ctx.UNIFORM_BLOCK_ACTIVE_UNIFORMS));

			console.log("Uniform Block Binding : ",
				gl.ctx.getActiveUniformBlockParameter(shader.program, blockIdx, gl.ctx.UNIFORM_BLOCK_BINDING));
			
			if(doBinding) shader.unbind();
		}

		static output_limits(){
			console.log("======================================UboLimits");
			console.log("MAX_UNIFORM_BUFFER_BINDINGS : %d", gl.ctx.getParameter(gl.ctx.MAX_UNIFORM_BUFFER_BINDINGS) );
			console.log("MAX_UNIFORM_BLOCK_SIZE : %d", gl.ctx.getParameter(gl.ctx.MAX_UNIFORM_BLOCK_SIZE) );
			console.log("MAX_VERTEX_UNIFORM_BLOCKS : %d", gl.ctx.getParameter(gl.ctx.MAX_VERTEX_UNIFORM_BLOCKS) );
			console.log("MAX_FRAGMENT_UNIFORM_BLOCKS : %d", gl.ctx.getParameter(gl.ctx.MAX_FRAGMENT_UNIFORM_BLOCKS) );
		}
}


//##################################################################
class ByteBuffer{
	constructor(size){
		this.ab	= new ArrayBuffer( size );
		this.dv	= new DataView( this.ab );
	}

	///////////////////////////////////////////////////////
	// GETTERS / SETTERS
	///////////////////////////////////////////////////////
		get size(){ return this.ab.byteLength; }


	///////////////////////////////////////////////////////
	// HANDLE FLOATS
	///////////////////////////////////////////////////////
		get_float( bPos = 0 ){ return this._bView.getFloat32( bPos ); }
		set_float( bPos = 0, n, isLittleEndian = true){
			if(n instanceof Float32Array){
				//Test ifthe data will not overflow the buffer
				let bMax = n.length * 4 + bPos;
				if(bMax > this.ab.byteLength){
					console.log("FloatArray to large for byte buffer at pos ", bPos);
					return this;
				}

				//Copy the Data one Float at a Time
				let f;
				for(f of n){
					this.dv.setFloat32( bPos, f, isLittleEndian ); //Need Little Endian to work in WebGL, Big is default which doesnt work.
					bPos += 4;							
				}
			}else this.dv.setFloat32( bPos, n, isLittleEndian );

			return this;
		}


	///////////////////////////////////////////////////////
	// HANDLE INT32
	///////////////////////////////////////////////////////
		get_int32( bPos = 0 ){ return this.dv.getInt32( bPos ); }
		set_int32( bPos = 0, n, isLittleEndian = true){
			if(n instanceof Int32Array){
				//Test ifthe data will not overflow the buffer
				let bMax = n.length * 4 + bPos;
				if( bMax > this.ab.byteLength ){
					console.log("Int32Array to large for byte buffer at pos ", bPos);
					return this;
				}

				//Copy the Data one Int at a Time
				let f;
				for(f of n){
					this.dv.setInt32( bPos, f, isLittleEndian ); //Need Little Endian to work in WebGL, Big is default which doesnt work.
					bPos += 4;							
				}
			}else this.dv.setInt32( bPos, n, isLittleEndian );

			return this;
		}
}


//##################################################################
export default Ubo;
export { ByteBuffer };
