import gl from "../gl.js";

class DynamicBuffer{
	constructor(){
		this.GLArrayPtr			= null; 				//Pointer to special array types, like Float32Array
		this.GLBufferPtr		= null;					//GL Buffer Pointer
		this.GLBufferType		= gl.ctx.ARRAY_BUFFER;	//GL Buffer Type
		this.ComponentLen		= 3;					//How many Array Elements needed to make on item, ie 3 floats = Vertex
		this.BufByteSize		= 0;					//How big is the buffer in bytes
		this.BufByteSizeUsed	= 0;					//How much data was pushed to the GPU.
		this.data				= [];					//Raw Data
	}

	getSize(){ return this.BuffByteSize; }
	getComponentCnt(){ return this.BufByteSizeUsed / this.GLArrayPtr.BYTES_PER_ELEMENT / this.ComponentLen; } //ex: how many verts in the array. tFloats / 3F_Vert
	setBuffer(v){ this.GLBufferPtr = v; return this; }

	setup(bufPtr,bufType,aryType,comLen,startSize){
		this.GLBufferPtr	= bufPtr;
		this.GLBufferType	= bufType;
		this.GLArrayPtr		= aryType;
		this.ComponentLen	= comLen;
		this.BufByteSize	= aryType.BYTES_PER_ELEMENT * comLen * startSize;

		return this;
	}

	pushToGPU(newData = null){
		var finalData = new this.GLArrayPtr( (newData != null)? newData : this.data );
		var pushSize = finalData.length * this.GLArrayPtr.BYTES_PER_ELEMENT;	//How many bytes to push to gpu.

		gl.ctx.bindBuffer(this.GLBufferType,this.GLBufferPtr);						//Activate Buffer

		//If data being push fits the existing buffer, send it up
		if(pushSize <= this.BufByteSize){
			gl.ctx.bufferSubData(this.GLBufferType, 0, finalData, 0, null);

		//if not, we need to wipe out the data and resize the buffer with the new set of data.
		}else{
			this.BufByteSize = pushSize;

			//if(this.BufByteSizeUsed > 0) gl.ctx.bufferData(this.GLBufferType, null, gl.ctx.DYNAMIC_DRAW); //Clean up previus data

			gl.ctx.bufferData(this.GLBufferType, finalData, gl.ctx.DYNAMIC_DRAW);
		}

		gl.ctx.bindBuffer(this.GLBufferType,null);		//unbind buffer
		this.BufByteSizeUsed = pushSize;//finalData.length * this.GLArrayPtr.BYTES_PER_ELEMENT;	//save cnt so we can delete the buffer later on resize if need be.
	}
}

DynamicBuffer.newFloat = function(bufPtr,comLen,startSize){	return new DynamicBuffer().setup(bufPtr,gl.ctx.ARRAY_BUFFER,Float32Array,comLen,startSize); }
DynamicBuffer.newElement = function(bufPtr,startSize){		return new DynamicBuffer().setup(bufPtr,gl.ctx.ELEMENT_ARRAY_BUFFER,Uint16Array,1,startSize); }

export default DynamicBuffer;