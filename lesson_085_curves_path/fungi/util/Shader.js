import gl,{ UNI_MODEL_MAT_NAME,UNI_NORM_MAT_NAME } from "../gl.js";
import fungi from "../fungi.js";

//Shortcut to create a shader based on the vert/frag progress text
function createShader(name,vert,frag,tfeedback = null){
	var shader = new ShaderBuilder(vert,frag,tfeedback);
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
	
	shader.useModelMatrix = js.shader.useModelMatrix;
	if(shader.useModelMatrix) uniforms.push(UNI_MODEL_MAT_NAME,"mat4"); //Special Uniform added to list

	shader.useNormalMatrix = js.shader.useNormalMatrix;
	if(shader.useNormalMatrix) uniforms.push(UNI_NORM_MAT_NAME,"mat3"); //Special Uniform added to list
	
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
					case "acolor":
						uList.push(uni[u], gl.rgbaArray(uni[u+2]) ); break;
					case "tex":
						uList.push(uni[u], gl.res.textures[ uni[u+2] ]); break;
					default:
						uList.push(uni[u], uni[u+2]); break;
				}
			}

			mat.setUniforms(uList);
		}
	}
}


function loadInlineShader(elmName){
	var str = document.getElementById(elmName).innerText,
		rtn = { shader:null, materials:null, vertex:null, fragment:null },
		posA, posB, txt;

	//Loop threw the rtn struct to find all the tag elements that should be in the text file
	//THen parse out the text and save it to the object.
	for(var itm in rtn){
		posA	= str.indexOf("<" + itm + ">") + itm.length + 2;
		posB	= str.indexOf("<\\" + itm + ">");
		txt		= str.substring(posA,posB);

		switch(itm){
			case "shader": case "materials": //These are JSON elements, parse them so they're ready for use.
				try{ rtn[itm] = JSON.parse(txt); }
				catch(err){ finalize(false,itm.file +" : "+ err.message); return false; }

				break;
			default: rtn[itm] = txt.trim();
		}
	}

	loadShader(rtn); //Call fungi to load shader to GPU
}


//------------------------------------------------------
// Material
//------------------------------------------------------
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
		//this.useModelMatrix = true;
		//this.useNormalMatrix = false;
		this.useSampleAlphaCoverage = false;
	}

	setUniforms(uName,uValue){ 
		var ary = (arguments.length == 1)? arguments[0] : arguments;
		for(var i=0; i < ary.length; i+=2) this.uniforms[ary[i]] = ary[i+1];  return this;
	}

	applyUniforms(){
		var ary = []; //TODO, this is just a hack, Object should have these as an array, no need to gen array each frame
		for(var n in this.uniforms) ary.push(n,this.uniforms[n]);

		this.shader.setUniforms.apply(this.shader,ary);

		//for(var n in this.uniforms) this.shader.setUniforms(n,this.uniforms[n]); //TODO, this is an issue with multiple textures in one shader
		return this;
	}
}


//------------------------------------------------------
// Shaders
//------------------------------------------------------
class ShaderBuilder{
	constructor(vertShader, fragShader, tfeedback = null, tfeedbackInterleaved = true){
		this.program = gl.createProgramFromText(vertShader, fragShader, true, tfeedback, tfeedbackInterleaved);
		this.useModelMatrix = true;
		this.useNormalMatrix = false;

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
	/*
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
	*/

	//---------------------------------------------------
	// Setters Getters
	//---------------------------------------------------
	//Uses a 2 item group argument array. Uniform_Name, Uniform_Value;
	setUniforms(uName,uValue){
		if(arguments.length % 2 != 0){ console.log("setUniforms needs arguments to be in pairs."); return this; }

		var texCnt = 0, //TODO Loading textures only works if doing all uniforms in one go, material loads one at a time.
			name;

		for(var i=0; i < arguments.length; i+=2){
			name = arguments[i]; 
			if(this._UniformList[name] === undefined){ console.log("uniform not found " + name); return this; }
			


			switch(this._UniformList[name].type){
				case "float":	gl.ctx.uniform1f(this._UniformList[name].loc, arguments[i+1]); break;
				case "afloat":	gl.ctx.uniform1fv(this._UniformList[name].loc, arguments[i+1]); break;
				case "vec2":	gl.ctx.uniform2fv(this._UniformList[name].loc, arguments[i+1]); break;
				case "vec3":	gl.ctx.uniform3fv(this._UniformList[name].loc, arguments[i+1]); break;
				case "vec4":	gl.ctx.uniform4fv(this._UniformList[name].loc, arguments[i+1]); break;
				case "int":		gl.ctx.uniform1i(this._UniformList[name].loc, arguments[i+1]); break;

				case "mat4":	gl.ctx.uniformMatrix4fv(this._UniformList[name].loc,false,arguments[i+1]); break;
				case "mat3":	gl.ctx.uniformMatrix3fv(this._UniformList[name].loc,false,arguments[i+1]); break;
				case "mat2x4": 	gl.ctx.uniformMatrix2x4fv(this._UniformList[name].loc,false,arguments[i+1]); break;
				case "sample2D":
					gl.ctx.activeTexture(gl.ctx.TEXTURE0 + texCnt);
					gl.ctx.bindTexture(gl.ctx.TEXTURE_2D,arguments[i+1]);
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
				//gl.ctx.activeTexture(texSlot);
				//gl.ctx.bindTexture(gl.ctx.TEXTURE_2D,this._TextureList[i].tex);
				//gl.ctx.uniform1i(this._TextureList[i].loc,i);
			}
		}

		return this;
	}
}

export default {
	create:createShader,
	load:loadShader,
	loadInline:loadInlineShader,

	Material:Material,
	Builder:ShaderBuilder
}