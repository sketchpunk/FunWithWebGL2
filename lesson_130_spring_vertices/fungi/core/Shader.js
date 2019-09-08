import gl		from "./gl.js";
import Cache	from "./Cache.js";

class Shader{
	constructor( name = "untitled_shader" ){
		this.name 		= name;
		this.program	= null;
		this.texSlot 	= 0;		// Keep track of which texture slots has been used to load textures.
		this.options 	= { modelMatrix: false, normalMatrix: false };
		this.uniforms 	= new Map();
	}

	///////////////////////////////////////////////////////
	// BUILD - DESTROY - BIND SHADER
	///////////////////////////////////////////////////////

		static bind( sh = null ){ gl.ctx.useProgram( sh.program ); return Shader; }

		// Compile and Build the Shader Program
		static buildFromJson( json ){ 
			let shader = Shader.build( json.shader.name, json.vertex, json.fragment);
			if( !shader ) return null;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Load Up Uniforms
			if( json.shader.uniforms && json.shader.uniforms.length > 0 ){
				Shader.prepareUniforms( shader, json.shader.uniforms );
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Load Up Ubo
			if( json.shader.ubo && json.shader.ubo.length > 0 ){
				Shader.prepareUniformBlocks( shader, json.shader.ubo );
			}

			return shader;
		}

		static build( name, vShaderSrc, fShaderSrc, tFeedbackVar = null, tFeedbackInterleaved = false ){
			// Compile the shader Code
			let prog = gl.createShader( vShaderSrc, fShaderSrc, false, tFeedbackVar, tFeedbackInterleaved );
			if( !prog ) return null;

			// When successful, create struct to wrap the program
			let shader = new Shader( name );
			shader.program = prog;

			// Cache it. 
			Cache.shaders.set( name, shader );
			return shader;
		}

		//function helps clean up resources when shader is no longer needed.
		static dispose( sh ){
			//unbind the program if its currently active
			if( gl.ctx.getParameter( gl.ctx.CURRENT_PROGRAM ) === sh.program) gl.ctx.useProgram( null );
			gl.ctx.deleteProgram( sh.program );

			// Remove from Cache
			Cache.shaders.delete( sh.name );
			return Shader;
		}	


	///////////////////////////////////////////////////////
	// PARSING SHADER DATA FILE
	///////////////////////////////////////////////////////

		// Grabs shader code from a Script Tag that exists on the page.
		static parseInline( elmName ){
			let elm = document.getElementById( elmName );
			if( !elm ){
				console.log("Shader.parseInline : Not Found ", elmName );
				return null;
			}

			return Shader.parse( elm.innerText );
		}

		// Parse Shader Data into bits that we can use to start building the shader.
		static parse( shText ){
			let rtn = { shader:null, materials:null, vertex:null, fragment:null },
				txt, itm, aPos, bPos;

			for( itm in rtn ){
				// ---------------------------------------
				// Find the position of the Tags
				aPos	= shText.indexOf("<" + itm + ">") + itm.length + 2;
				bPos	= shText.indexOf("<\\" + itm + ">");

				if( aPos == -1 || bPos == -1 || bPos <= aPos ){
					if(itm == "materials") continue; //Materials is optionl, no need to error our because of it
					console.error("Error parsing shader, missing ", itm);
					return null;
				}

				// ---------------------------------------
				txt	= shText.substring( aPos, bPos );
				switch(itm){
					case "shader": case "materials": //These are JSON elements, parse them so they're ready for use.
						try{ rtn[ itm ] = JSON.parse( txt ); }
						catch(err){ console.error( err.message, "\n" , txt ); return null; }
					break;
					default: rtn[ itm ] = txt.trim(); break;
				}
			}

			return rtn;
		}

		// interpret data incase of custom types needs to be transformed into something else.
		static parse_data( value, type ){
			switch(type){
				case "rgb"	: value = gl.rgbArray( value ); break;
				case "rgba"	: value = gl.rgbaArray( value ); break;
				
				/*
				case "tex"	: 
					let tmp = (value instanceof WebGLTexture)? value : Fungi.getTexture( value ); 
					if(tmp == null){
						console.error("Material.checkData: Texture not found %s for material %s uniform %s",uValue, this.name, uName);
						return this;
					}else value = tmp;
				break;
				*/
			}

			if(Array.isArray(value) && value.length == 0) value = null;
			
			return value;
		}


	///////////////////////////////////////////////////////
	// Methods For Shader Setup.
	///////////////////////////////////////////////////////

		//Map uniform names to location integers
		static prepareUniform( sh, uName, uType ){
			let loc = gl.ctx.getUniformLocation( sh.program, uName );

			if( loc ) 	sh.uniforms.set( uName, { loc, type:uType } );
			else 		console.error( "prepareUniform : Uniform not found %s ", uName );

			return Shader;
		}

		static prepareUniforms( sh, ary ){
			let i, loc;

			for( i of ary ){
				loc = gl.ctx.getUniformLocation( sh.program, i.name );

				if(loc != null)	sh.uniforms.set( i.name, { loc, type:i.type } );
				else 			console.error( "prepareUniforms : Uniform not found %s", i.name );
			}

			return Shader;
		}

		static prepareUniformBlocks( sh, ary ){
			for(let i=0; i < ary.length; i++) Shader.prepareUniformBlock( sh, ary[ i ] );
			return Shader;
		}

		static prepareUniformBlock( sh, uboName ){
			// Check if UBO exists in the shader
			let bIdx = gl.ctx.getUniformBlockIndex( sh.program, uboName );
			if( bIdx > 1000 ){ console.log("Ubo not found in shader %s : %s ", sh.name, uboName ); return this; }

			let ubo = Cache.getUBO( uboName );
			if( !ubo ){ console.log( "Can not find UBO in fungi cache : %s for %s", uboName, sh.name ); return this; }

			//console.log( "prepare UBO", uboName, ubo.bindPoint, bIdx );
			gl.ctx.uniformBlockBinding( sh.program, bIdx, ubo.bindPoint );
			return Shader;
		}
	

	///////////////////////////////////////////////////////
	// Setters Getters
	///////////////////////////////////////////////////////

		//hasUniform(uName){ return this.uniforms.has( uName ); }

		bind(){ gl.ctx.useProgram( this.program ); return this; }
		unbind(){ gl.ctx.useProgram( null ); return this; }
		
		resetTextureSlot(){ this.texSlot = 0; return this; }
		
		setUniform( uName, uValue ){
			let itm	= this.uniforms.get( uName );
			if( !itm ){ console.error( "set uniform not found %s in %s", uName, this.name ); return this; }

			switch(itm.type){
				case "float":	gl.ctx.uniform1f(	itm.loc, uValue); break;
				case "afloat":	gl.ctx.uniform1fv(	itm.loc, uValue); break;
				case "vec2":	gl.ctx.uniform2fv(	itm.loc, uValue); break;
				
				case "rgb":
				case "vec3":	gl.ctx.uniform3fv(	itm.loc, uValue); break;
				
				case "rgba":
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

				default: console.error("unknown uniform type %s for %s in %s", itm.type, uName, this.name ); break;
			}
			return this;
		}
}


//##################################################################
// Constants

Shader.POSITION_LOC		= 0;
Shader.NORMAL_LOC		= 1;
Shader.UV_LOC			= 2;
Shader.COL_LOC			= 3;

Shader.BONE_IDX_LOC		= 8;
Shader.BONE_WEIGHT_LOC	= 9;


//##################################################################
// Export
export default Shader;