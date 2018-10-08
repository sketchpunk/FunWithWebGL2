import gl		from "./gl.js";
import Fungi	from "./Fungi.js";

//##################################################################
// Loading Functions
	//Get shader code from an inline script tag, use that to load a shader.
	function LoadInlineShader(elmName){
		var shData = ParseShaderFile( document.getElementById(elmName).innerText );
		if(shData == null){ console.log("error parsing inline Shader"); return null; }

		var shader = LoadShader(shData);
		if(shader == null){ console.log("error compiling inline shader"); return null; }

		if(shData.materials) LoadMaterials(shData);
		return shader;
	}

	//Apply Snippets and Break shader file into a data struct that can be used for loading
	function ParseShaderFile(shText){
		var dat = { shader:null, materials:null, vertex:null, fragment:null },
			posA, posB, txt, itm;

		//Loop threw the rtn struct to find all the tag elements that should be in the text file
		//THen parse out the text and save it to the object.
		for(itm in dat){
			//...................................
			posA	= shText.indexOf("<" + itm + ">") + itm.length + 2;
			posB	= shText.indexOf("<\\" + itm + ">");
			if(posA == -1 || posB == -1){
				if(itm == "materials") continue;

				console.log("Error parsing shader, missing ", itm);
				return null;
			}

			//...................................
			txt	= shText.substring(posA,posB);
			switch(itm){
				case "shader": case "materials": //These are JSON elements, parse them so they're ready for use.
					try{ dat[itm] = JSON.parse(txt); }
					catch(err){ console.log(err.message,"\n",txt); return null; }
				break;
				default: dat[itm] = txt.trim(); break;
			}
		}

		return dat;
	}

	//Deserialize Downloaded Shader files to create shaders and materials.
	function LoadShader(js){
		//===========================================
		//Create Shader
		var shader = new Shader( js.shader.name, js.vertex, js.fragment );
		if(shader.program == null) return null;

		//..............................
		//Setup Uniforms
		if(js.shader.uniforms && js.shader.uniforms.length > 0){
			shader.prepareUniforms(js.shader.uniforms);
		}

		//..............................
		//Setup Uniform Buffer Objects
		if(js.shader.ubo && js.shader.ubo.length > 0){
			var i;
			for(i=0; i < js.shader.ubo.length; i++)
				shader.prepareUniformBlock( js.shader.ubo[i] );
		}

		//..............................
		//Setup Shader Options
		if(js.shader.options){
			for(var o in js.shader.options) shader.options[o] = js.shader.options[o];
		}

		gl.ctx.useProgram(null);
		return shader; 
	}

	//Load All all the materials for a specific shader
	function LoadMaterials(js){
		var m, mat, u, val, type;
		for(m of js.materials){
			mat = new Material(m.name, js.shader.name);
			if(m.uniforms && m.uniforms.length > 0) mat.addUniforms( m.uniforms );

			//..............................
			//Load Options
			if(m.options){
				for(var o in m.options) mat.options[o] = m.options[o];
			}
		}
	}
//endregion

//##################################################################
// Material
class Material{
	constructor(name=null, shader=null){
		//..................................../
		//If the shader is just the name, search resources for it.
		if(shader && typeof shader == "string"){
			var s = Fungi.shaders.get(shader);
			if(!s){ console.log("Can not find shader %s for material %s", shader, name); return; }
			shader = s;
		}

		//....................................
		this.options = {
			blend 					: false,
			sampleAlphaCoverage 	: false,
			depthTest				: true,
		};

		//....................................
		this.name 		= name;
		this.shader 	= shader;
		this.uniforms 	= new Map();

		if(name != null) Fungi.materials.set(name, this);
	}

	addUniforms(ary){
		var itm;
		for(itm of ary) this.addUniform(itm.name, itm.type, itm.value);
		return this;
	}

	addUniform(uName, uType, uValue){
		if(this.uniforms.has(uName)){
			this.updateUniform(uName, uValue);
			//console.log("Uniform already exists : %s", uName);
			return this;
		}
		//..........................
		this.uniforms.set(uName,{type:uType, value:Material.checkData(uValue, uType)});
		return this;
	}

	updateUniform(uName, uValue){
		var itm = this.uniforms.get(uName);
		if(!itm){
			console.log("Material.setUniform: not found %s for material %s",uName, this.name);
			return this;
		}

		itm.value = Material.checkData(uValue, itm.type);
		return this;
	}

	clone(name = null){
		let m		= new Material(name, null);
		m.shader	= this.shader;

		m.options.blend					= this.options.blend;
		m.options.depthTest				= this.options.depthTest;
		m.options.sampleAlphaCoverage	= this.options.sampleAlphaCoverage;

		let k, v;
		for([k,v] of this.uniforms) m.uniforms.set(k, { type:v.type, value:v.value } );

		return m;
	}

	static checkData(value, type){
		switch(type){
			case "rgb"	: value = gl.rgbArray( value ); break;
			case "rgba"	: value = gl.rgbaArray( value ); break;
			case "tex"	: 
				var tmp = (value instanceof WebGLTexture)? value : Fungi.getTexture( value ); 
				if(tmp == null){
					console.log("Material.checkData: Texture not found %s for material %s uniform %s",uValue, this.name, uName);
					return this;
				}else value = tmp;
			break;
		}

		if(Array.isArray(value) && value.length == 0) value = null;
		
		return value;
	}

	applyUniforms(){
		if(this.shader && this.uniforms.size > 0){
			var key,itm;
			this.shader.resetTextureSlot();
			for([key,itm] of this.uniforms){
				if(itm.value != null) this.shader.setUniform(key, itm.value);
			}
		}
		return this;
	}
}


