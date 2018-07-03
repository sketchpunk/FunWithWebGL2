import gl		from "../gl.js";
import Fungi	from "../Fungi.js";
import Camera	from "../components/Camera.js";

import { System } from "../Ecs.js";

const QUERY_COM = [ "Transform", "Drawable" ];

class RenderSystem extends System{
	constructor(){
		super();

		//Render Objects
		this.frameBuffer 	= null;
		this.material		= null;
		this.shader			= null;
		this.vao			= null;

		//UBOs for Updating
		this.UBOModel		= Fungi.getUBO("UBOModel");
		this.UBOTransform	= Fungi.getUBO("UBOTransform");

		//GL Option states
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

	update(ecs){
		//............................................
		//Update Main UBO
		this.UBOTransform
			.updateItem("projViewMatrix",	Camera.getProjectionViewMatrix( Fungi.camera.com.Camera ) )
			.updateItem("cameraPos",		Fungi.camera.com.Transform._position )
			.updateItem("globalTime",		Fungi.sinceStart )
			.updateGL();


		//............................................
		let r,e, ary = ecs.queryEntities( QUERY_COM );
		gl.clear();	//Clear Frame Buffer

		//Draw all active Entities
		for( e of ary ){
			//......................................
			if(!e.active) continue;

			// Check if there is anything to render
			r = e.com.Drawable;
			if(!r.vao || r.vao.elmCount == 0){
				//console.log("VAO has no index/vertices or null : ", e.name);
				continue;
			}

			//......................................
			//console.log("Draw", e.name);
			this.loadMaterial( r.material );
			this.loadEntity( e );

			this.draw( r );
		}
	}

	//===============================================================
	// LOADERS
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

		loadEntity(e){ //console.log("Load Entity ", e.name);
			//..........................................
			//Handle UBOModel Data
			let uboChanged = false;
			if( this.shader.options.modelMatrix ){
				this.UBOModel.updateItem("modelMatrix", e.com.Transform.modelMatrix);
				uboChanged = true;
			}

			if( this.shader.options.normalMatrix ){
				console.log("Need to implement handling Normal Matrix");
				//this.UBOModel.updateItem("normalMatrix", e.com.Transform.localMatrix);
				//uboChanged = true;
			}

			if( uboChanged ) this.UBOModel.updateGL();

			//..........................................
			this.loadOptions( e.com.Drawable.options );
		}

	//===============================================================
	// DRAWING
		draw(r){
			//...............................
			if(this.vao !== r.vao){
				this.vao = r.vao;
				gl.ctx.bindVertexArray(r.vao.id);
				//console.log("Draw", r.entityPtr.name, r.vao.elmCount);
			}

			//...............................
			if(!r.vao.isInstanced){
				if(r.vao.isIndexed)	gl.ctx.drawElements(r.drawMode, r.vao.elmCount, gl.ctx.UNSIGNED_SHORT, 0); 
				else				gl.ctx.drawArrays(r.drawMode, 0, r.vao.elmCount);
			}else{
				if(r.vao.isIndexed)	gl.ctx.drawElementsInstanced(r.drawMode, r.vao.elmCount, gl.ctx.UNSIGNED_SHORT, 0, r.vao.instanceCount); 
				else				gl.ctx.drawArraysInstanced(r.drawMode, 0, r.vao.elmCount, r.vao.instanceCount);
			}

			//...............................
			//gl.ctx.bindVertexArray(null);
			return this;
		}
}

export default RenderSystem;