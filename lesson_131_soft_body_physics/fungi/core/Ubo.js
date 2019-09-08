import gl		from "./gl.js";
import Cache	from "./Cache.js";

// [[ NOTES ]]
// http://www.geeks3d.com/20140704/gpu-buffers-introduction-to-opengl-3-1-uniform-buffers-objects/

//##################################################################
class Ubo{
	constructor( bName = "undefined_ubo" ){
		this.name		= bName;
		this.items 		= new Map();
		this.bindPoint	= null; 		// Need this to bind UBO to shaders later on.
		this.bufferID	= null;
		this.bufferSize	= 0;
		this.byteBuffer = null;
	}


	///////////////////////////////////////////////////////
	// METHODS
	///////////////////////////////////////////////////////

		bind( isOn = true ){ gl.ctx.bindBuffer(gl.ctx.UNIFORM_BUFFER, (isOn)? this.bufferID : null); return this; }

		setItem( name, data ){
			var itm = this.items.get(name);

			switch(itm.type){
				case "float": case "mat3": case "mat4": case "vec2": case "vec3": case "vec4": case "mat2x4":
					let ary = ( Array.isArray( data ) && !(data instanceof Float32Array) )? 
						new Float32Array( data ) : data;

					//console.log( name, ary , Array.isArray( data ) );
					this.byteBuffer.setFloat( itm.offset, ary );
					break;

				case "int":
					this.byteBuffer.setInt32( itm.offset, data );
					break;

				default: console.log("Ubo Type unknown for item ",name); break;
			}

			return this;
		}