//##################################################################
// Shaders
class Shader{
	constructor(name, vertShader, fragShader, tfeedbackVar = null, tfeedbackInterleaved = true){
		this.program = gl.createShader(vertShader, fragShader, true, tfeedbackVar, tfeedbackInterleaved);

		//............................
		if(this.program != null){
			this.name		= name;
			this.texSlot	= 0; //Keep track which texSlot has been used when loading textures.
			this.options	= { modelMatrix : false, normalMatrix : false };

			gl.ctx.useProgram(this.program);
			this.uniforms	= new Map();

			Fungi.shaders.set(name, this);
		}
	}

	//---------------------------------------------------
	// Methods For Shader Setup.
	//---------------------------------------------------
	//Map uniform names to location integers
	prepareUniform(uName, uType){
		var loc = gl.ctx.getUniformLocation(this.program, uName);

		if(loc != null)	this.uniforms.set( uName, { loc:loc, type:uType } );
		else console.log("prepareUniform : Uniform not found %s in %s", uName, this.name);

		return this;
	}

	prepareUniforms(ary){
		var itm, loc;
		for(itm of ary){
			loc = gl.ctx.getUniformLocation(this.program, itm.name);

			if(loc != null)	this.uniforms.set( itm.name, { loc:loc, type:itm.type } );
			else console.log("prepareUniforms : Uniform not found %s in %s", itm.name, this.name);
		}

		return this;
	}

	prepareUniformBlock(uboName){
		var bIdx = gl.ctx.getUniformBlockIndex(this.program, uboName);
		if(bIdx > 1000){ console.log("Ubo not found in shader %s : %s ", this.name, uboName); return this; }

		var ubo = Fungi.getUBO(uboName);
		if(!ubo){ console.log("Can not find UBO in fungi cache : %s for %s", uboName, this.name); return this; }

		gl.ctx.uniformBlockBinding(this.program, bIdx, ubo.bindPoint);
		return this;
	}
	

	//---------------------------------------------------
	// Setters Getters
	//---------------------------------------------------
	setOptions(useModelMat = null, useNormalMat = null){
		if(useModelMat != null) this.options.modelMatrix = useModelMat;
		if(useNormalMat != null) this.options.normalMatrix = useNormalMat;

		return this;
	}

	//Uses a 2 item group argument array. Uniform_Name, Uniform_Value;
	setUniforms(uName, uValue){
		if(arguments.length % 2 != 0){ console.log("setUniforms needs arguments to be in pairs."); return this; }

		for(var i=0; i < arguments.length; i+=2) this.setUniform( arguments[i], arguments[i+1] );

		return this;
	}

	hasUniform(uName){ return this.uniforms.has( uName ); }

	setUniform(uName, uValue){
		var itm	= this.uniforms.get( uName );
		if(!itm){ console.log("uniform not found %s in %s",uName, this.name); return this; }

		switch(itm.type){
			case "float":	gl.ctx.uniform1f(	itm.loc, uValue); break;
			case "afloat":	gl.ctx.uniform1fv(	itm.loc, uValue); break;
			case "vec2":	gl.ctx.uniform2fv(	itm.loc, uValue); break;
			case "vec3":	gl.ctx.uniform3fv(	itm.loc, uValue); break;
			case "vec4":	gl.ctx.uniform4fv(	itm.loc, uValue); break;
			case "int":		gl.ctx.uniform1i(	itm.loc, uValue); break;

			case "mat4":	gl.ctx.uniformMatrix4fv(	itm.loc, false, uValue); break;
			case "mat3":	gl.ctx.uniformMatrix3fv(	itm.loc, false, uValue); break;
			case "mat2x4": 	gl.ctx.uniformMatrix2x4fv(	itm.loc, false, uValue); break;
			case "sampler2D":
				gl.ctx.activeTexture(	gl.ctx.TEXTURE0 + this.texSlot);
				gl.ctx.bindTexture(		gl.ctx.TEXTURE_2D, uValue);
				gl.ctx.uniform1i(		itm.loc, this.texSlot);
				this.texSlot++;
				break;

			case "sampler2DArray":
				gl.ctx.activeTexture(	gl.ctx.TEXTURE0 + this.texSlot);
				gl.ctx.bindTexture(		gl.ctx.TEXTURE_2D_ARRAY, uValue);
				gl.ctx.uniform1i(		itm.loc, this.texSlot);
				this.texSlot++;
				break;
			default: console.log("unknown uniform type %s for %s in  %s", itm.type, uName, this.name); break;
		}
		return this;
	}




	//---------------------------------------------------
	// Methods
	//---------------------------------------------------
	bind(){		gl.ctx.useProgram(this.program);	return this; }
	unbind(){	gl.ctx.useProgram(null);			return this; }

	resetTextureSlot(){ this.texSlot = 0; return this; }

	//function helps clean up resources when shader is no longer needed.
	dispose(){
		//unbind the program if its currently active
		if(gl.ctx.getParameter(gl.ctx.CURRENT_PROGRAM) === this.program) gl.ctx.useProgram(null);
		gl.ctx.deleteProgram(this.program);
	}	
}


//##################################################################
// Constants

Shader.ATTRIB_POSITION_LOC		= 0;
Shader.ATTRIB_NORMAL_LOC		= 1;
Shader.ATTRIB_UV_LOC			= 2;
Shader.ATTRIB_TANGENT_LOC		= 3;
Shader.ATTRIB_BITANGENT_LOC		= 4;

Shader.ATTRIB_JOINT_IDX_LOC		= 8;
Shader.ATTRIB_JOINT_WEIGHT_LOC	= 9;


//##################################################################
// Export

export { ParseShaderFile, LoadInlineShader, LoadMaterials, LoadShader, Material };
export default Shader;