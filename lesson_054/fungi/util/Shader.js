import gl,{ UNI_MODEL_MAT_NAME } from "../gl.js"

//Shortcut to create a shader based on the vert/frag progress text
function createShader(name,vert,frag){
	var shader = new ShaderBuilder(vert,frag);
	gl.res.shaders[name] = shader;
	return shader;
}


//Deserialize Downloaded Shader files to create shaders and materials.
function loadShader(js){
	//.............................
	//create shader
	var uniforms = [];
	var tfeedback = (js.shader.transFeedback != undefined)? js.shader.transFeedback : null;

	var shader = new ShaderBuilder(js.vertex,js.fragment,tfeedback);
	gl.res.shaders[js.shader.name] = shader;

	//.............................
	//Handle Uniforms
	var uniforms = (js.shader.uniforms && js.shader.uniforms.length > 0)? js.shader.uniforms.slice() : [];
	
	if(js.shader.useModalMat4) uniforms.push(UNI_MODEL_MAT_NAME,"mat4"); //Special Uniform added to list
	
	if(uniforms.length > 0) shader.prepareUniforms(uniforms); //shader.prepareUniforms(UNI_MODEL_MAT_NAME,"mat4");

	//.............................
	//Handle Ubo
	if(js.shader.useUBOTransform)	shader.prepareUniformBlocks(gl.UBOTransform,0);

	//.............................
	//load materials
	var mat,uni,uList = [];
	for(var i=0; i < js.materials.length; i++){
		mat = Material.create(js.materials[i].name,js.shader.name);

		if(js.materials[i].useBlending !== undefined)				mat.useBlending				= js.materials[i].useBlending;
		if(js.materials[i].useSampleAlphaCoverage !== undefined)	mat.useSampleAlphaCoverage	= js.materials[i].useSampleAlphaCoverage;

		if(js.materials[i].uniforms){
			uni = js.materials[i].uniforms;
			
			//Process special uniforms
			var uList = [];
			for(var u=0; u < uni.length; u+=3){
				switch(uni[u+1]){
					case "color":
						uList.push(uni[u], gl.rgbArray(uni[u+2]) ); break;
					default:
						uList.push(uni[u], uni[u+2]); break;
				}
			}

			mat.setUniforms(uList);
		}
	}
}



class Material{
	static create(name,shaderName){
		var m = new Material();
		m.shader = gl.res.shaders[shaderName];

		gl.res.materials[name] = m;
		return m;
	}

	constructor(){
		this.shader = null;
		this.uniforms = [];
		
		this.useBlending = false;		
		this.useModelMatrix = true;
		this.useNormalMatrix = false;
		this.useSampleAlphaCoverage = false;
	}

	setUniforms(uName,uValue){ 
		var ary = (arguments.length == 1)? arguments[0] : arguments;
		for(var i=0; i < ary.length; i+=2) this.uniforms[ary[i]] = ary[i+1];  return this;
	}
	applyUniforms(){
		for(var n in this.uniforms) this.shader.setUniforms(n,this.uniforms[n]);
		return this;
	}
}


class ShaderBuilder{
	constructor(vertShader,fragShader,tfeedback){
		this.program = gl.createProgramFromText(vertShader,fragShader,true,tfeedback);
		
		if(this.program != null){
			gl.ctx.useProgram(this.program);
			this._UniformList = [];		//List of Uniforms that have been loaded in. Key=UNIFORM_NAME {loc,type}
			this._TextureList = [];		//List of texture uniforms, Indexed {loc,tex}
		}
	}

	//---------------------------------------------------
	// Methods For Shader Prep.
	//---------------------------------------------------
	//Takes in unlimited arguments. Its grouped by two so for example (UniformName,UniformType): "uColors","3fv"
	prepareUniforms(uName,uType){
		var ary = (arguments.length == 1)? arguments[0] : arguments,
			loc = 0;

		for(var i=0; i < ary.length; i+=2){
			loc = gl.ctx.getUniformLocation(this.program,ary[i]);
			if(loc != null) this._UniformList[ary[i]] = {loc:loc,type:ary[i+1]};
			else console.log("Uniform not found " + ary[i]);
		}
		return this;
	}

