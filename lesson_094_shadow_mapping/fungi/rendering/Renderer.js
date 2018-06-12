import gl		from "../gl.js";
import Shader	from "../Shader.js"


class Renderer{
	constructor(){
		//Render Objects
		//this.frameBuffer 	= null;
		this.material		= null;
		this.shader			= null;
		//this.vao			= null;

		//Misc
		this.options	= {
			blend 					: { state : false,	id : gl.ctx.BLEND },
			sampleAlphaCoverage 	: { state : false,	id : gl.ctx.SAMPLE_ALPHA_TO_COVERAGE },
			depthTest				: { state : true,	id : gl.ctx.DEPTH_TEST },
			depthMask				: { state : true },
			cullFace				: { state : true,	id : gl.ctx.CULL_FACE },
			cullDir					: { state : gl.ctx.BACK },
			blendMode				: { state : gl.BLEND_ALPHA },
		}
	}

	//useCustomBuffer(fb){ this.frameBuffer = fb; return this; }
	setFrameBuffer(fb = null){ gl.ctx.bindFramebuffer(gl.ctx.FRAMEBUFFER, fb); return this; }
	clearActiveFrame(){ gl.ctx.clear( gl.ctx.COLOR_BUFFER_BIT | gl.ctx.DEPTH_BUFFER_BIT ); return this; }
	clearDepth(){ gl.ctx.clear( gl.ctx.DEPTH_BUFFER_BIT ); return this; }
	
	setViewPort(w = null, h = null){
		gl.ctx.viewport(0, 0, w || gl.width, h || gl.height);
		return this;
	}

	//----------------------------------------------
	//region Clear and Loading
		clearMaterial(){ this.material = null; return this; }
		clearShader(){ this.shader = null; gl.ctx.useProgram(null); return this; }

		//Load up a shader
		loadShader(s){
			if(this.shader === s) return;
			this.shader = s;
			gl.ctx.useProgram(s.program);
			return this;
		}

		//Load Material and its shader
		loadMaterial(mat){
			//...............................
			//If material is the same, exit.
			if(this.material === mat) return;
			this.material = mat;

			//...............................
			//Is the shader for the material different
			if(this.shader !== mat.shader){
				this.shader = mat.shader;
				gl.ctx.useProgram(this.shader.program);
			}

			//...............................
			mat.applyUniforms();			//Push any saved uniform values to shader.
			this.loadOptions(mat.options);	//Enabled/Disable GL Options

			return this;
		}

		loadRenderable(r){
			//if shader require special uniforms from model, apply
			r.updateMatrix();

			if(this.shader.options.modelMatrix)		this.shader.setUniform(Shader.UNIFORM_MODELMAT, r.worldMatrix);
			if(this.shader.options.normalMatrix)	this.shader.setUniform(Shader.UNIFORM_NORMALMAT, r.normalMatrix);

			//Apply GL Options
			if(r.options) this.loadOptions(r.options);

			return this;
		}

		loadOptions(aryOption){
			var k, v;
			for(k in aryOption){
				v = aryOption[k];

				if(this.options[k] && this.options[k].state != v){
					this.options[k].state = v;

					switch(k){
						case "blendMode":	gl.blendMode( v ); break;
						case "depthMask":	gl.ctx.depthMask( v ); break;
						case "cullDir":		gl.ctx.cullFace( v ); break;
						default:
							gl.ctx[ (this.options[k].state)? "enable" : "disable" ]( this.options[k].id );
						break;
					}
					
				}
			}

			return this;
		}

		renderableComplete(){
			gl.ctx.bindVertexArray(null);
			return this;
		}
	//endregion

	//----------------------------------------------
	//region Drawing
		//Handle Drawing a Renderable's VAO
		drawRenderable(r){
			//...............................
			//if(this.vao != r.vao){
				//this.vao = r.vao;
				gl.ctx.bindVertexArray(r.vao.id);
			//}

			//...............................
			this.loadRenderable(r);

			if(!r.vao.isInstanced){
				if(r.vao.isIndexed)	gl.ctx.drawElements(r.drawMode, r.vao.elmCount, gl.ctx.UNSIGNED_SHORT, 0); 
				else				gl.ctx.drawArrays(r.drawMode, 0, r.vao.elmCount);
			}else{
				if(r.vao.isIndexed)	gl.ctx.drawElementsInstanced(r.drawMode, r.vao.elmCount, gl.ctx.UNSIGNED_SHORT, 0, r.vao.instanceCount); 
				else				gl.ctx.drawArraysInstanced(r.drawMode, 0, r.vao.elmCount, r.vao.instanceCount);
			}

			//...............................
			gl.ctx.bindVertexArray(null);
			return this;
		}

		drawItem(r, mat = null, fboID){
			if(fboID !== undefined) this.setFrameBuffer(fboID);
			if(mat) this.loadMaterial(mat);
			this.drawRenderable(r); 
			return this;
		}

		//Handle Drawing a Scene
		drawScene(ary){
			//Set custom framebuffer if it has been set;
			//if(this.frameBuffer) gl.ctx.bindFramebuffer(gl.ctx.FRAMEBUFFER, this.frameBuffer.id);
		
			//Reset current framebuffer
			gl.clear();

			var itm;
			for(itm of ary){
				//Check for what Items to ignore.
				if(!itm.visible) continue;

				if(itm.draw) itm.draw(this);	//Do Custom Drawing if the object has a Draw function
				else{ 							//Do standard rendering steps
					
					if(itm.vao.elmCount == 0) continue; 	//No Elements to be drawn.

					this.loadMaterial(itm.material);		//Load Material and Shader
					if(itm.onPreDraw) itm.onPreDraw(this);	//Do any preperations needed before drawing if object has onPreDraw

					this.drawRenderable(itm);				//Start Drawing
				}
			}
			return this;
		}
	//end region
}


export default Renderer;