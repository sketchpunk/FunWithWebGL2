class ShaderBuilder{
	constructor(gl,vertShader,fragShader){
		//If the text is small, then its most likely DOM names (very hack) else its actual Source.
		//TODO, Maybe check for new line instead of length, Dom names will never have new lines but source will.
		if(vertShader.length < 20)	this.program = ShaderUtil.domShaderProgram(gl,vertShader,fragShader,true);
		else						this.program = ShaderUtil.createProgramFromText(gl,vertShader,fragShader,true);
		
		if(this.program != null){
			this.gl = gl;
			gl.useProgram(this.program);
			this.mUniformList = [];		//List of Uniforms that have been loaded in. Key=UNIFORM_NAME {loc,type}
			this.mTextureList = [];		//List of texture uniforms, Indexed {loc,tex}

			this.noCulling = false;		//If true disables culling
			this.doBlending = false;	//If true, allows alpha to work.
		}
	}

	//---------------------------------------------------
	// Methods For Shader Prep.
	//---------------------------------------------------
	//Takes in unlimited arguments. Its grouped by two so for example (UniformName,UniformType): "uColors","3fv"
	prepareUniforms(){
		if(arguments.length % 2 != 0 ){ console.log("prepareUniforms needs arguments to be in pairs."); return this; }
		
		var loc = 0;
		for(var i=0; i < arguments.length; i+=2){
			loc = this.gl.getUniformLocation(this.program,arguments[i]);
			if(loc != null) this.mUniformList[arguments[i]] = {loc:loc,type:arguments[i+1]};
		}
		return this;
	}

	prepareUniformBlocks(ubo,blockIndex){
		var ind = 0;
		for(var i=0; i < arguments.length; i+=2){
			//ind = this.gl.getUniformBlockIndex(this.program,arguments[i].blockName); //TODO This function does not return block index, need to pass that value in param
			//console.log("Uniform Block Index",ind,ubo.blockName,ubo.blockPoint);

			this.gl.uniformBlockBinding(this.program, arguments[i+1], arguments[i].blockPoint);
			
			//console.log(this.gl.getActiveUniformBlockParameter(this.program, 0, this.gl.UNIFORM_BLOCK_DATA_SIZE)); //Get Size of Uniform Block
			//console.log(this.gl.getActiveUniformBlockParameter(this.program, 0, this.gl.UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES));
			//console.log(this.gl.getActiveUniformBlockParameter(this.program, 0, this.gl.UNIFORM_BLOCK_ACTIVE_UNIFORMS));
			//console.log(this.gl.getActiveUniformBlockParameter(this.program, 0, this.gl.UNIFORM_BLOCK_BINDING));
		}
		return this;
	}

	//Takes in unlimited arguments. Its grouped by two so for example (UniformName,CacheTextureName): "uMask01","tex001";
	prepareTextures(){
		if(arguments.length % 2 != 0){ console.log("prepareTextures needs arguments to be in pairs."); return this; }
		
		var loc = 0,tex = "";
		for(var i=0; i < arguments.length; i+=2){
			tex = this.gl.mTextureCache[arguments[i+1]];
			if(tex === undefined){ console.log("Texture not found in cache " + arguments[i+1]); continue; }

			loc = this.gl.getUniformLocation(this.program,arguments[i]);
			if(loc != null) this.mTextureList.push({loc:loc,tex:tex});
		}
		return this;
	}

	//---------------------------------------------------
	// Setters Getters
	//---------------------------------------------------
	//Uses a 2 item group argument array. Uniform_Name, Uniform_Value;
	setUniforms(){
		if(arguments.length % 2 != 0){ console.log("setUniforms needs arguments to be in pairs."); return this; }

		var name;
		for(var i=0; i < arguments.length; i+=2){
			name = arguments[i];
			if(this.mUniformList[name] === undefined){ console.log("uniform not found " + name); return this; }

			switch(this.mUniformList[name].type){
				case "2fv":		this.gl.uniform2fv(this.mUniformList[name].loc, new Float32Array(arguments[i+1])); break;
				case "3fv":		this.gl.uniform3fv(this.mUniformList[name].loc, new Float32Array(arguments[i+1])); break;
				case "4fv":		this.gl.uniform4fv(this.mUniformList[name].loc, new Float32Array(arguments[i+1])); break;
				case "mat4":	this.gl.uniformMatrix4fv(this.mUniformList[name].loc,false,arguments[i+1]); break;
				default: console.log("unknown uniform type for " + name); break;
			}
		}

		return this;
	}

	//---------------------------------------------------
	// Methods
	//---------------------------------------------------
	activate(){ this.gl.useProgram(this.program); return this; }
	deactivate(){ this.gl.useProgram(null); return this; }

	//function helps clean up resources when shader is no longer needed.
	dispose(){
		//unbind the program if its currently active
		if(this.gl.getParameter(this.gl.CURRENT_PROGRAM) === this.program) this.gl.useProgram(null);
		this.gl.deleteProgram(this.program);
	}

	preRender(){
		this.gl.useProgram(this.program); //Save a function call and just activate this shader program on preRender

		//If passing in arguments, then lets push that to setUniforms for handling. Make less line needed in the main program by having preRender handle Uniforms
		if(arguments.length > 0) this.setUniforms.apply(this,arguments);

		//..........................................
		//Prepare textures that might be loaded up.
		//TODO, After done rendering need to deactivate the texture slots
		if(this.mTextureList.length > 0){
			var texSlot;
			for(var i=0; i < this.mTextureList.length; i++){
				texSlot = this.gl["TEXTURE" + i];
				this.gl.activeTexture(texSlot);
				this.gl.bindTexture(this.gl.TEXTURE_2D,this.mTextureList[i].tex);
				this.gl.uniform1i(this.mTextureList[i].loc,i);
			}
		}

		return this;
	}

	//Handle rendering a modal
	renderModel(model, doShaderClose){
		this.setUniforms("uMVMatrix",model.transform.getViewMatrix());
		this.gl.bindVertexArray(model.mesh.vao);

		if(model.mesh.noCulling || this.noCulling) this.gl.disable(this.gl.CULL_FACE);
		if(model.mesh.doBlending || this.doBlending) this.gl.enable(this.gl.BLEND);

		if(model.mesh.indexCount) this.gl.drawElements(model.mesh.drawMode, model.mesh.indexCount, gl.UNSIGNED_SHORT, 0); 
		else this.gl.drawArrays(model.mesh.drawMode, 0, model.mesh.vertexCount); 

		//Cleanup
		this.gl.bindVertexArray(null);
		if(model.mesh.noCulling || this.noCulling) this.gl.enable(this.gl.CULL_FACE);
		if(model.mesh.doBlending || this.doBlending) this.gl.disable(this.gl.BLEND);

		if(doShaderClose) this.gl.useProgram(null);

		return this;
	}

	//Handle rendering a modal
	renderModelVR(model,vr){
		this.setUniforms("uMVMatrix",model.transform.getViewMatrix());
		this.gl.bindVertexArray(model.mesh.vao);

		if(model.mesh.noCulling || this.noCulling) this.gl.disable(this.gl.CULL_FACE);
		if(model.mesh.doBlending || this.doBlending) this.gl.enable(this.gl.BLEND);

		//Draw Left Side
		this.gl.viewport(0,0,this.gl.fWidth * 0.5,this.gl.fHeight);
		this.gl.uniformMatrix4fv(this.mUniformList["uPMatrix"].loc, false, vr.fFrameData.leftProjectionMatrix); 
		this.gl.uniformMatrix4fv(this.mUniformList["uCameraMatrix"].loc, false, vr.fGetEyeMatrix(0));

		if(model.mesh.indexCount) this.gl.drawElements(model.mesh.drawMode, model.mesh.indexCount, gl.UNSIGNED_SHORT, 0); 
		else this.gl.drawArrays(model.mesh.drawMode, 0, model.mesh.vertexCount);		

		//Draw Right Side
		gl.viewport(this.gl.fWidth * 0.5, 0,this.gl.fWidth * 0.5, this.gl.fHeight);
		this.gl.uniformMatrix4fv(this.mUniformList["uPMatrix"].loc, false, vr.fFrameData.rightProjectionMatrix); 
		this.gl.uniformMatrix4fv(this.mUniformList["uCameraMatrix"].loc, false, vr.fGetEyeMatrix(1));
		
		if(model.mesh.indexCount) this.gl.drawElements(model.mesh.drawMode, model.mesh.indexCount, gl.UNSIGNED_SHORT, 0); 
		else this.gl.drawArrays(model.mesh.drawMode, 0, model.mesh.vertexCount);

		//Cleanup
		this.gl.bindVertexArray(null);
		if(model.mesh.noCulling || this.noCulling) this.gl.enable(this.gl.CULL_FACE);
		if(model.mesh.doBlending || this.doBlending) this.gl.disable(this.gl.BLEND);

		return this;
	}
}