	prepareUniformBlocks(ubo,blockIndex){
		var ind = 0;
		for(var i=0; i < arguments.length; i+=2){
			//ind = this.gl.getUniformBlockIndex(this.program,arguments[i].blockName); //TODO This function does not return block index, need to pass that value in param
			//console.log("Uniform Block Index",ind,ubo.blockName,ubo.blockPoint);

			gl.ctx.uniformBlockBinding(this.program, arguments[i+1], arguments[i].blockPoint);
			
			//console.log(this.gl.getActiveUniformBlockParameter(this.program, 0, this.gl.UNIFORM_BLOCK_DATA_SIZE)); //Get Size of Uniform Block
			//console.log(this.gl.getActiveUniformBlockParameter(this.program, 0, this.gl.UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES));
			//console.log(this.gl.getActiveUniformBlockParameter(this.program, 0, this.gl.UNIFORM_BLOCK_ACTIVE_UNIFORMS));
			//console.log(this.gl.getActiveUniformBlockParameter(this.program, 0, this.gl.UNIFORM_BLOCK_BINDING));
		}
		return this;
	}

	//Takes in unlimited arguments. Its grouped by two so for example (UniformName,CacheTextureName): "uMask01","tex001";
	prepareTextures(uName,TextureCacheName){
		if(arguments.length % 2 != 0){ console.log("prepareTextures needs arguments to be in pairs."); return this; }
		
		var loc = 0,tex = "";
		for(var i=0; i < arguments.length; i+=2){
			tex = gl.res.textures[arguments[i+1]];
			if(tex === undefined){ console.log("Texture not found in cache " + arguments[i+1]); continue; }

			loc = gl.getUniformLocation(this.program,arguments[i]);
			if(loc != null) _TextureList.push({loc:loc,tex:tex});
		}
		return this;
	}

	//---------------------------------------------------
	// Setters Getters
	//---------------------------------------------------
	//Uses a 2 item group argument array. Uniform_Name, Uniform_Value;
	setUniforms(uName,uValue){
		if(arguments.length % 2 != 0){ console.log("setUniforms needs arguments to be in pairs."); return this; }

		var texCnt = 0,
			name;

		for(var i=0; i < arguments.length; i+=2){
			name = arguments[i];
			if(this._UniformList[name] === undefined){ console.log("uniform not found " + name); return this; }

			switch(this._UniformList[name].type){
				case "float":	gl.ctx.uniform1f(this._UniformList[name].loc, arguments[i+1]); break;
				case "vec2":	gl.ctx.uniform2fv(this._UniformList[name].loc, arguments[i+1]); break;
				case "vec3":	gl.ctx.uniform3fv(this._UniformList[name].loc, arguments[i+1]); break;
				case "vec4":	gl.ctx.uniform4fv(this._UniformList[name].loc, arguments[i+1]); break;
				case "mat4":	gl.ctx.uniformMatrix4fv(this._UniformList[name].loc,false,arguments[i+1]); break;
				case "mat2x4": 	gl.ctx.uniformMatrix2x4fv(this._UniformList[name].loc,false,arguments[i+1]); break;
				case "tex":
					gl.ctx.activeTexture(gl.ctx["TEXTURE" + texCnt]);
					gl.ctx.bindTexture(gl.ctx.TEXTURE_2D,uValue);
					gl.ctx.uniform1i(this._UniformList[name].loc,texCnt);
					texCnt++;
					break;
				default: console.log("unknown uniform type for " + name); break;
			}
		}
		return this;
	}

	//---------------------------------------------------
	// Methods
	//---------------------------------------------------
	activate(){ gl.ctx.useProgram(this.program); return this; }
	deactivate(){ gl.ctx.useProgram(null); return this; }

	//function helps clean up resources when shader is no longer needed.
	dispose(){
		//unbind the program if its currently active
		if(gl.ctx.getParameter(this.gl.CURRENT_PROGRAM) === this.program) gl.ctx.useProgram(null);
		gl.ctx.deleteProgram(this.program);
	}

	preRender(){
		gl.ctx.useProgram(this.program); //Save a function call and just activate this shader program on preRender

		//If passing in arguments, then lets push that to setUniforms for handling. Make less line needed in the main program by having preRender handle Uniforms
		if(arguments.length > 0) this.setUniforms.apply(this,arguments);

		//..........................................
		//Prepare textures that might be loaded up.
		//TODO, After done rendering need to deactivate the texture slots
		if(this._TextureList.length > 0){
			var texSlot;
			for(var i=0; i < this._TextureList.length; i++){
				texSlot = gl.ctx["TEXTURE" + i];
				gl.ctx.activeTexture(texSlot);
				gl.ctx.bindTexture(gl.ctx.TEXTURE_2D,this._TextureList[i].tex);
				gl.ctx.uniform1i(this._TextureList[i].loc,i);
			}
		}

		return this;
	}
}

export default {
	create:createShader,
	load:loadShader,

	Material:Material,
	Builder:ShaderBuilder
}