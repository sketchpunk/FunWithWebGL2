import gl		from "./gl.js";
import Fungi	from "./Fungi.js";

//http://www.geeks3d.com/20140704/gpu-buffers-introduction-to-opengl-3-1-uniform-buffers-objects/

class Ubo{
	constructor(bName, bPoint){
		this.name	= bName;
		this.bindPoint	= bPoint;
		this.items = new Map();
		this.bufferID	= null;
		this.bufferSize	= 0;
	}

	bind(){ gl.ctx.bindBuffer(gl.ctx.UNIFORM_BUFFER, this.bufferID); return this; }
	unbind(){ gl.ctx.bindBuffer(gl.ctx.UNIFORM_BUFFER, null); return this; }

	finalize(unbind = true){
		this.bufferSize	= Ubo.calculate(this.items);	// Calc all the Offsets and Lengths
		this.bufferID 	= gl.ctx.createBuffer();		// Create Standard Buffer
		
		gl.ctx.bindBuffer(gl.ctx.UNIFORM_BUFFER, this.bufferID);						// Bind it for work
		gl.ctx.bufferData(gl.ctx.UNIFORM_BUFFER, this.bufferSize, gl.ctx.DYNAMIC_DRAW);	// Allocate Space in empty buf
		if(unbind) gl.ctx.bindBuffer(gl.ctx.UNIFORM_BUFFER, null);						// Unbind
		gl.ctx.bindBufferBase(gl.ctx.UNIFORM_BUFFER, this.bindPoint, this.bufferID);	// Save Buffer to Uniform Buffer Bind point

		Fungi.ubos.set(this.name, this);
		return this;
	}

	addItem(iName, iType){ 
		this.items.set(iName, {type:iType, offset: 0, chunkLen: 0, dataLen: 0 });
		return this;
	}

	updateItem(name, data){ 
		gl.ctx.bufferSubData(gl.ctx.UNIFORM_BUFFER, this.items.get(name).offset, data, 0, null);
		return this;
	}

	
	//Size of types and alignment for calculating offset positions
	static getSize(type){ 
		switch(type){ //[Alignment,Size]
			case "float": case "int": case "b": return [4,4];
			case "mat4": return [64,64]; //16*4
			case "mat3": return [48,48]; //16*3
			case "vec2": return [8,8];
			case "vec3": return [16,12]; //Special Case
			case "vec4": return [16,16];
			default: return [0,0];
		}
	}

	static calculate(m){
		var chunk	= 16,	//Data size in Bytes, UBO using layout std140 needs to build out the struct in chunks of 16 bytes.
			tsize 	= 0,	//Temp Size, How much of the chunk is available after removing the data size from it
			offset	= 0,	//Offset in the buffer allocation
			size,			//Data Size of the current type
			key,itm, prevItm = null;
		
		for( [key,itm] of m){
			//When dealing with arrays, Each element takes up 16 bytes regardless of type.
			if(!itm.arylen || itm.arylen == 0) size = Ubo.getSize(itm.type);
			else size = [itm.arylen * 16, itm.arylen * 16];

			tsize = chunk - size[0];	//How much of the chunk exists after taking the size of the data.

			//Chunk has been overdrawn when it already has some data resurved for it.
			if(tsize < 0 && chunk < 16){
				offset += chunk;						//Add Remaining Chunk to offset...
				if(i > 0) prevItm.chunkLen += chunk;	//So the remaining chunk can be used by the last variable
				chunk = 16;								//Reset Chunk
			}else if(tsize < 0 && chunk == 16){
				//Do nothing incase data length is >= to unused chunk size.
				//Do not want to change the chunk size at all when this happens.
			}else if(tsize == 0){ //If evenly closes out the chunk, reset
				
				if(itm.type == "vec3" && chunk == 16) chunk -= size[1];	//If Vec3 is the first var in the chunk, subtract size since size and alignment is different.
				else chunk = 16;

			}else chunk -= size[1];	//Chunk isn't filled, just remove a piece

			//Add some data of how the chunk will exist in the buffer.
			itm.offset		= offset;
			itm.chunkLen	= size[1];
			itm.dataLen		= size[1];

			offset	+= size[1];
			prevItm	= itm;
		}

		//Check if the final offset is divisiable by 16, if not add remaining chunk space to last element.
		//if(offset % 16 != 0){
			//ary[ary.length-1].chunkLen += 16 - offset % 16;
			//offset += 16 - offset % 16;
		//}
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
			console.log("Item %d : %s",i, key);
			chunk = itm.chunkLen / 4;
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

export default Ubo;