class ShaderUtil{
	//-------------------------------------------------
	// Main utility functions
	//-------------------------------------------------

	//get the text of a script tag that are storing shader code.
	static domShaderSrc(elmID){
		var elm = document.getElementById(elmID);
		if(!elm || elm.text == ""){ console.log(elmID + " shader not found or no text."); return null; }
		
		return elm.text;
	}

	//Create a shader by passing in its code and what type
	static createShader(gl,src,type){
		var shader = gl.createShader(type);
		gl.shaderSource(shader,src);
		gl.compileShader(shader);

		//Get Error data if shader failed compiling
		if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
			console.error("Error compiling shader : " + src, gl.getShaderInfoLog(shader));
			gl.deleteShader(shader);
			return null;
		}

		return shader;
	}

	//Link two compiled shaders to create a program for rendering.
	static createProgram(gl,vShader,fShader,doValidate){
		//Link shaders together
		var prog = gl.createProgram();
		gl.attachShader(prog,vShader);
		gl.attachShader(prog,fShader);

		//Force predefined locations for specific attributes. If the attibute isn't used in the shader its location will default to -1
		gl.bindAttribLocation(prog,ATTR_POSITION_LOC,ATTR_POSITION_NAME);
		gl.bindAttribLocation(prog,ATTR_NORMAL_LOC,ATTR_NORMAL_NAME);
		gl.bindAttribLocation(prog,ATTR_UV_LOC,ATTR_UV_NAME);

		gl.linkProgram(prog);

		//Check if successful
		if(!gl.getProgramParameter(prog, gl.LINK_STATUS)){
			console.error("Error creating shader program.",gl.getProgramInfoLog(prog));
			gl.deleteProgram(prog); return null;
		}

		//Only do this for additional debugging.
		if(doValidate){
			gl.validateProgram(prog);
			if(!gl.getProgramParameter(prog,gl.VALIDATE_STATUS)){
				console.error("Error validating program", gl.getProgramInfoLog(prog));
				gl.deleteProgram(prog); return null;
			}
		}
		
		//Can delete the shaders since the program has been made.
		gl.detachShader(prog,vShader); //TODO, detaching might cause issues on some browsers, Might only need to delete.
		gl.detachShader(prog,fShader);
		gl.deleteShader(fShader);
		gl.deleteShader(vShader);

		return prog;
	}

	//-------------------------------------------------
	// Helper functions
	//-------------------------------------------------
	
	//Pass in Script Tag IDs for our two shaders and create a program from it.
	static domShaderProgram(gl,vectID,fragID,doValidate){
		var vShaderTxt	= ShaderUtil.domShaderSrc(vectID);								if(!vShaderTxt)	return null;
		var fShaderTxt	= ShaderUtil.domShaderSrc(fragID);								if(!fShaderTxt)	return null;
		var vShader		= ShaderUtil.createShader(gl,vShaderTxt,gl.VERTEX_SHADER);		if(!vShader)	return null;
		var fShader		= ShaderUtil.createShader(gl,fShaderTxt,gl.FRAGMENT_SHADER);	if(!fShader){	gl.deleteShader(vShader); return null; }
		
		return ShaderUtil.createProgram(gl,vShader,fShader,true);
	}

	static createProgramFromText(gl,vShaderTxt,fShaderTxt,doValidate){
		var vShader		= ShaderUtil.createShader(gl,vShaderTxt,gl.VERTEX_SHADER);		if(!vShader)	return null;
		var fShader		= ShaderUtil.createShader(gl,fShaderTxt,gl.FRAGMENT_SHADER);	if(!fShader){	gl.deleteShader(vShader); return null; }
		
		return ShaderUtil.createProgram(gl,vShader,fShader,true);
	}

	//-------------------------------------------------
	// Setters / Getters
	//-------------------------------------------------

	//Get the locations of standard Attributes that we will mostly be using. Location will = -1 if attribute is not found.
	static getStandardAttribLocations(gl,program){
		return {
			position:	gl.getAttribLocation(program,ATTR_POSITION_NAME),
			norm:		gl.getAttribLocation(program,ATTR_NORMAL_NAME),
			uv:			gl.getAttribLocation(program,ATTR_UV_NAME)
		};
	}

	static getStandardUniformLocations(gl,program){
		return {
			perspective:	gl.getUniformLocation(program,"uPMatrix"),
			modalMatrix:	gl.getUniformLocation(program,"uMVMatrix"),
			cameraMatrix:	gl.getUniformLocation(program,"uCameraMatrix"),
			mainTexture:	gl.getUniformLocation(program,"uMainTex")
		};
	}
}

