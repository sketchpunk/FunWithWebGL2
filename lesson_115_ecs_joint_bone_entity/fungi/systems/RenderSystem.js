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
		this.UBOWorld 		= Fungi.getUBO("UBOWorld");

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
			.updateItem("cameraPos",		Fungi.camera.com.Transform.position )
			.updateItem("globalTime",		Fungi.sinceStart )
			.updateGL();

		//............................................
		let d, e, ary = ecs.queryEntities( QUERY_COM );
		gl.clear();	//Clear Frame Buffer

		//Draw all active Entities
		for( e of ary ){
			//......................................
			if(!e.active) continue;
			d = e.com.Drawable;

			//......................................			
			if(! d.draw){ //Use standard drawing

				// Check if there is anything to render
				if(!d.vao || d.vao.elmCount == 0) continue; //console.log("VAO has no index/vertices or null : ", e.name);

				//Load and Draw
				this.loadMaterial( d.material );
				this.loadEntity( e );
				this.draw( d );
			
			}else d.draw( this, e, d ); //Component has custom drawing instructions
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

				//TODO, Experimenting with World Space Transform without Matrices
				var comTransform = e.com.TransformNode || e.com.Transform;
				this.UBOWorld.updateItem("rotation",	comTransform.rotation);
				this.UBOWorld.updateItem("position",	comTransform.position);
				this.UBOWorld.updateItem("scale",		comTransform.scale);
				
				uboChanged = true;
			}

			if( this.shader.options.normalMatrix ){
				console.log("Need to implement handling Normal Matrix");
				//this.UBOModel.updateItem("normalMatrix", e.com.Transform.localMatrix);
				//uboChanged = true;
			}

			if( uboChanged ){
				this.UBOModel.updateGL();
				this.UBOWorld.updateGL();	//TODO: Testing
			}

			//..........................................
			this.loadOptions( e.com.Drawable.options );
		}

	//===============================================================
	// DRAWING
		draw(d){
			//...............................
			if(this.vao !== d.vao){
				this.vao = d.vao;
				gl.ctx.bindVertexArray(d.vao.id);
				//console.log("Draw", r.entityPtr.name, r.vao.elmCount);
			}

			//...............................
			if(!d.vao.isInstanced){
				if(d.vao.isIndexed)	gl.ctx.drawElements(d.drawMode, d.vao.elmCount, gl.ctx.UNSIGNED_SHORT, 0); 
				else				gl.ctx.drawArrays(d.drawMode, 0, d.vao.elmCount);
			}else{
				if(d.vao.isIndexed)	gl.ctx.drawElementsInstanced(d.drawMode, d.vao.elmCount, gl.ctx.UNSIGNED_SHORT, 0, d.vao.instanceCount); 
				else				gl.ctx.drawArraysInstanced(d.drawMode, 0, d.vao.elmCount, d.vao.instanceCount);
			}

			//...............................
			//gl.ctx.bindVertexArray(null);
			return this;
		}
}

export default RenderSystem;