		update(){
			gl.ctx.bindBuffer(gl.ctx.UNIFORM_BUFFER, this.bufferID); 
			gl.ctx.bufferSubData(gl.ctx.UNIFORM_BUFFER, 0, 
				this.byteBuffer._bView, 0, 
				this.byteBuffer._bAry.byteLength
			);
			gl.ctx.bindBuffer(gl.ctx.UNIFORM_BUFFER, null);

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
		static build( name, bindPoint, items ){
			let ubo = new Ubo( name );

			for(let i=0; i < items.length; i+=2){
				Ubo.addItem( ubo, items[i], items[i+1] );
			}

			Ubo.finalize( ubo, bindPoint );
			return ubo;
		}

		static finalize( ubo, bindPoint ){
			// Finish Setting up UBO
			ubo.bufferSize	= Ubo.calculate( ubo.items );			// Calc all the Offsets and Lengths
			ubo.bufferID 	= gl.ctx.createBuffer();				// Create Standard Buffer
			ubo.byteBuffer	= new ByteBuffer( ubo.bufferSize );
			ubo.bindPoint	= bindPoint;

			// GPU Buffer
			gl.ctx.bindBuffer(gl.ctx.UNIFORM_BUFFER, ubo.bufferID);							// Bind it for work
			gl.ctx.bufferData(gl.ctx.UNIFORM_BUFFER, ubo.bufferSize, gl.ctx.DYNAMIC_DRAW);	// Allocate Space in empty buf
			gl.ctx.bindBuffer(gl.ctx.UNIFORM_BUFFER, null);									// Unbind
			gl.ctx.bindBufferBase(gl.ctx.UNIFORM_BUFFER, bindPoint, ubo.bufferID);			// Save Buffer to Uniform Buffer Bind point

			Cache.ubos.set( ubo.name, ubo );
			return Ubo;
		}

		static addItem(ubo, iName, iType, aryLen = 0){ 
			ubo.items.set( iName, {type:iType, offset: 0, blockSize: 0, dataSize: 0, aryLen } );
			return Ubo;
		}


	///////////////////////////////////////////////////////
	// STATIC SUPPORT AND DEBUG FUNCTION
	///////////////////////////////////////////////////////
		//Size of types and alignment for calculating offset positions
		static getSize( type ){ 
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
				size,				//Data Size of the current type
				prevItem	= null,
				key,itm, i;

			for( [key,itm] of m ){
				//.....................................
				// When dealing with arrays, Each element takes up 16 bytes regardless of type, but if the type
				// is a factor of 16, then that values times array length will work, in case of matrices
				size = Ubo.getSize(itm.type);
				if(itm.aryLen > 0){
					for(i=0; i < 2; i++){
						if(size[i] < 16)	size[i] = itm.aryLen * 16;
						else				size[i] *= itm.aryLen;
					}
				}

				//.....................................
				// Check if there is enough block space, if not 
				// give previous item the remainder block space
				// If the block space is full and the size is equal too or greater, dont give back to previous
				if(blockSpace >= size[0]) blockSpace -= size[1];
				else if(blockSpace > 0 && prevItem && !(blockSpace == 16 && size[1] >= 16) ){
					prevItem.blockSize += blockSpace;
					offset 		+= blockSpace;
					blockSpace	= 16 - size[1];
				}

				//.....................................
				// Save data about the item
				itm.offset		= offset;
				itm.blockSize	= size[1];
				itm.dataSize	= size[1];
				
				//.....................................
				// Cleanup
				offset			+= size[1];
				prevItem		= itm;

				if(blockSpace <= 0) blockSpace = 16; //Reset
			}
			
			let padding = offset % 16;
			if( padding != 0) offset += 16 - padding;

			return offset;
		}

		static debugVisualize( ubo ){
			var str		= "",
				chunk 	= 0,
				tchunk 	= 0,
				i		= 0,
				x, key, itm;

			console.log("======================================vDEBUG");
			console.log("Buffer Size : %d", ubo.bufferSize);
			for( [key,itm] of ubo.items ){
				console.log("Item %d : %s",i, key, itm);
				chunk = itm.blockSize / 4;
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

		static testShader( shader, ubo, doBinding = false ){
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

		static outputLimits(){
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
		this._bAry	= new ArrayBuffer(size);
		this._bView	= new DataView(this._bAry);
	}

	///////////////////////////////////////////////////////
	// GETTERS / SETTERS
	///////////////////////////////////////////////////////
		get size(){ return this._bAry.byteLength; }


	///////////////////////////////////////////////////////
	// HANDLE FLOATS
	///////////////////////////////////////////////////////
		getFloat( bPos = 0 ){ return this._bView.getFloat32( bPos ); }
		setFloat( bPos = 0, n, isLittleEndian = true){
			if(n instanceof Float32Array){
				//Test ifthe data will not overflow the buffer
				let bMax = n.length * 4 + bPos;
				if(bMax > this._bAry.byteLength){
					console.log("FloatArray to large for byte buffer at pos ", bPos);
					return this;
				}

				//Copy the Data one Float at a Time
				let f;
				for(f of n){
					this._bView.setFloat32( bPos, f, isLittleEndian ); //Need Little Endian to work in WebGL, Big is default which doesnt work.
					bPos += 4;							
				}
			}else this._bView.setFloat32( bPos, n, isLittleEndian );

			return this;
		}


	///////////////////////////////////////////////////////
	// HANDLE INT32
	///////////////////////////////////////////////////////
		getInt32( bPos = 0 ){ return this._bView.getInt32( bPos ); }
		setInt32( bPos = 0, n, isLittleEndian = true){
			if(n instanceof Int32Array){
				//Test ifthe data will not overflow the buffer
				let bMax = n.length * 4 + bPos;
				if(bMax > this._bAry.byteLength){
					console.log("Int32Array to large for byte buffer at pos ", bPos);
					return this;
				}

				//Copy the Data one Int at a Time
				let f;
				for(f of n){
					this._bView.setInt32( bPos, f, isLittleEndian ); //Need Little Endian to work in WebGL, Big is default which doesnt work.
					bPos += 4;							
				}
			}else this._bView.setInt32( bPos, n, isLittleEndian );

			return this;
		}
}


//##################################################################
export default Ubo;
export { ByteBuffer };