class UBO{
	constructor(gl,blockName,blockPoint,bufSize,aryCalc){
		//Build name indexed array of Buffer Components for quick access when updating.
		this.items = [];	//Key Indexed array of structs that define each component
		this.keys = [];		//The order is important for the struct, keep the order of the uniform names with this array.
		
		for(var i=0; i < aryCalc.length; i++){
			this.items[aryCalc[i].name]	= {offset: aryCalc[i].offset,dataLen: aryCalc[i].dataLen,chunkLen:aryCalc[i].chunkLen};
			this.keys[i]				= aryCalc[i].name;
		}
		
		//Save some extra bits of data
		this.gl = gl;
		this.blockName = blockName;
		this.blockPoint = blockPoint;

		//Create Buffer to store the struct data.
		this.buf = gl.createBuffer();									//Create Standard Buffer
		gl.bindBuffer(gl.UNIFORM_BUFFER,this.buf);						//Bind it for work
		gl.bufferData(gl.UNIFORM_BUFFER,bufSize,gl.DYNAMIC_DRAW);		//Allocate Space needed
		gl.bindBuffer(gl.UNIFORM_BUFFER,null);							//Unbind
		gl.bindBufferBase(gl.UNIFORM_BUFFER, blockPoint, this.buf);		//Assign to Block Point
	}

