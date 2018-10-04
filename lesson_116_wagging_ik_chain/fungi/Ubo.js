import gl		from "./gl.js";
import Fungi	from "./Fungi.js";

//http://www.geeks3d.com/20140704/gpu-buffers-introduction-to-opengl-3-1-uniform-buffers-objects/

/*
TODO:
	Create a new UBO that stores a binary array of whats on the GPU, then have the object update the local array
	then send the whole thing up. This allows for a single GPU call instead of several.
*/

class Ubo{
	constructor(bName, bPoint){
		this.name	= bName;
		this.bindPoint	= bPoint;
		this.items = new Map();
		this.bufferID	= null;
		this.bufferSize	= 0;
		this.byteBuffer = null;
	}

	//========================================================================
	bind(){ gl.ctx.bindBuffer(gl.ctx.UNIFORM_BUFFER, this.bufferID); return this; }
	unbind(){ gl.ctx.bindBuffer(gl.ctx.UNIFORM_BUFFER, null); return this; }

	finalize(){
		//Finish Setting up UBO
		this.bufferSize	= Ubo.calculate( this.items );			// Calc all the Offsets and Lengths
		this.bufferID 	= gl.ctx.createBuffer();				// Create Standard Buffer
		this.byteBuffer	= new ByteBuffer( this.bufferSize );

		//GPU Buffer
		gl.ctx.bindBuffer(gl.ctx.UNIFORM_BUFFER, this.bufferID);						// Bind it for work
		gl.ctx.bufferData(gl.ctx.UNIFORM_BUFFER, this.bufferSize, gl.ctx.DYNAMIC_DRAW);	// Allocate Space in empty buf
		gl.ctx.bindBuffer(gl.ctx.UNIFORM_BUFFER, null);									// Unbind
		gl.ctx.bindBufferBase(gl.ctx.UNIFORM_BUFFER, this.bindPoint, this.bufferID);	// Save Buffer to Uniform Buffer Bind point

		//Save to Resources
		Fungi.ubos.set(this.name, this);
		return this;
	}

	//========================================================================
	addItem(iName, iType, aryLen = 0){ 
		this.items.set(iName, {type:iType, offset: 0, blockSize: 0, dataSize: 0, aryLen });
		return this;
	}

	addItems(iName, iType){
		for(var i=0; i < arguments.length;i+=2){
			this.items.set(arguments[i], {type:arguments[i+1], offset: 0, blockSize: 0, dataSize: 0 });
		}
		return this;
	}

	/*
	updateItem(name, data){ 
		gl.ctx.bufferSubData(gl.ctx.UNIFORM_BUFFER, this.items.get(name).offset, data, 0, null);
		return this;
	}
	*/

	updateItem(name, data){
		var itm = this.items.get(name);

		switch(itm.type){
			case "float": case "mat3": case "mat4": case "vec2": case "vec3": case "vec4": case "mat2x4":
				if(name == "scale"){
					//console.log("xx", data, itm);
				}
				this.byteBuffer.setFloat( itm.offset, data );
				break;

			case "int":
				this.byteBuffer.setInt32( itm.offset, data );
				break;

			default: console.log("Ubo Type unknown for item ",name); break;
		}

		return this;
	}

	updateGL(){
		gl.ctx.bindBuffer(gl.ctx.UNIFORM_BUFFER, this.bufferID); 
		gl.ctx.bufferSubData(gl.ctx.UNIFORM_BUFFER, 0, 
			this.byteBuffer._bView, 0, 
			this.byteBuffer._bAry.byteLength
		);
		gl.ctx.bindBuffer(gl.ctx.UNIFORM_BUFFER, null);

		return this;
	}

	//========================================================================

	//Size of types and alignment for calculating offset positions
	static getSize(type){ 
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

	static calculate(m){
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

		return offset;
	}

	static debugVisualize(ubo){
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

	static testShader(shader, ubo, doBinding = false){
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


class ByteBuffer{
	constructor(size){
		this._bAry	= new ArrayBuffer(size);
		this._bView	= new DataView(this._bAry);
	}

	//===========================================================
	//Misc
	get size(){ return this._bAry.byteLength; }

	//===========================================================
	//Handle Floats
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


	//===========================================================
	//Handle Floats
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

export default Ubo;