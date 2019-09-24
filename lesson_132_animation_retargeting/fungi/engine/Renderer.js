import gl		from "../core/gl.js";
import App		from "./App.js";

class Renderer{
	constructor(){
		//Render Objects
		this.frameBuffer 		= null;
		this.material			= null;
		this.shader				= null;
		this.vao				= null;

		//UBOs for Updating
		this.UBOModel			= App.cache.getUBO("UBOModel");
		this.UBOGlobal			= App.cache.getUBO("UBOGlobal");

		if( (App.armature_opt & 1) == 1 ){
			this.UBOArmature	= App.cache.getUBO("UBOArmature");
		}

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

	////////////////////////////////////////////////////////////////////
	// 
	////////////////////////////////////////////////////////////////////

		beginFrame(){
			gl.clear();

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Reset State checks incase things where used before a frame render.
			this.material	= null;
			this.shader		= null;
			this.vao		= null;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Update Global UBO
			this.UBOGlobal
				.setItem("projViewMatrix",	App.camera.Camera.pvMatrix )
				.setItem("cameraPos",		App.camera.Node.world.pos )
				.setItem("globalTime",		App.sinceStart )
				.setItem("deltaTime",		App.deltaTime )
				.update();
		}


	////////////////////////////////////////////////////////////////////
	// 
	////////////////////////////////////////////////////////////////////
		loadShader( s ){
			if( this.shader !== s ){
				this.shader = s;
				gl.ctx.useProgram( s.program );
			}
			return this;
		}

		//Load Material and its shader
		loadMaterial( mat ){
			//...............................
			//If material is the same, exit.
			if( this.material === mat ) return;
			this.material = mat;

			//...............................
			//Is the shader for the material different
			this.loadShader( mat.shader );

			//...............................
			mat.apply();						//Push any saved uniform values to shader.
			this.loadOptions( mat.options );	//Enabled/Disable GL Options

			return this;
		}

		loadOptions( aryOption ){
			var k, v;
			for( k in aryOption ){
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

		loadEntity( e ){ //console.log("Load Entity ", e.info.name);
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			this.UBOModel
				.setItem( "modelMatrix", e.Node.modelMatrix )
				.update();

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( App.armature_opt && e.Armature && e.Armature.isActive ){
				this.UBOArmature
					.setItem( "bones", e.Armature.flatOffset )
					.setItem( "scale", e.Armature.flatScale )
					.update();
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			return this;
		}


	////////////////////////////////////////////////////////////////////
	// 
	////////////////////////////////////////////////////////////////////
		draw( d ){
			//...............................
			if(this.vao !== d.vao){
				this.vao = d.vao;
				gl.ctx.bindVertexArray( d.vao.id );
				//console.log("Draw", r.entityPtr.name, r.vao.elmCount);
			}

			//...............................
			if(!d.vao.isInstanced){
				if(d.vao.isIndexed)	gl.ctx.drawElements( d.mode, d.vao.elmCount, gl.ctx.UNSIGNED_SHORT, 0); 
				else				gl.ctx.drawArrays( d.mode, 0, d.vao.elmCount);
			}else{
				if(d.vao.isIndexed)	gl.ctx.drawElementsInstanced( d.mode, d.vao.elmCount, gl.ctx.UNSIGNED_SHORT, 0, d.vao.instanceCount); 
				else				gl.ctx.drawArraysInstanced( d.mode, 0, d.vao.elmCount, d.vao.instanceCount);
			}

			//...............................
			//gl.ctx.bindVertexArray(null);
			return this;
		}
}

export default Renderer;