	update(name,data){
		//If not float32array, make it so
		if(! (data instanceof Float32Array)){
			if(Array.isArray(data))	data = new Float32Array(data);		//already an array, just convert to float32
			else 					data = new Float32Array([data]);	//Single value most likely,Turn to -> Array -> Float32Ary
		}

		this.gl.bindBuffer(this.gl.UNIFORM_BUFFER,this.buf);
		this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, this.items[name].offset, data, 0, null);
		this.gl.bindBuffer(this.gl.UNIFORM_BUFFER,null);
		return this;
	}

	static create(gl,blockName,blockPoint,ary){
		var bufSize = UBO.calculate(ary);
		UBO.Cache[blockName] = new UBO(gl,blockName,blockPoint,bufSize,ary);
		UBO.debugVisualize(UBO.Cache[blockName]);
	}

	static getSize(type){
		switch(type){
			case "mat4": return 16*4;
			case "mat3": return 16*3;
			case "vec2": return 8;
			case "f": case "i": case "b": return 4;
			case "vec3": case "vec4": return 16;
			default: return 0;
		}
	}

	static calculate(ary){
		var chunk = 16,	//Data size in Bytes, UBO using layout std140 needs to build out the struct in chunks of 16 bytes.
			tsize = 0,	//Temp Size, How much of the chunk is available after removing the data size from it
			offset = 0,	//Offset in the buffer allocation
			size = 0;	//Data Size of the current type

		for(var i=0; i < ary.length; i++){
			//When dealing with arrays, Each element takes up 16 bytes regardless of type.
			if(!ary[i].arylen || ary[i].arylen == 0) size = UBO.getSize(ary[i].type);
			else size = ary[i].arylen * 16;


			tsize = chunk-size;	//How much of the chunk exists after taking the size of the data.

			//Chunk has been overdrawn when it already has some data resurved for it.
			if(tsize < 0 && chunk < 16){
				offset += chunk;						//Add Remaining Chunk to offset...
				if(i > 0) ary[i-1].chunkLen += chunk;	//So the remaining chunk can be used by the last variable
				chunk = 16;								//Reset Chunk
			}else if(tsize < 0 && chunk == 16){ 
				//Do nothing incase data length is >= to unused chunk size.
				//Do not want to change the chunk size at all when this happens.
			}else if(tsize== 0)	chunk = 16;				//If evenly closes out the chunk, reset
			else 				chunk -= size;	//Chunk isn't filled, just remove a piece

			//Add some data of how the chunk will exist in the buffer.
			ary[i].offset = offset;
			ary[i].chunkLen = size;
			ary[i].dataLen = size;

			offset += size;
		}

		//Check if the final offset is divisiable by 16, if not add remaining chunk space to last element.
		if(offset % 16 != 0){
			ary[ary.length-1].chunkLen += chunk;
			offset += chunk;
		}

		console.log("UBO Buffer Size ",offset);
		return offset;
	}

	static debugVisualize(ubo){
		var str = "",
			chunk = 0,
			tchunk = 0,
			itm = null;

		for(var i=0; i < ubo.keys.length; i++){
			itm = ubo.items[ubo.keys[i]];
			console.log(ubo.keys[i],itm);

			chunk = itm.chunkLen / 4;
			for(var x = 0; x < chunk; x++){
				str += (x==0 || x == chunk-1)? "|."+i+"." : "|...";	//Display the index
				tchunk++;
				if(tchunk % 4 == 0) str += "| ~ ";
			}
		}

		if(tchunk % 4 != 0) str += "|";

		console.log(str);
		//for(var i=0; i < ary.length; i++) console.log(ary[i]);
	}
}

UBO.Cache = [];