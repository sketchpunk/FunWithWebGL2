import gl		from "../core/gl.js";
import App		from "../App.js";

class Renderer{
	constructor(){
		//Render Objects
		this.frameBuffer 		= null;
		this.material			= null;
		this.shader				= null;
		this.vao				= null;

		//UBOs for Updating
		this.ubo_model			= App.Cache.get_ubo("Model");
		this.ubo_global			= App.Cache.get_ubo("Global");
		this.ubo_armature 		= ( App.Cache.has_ubo("Armature") )? App.Cache.get_ubo("Armature") : null;

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

		begin_frame(){
			gl.clear();

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Reset State checks incase things where used before a frame render.
			this.material	= null;
			this.shader		= null;
			this.vao		= null;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Update Global UBO
			this.ubo_global
				.set_var("proj_view",		App.camera.Camera.proj_view )
				.set_var("camera_matrix",	App.camera.Camera.view )
				.set_var("camera_pos",		App.camera.Node.world.pos )
				.set_var("clock",			App.since_start )
				.set_var("delta_time",		App.delta_time )
				.update();
		}

		end_frame(){
			gl.ctx.bindVertexArray( null );
		}


	////////////////////////////////////////////////////////////////////
	// 
	////////////////////////////////////////////////////////////////////
		load_shader( s ){
			if( this.shader !== s ){
				this.shader = s;
				gl.ctx.useProgram( s.program );
				//console.log("LOAD SHADER", s );
			}
			return this;
		}

		//Load Material and its shader
		load_material( mat ){
			//...............................
			//If material is the same, exit.
			if( this.material === mat ) return;
			this.material = mat;

			//...............................
			//Is the shader for the material different
			this.load_shader( mat.shader );

			//...............................
			mat.apply();						//Push any saved uniform values to shader.
			this.load_options( mat.options );	//Enabled/Disable GL Options

			return this;
		}

		load_options( aryOption ){
			var k, v;
			for( k in aryOption ){
				v = aryOption[k];

				if(this.options[k] && this.options[k].state != v){
					this.options[k].state = v;

					switch( k ){
						case "blendMode"	: gl.blendMode( v ); break;
						case "depthMask"	: gl.ctx.depthMask( v ); break;
						case "cullDir"		: gl.ctx.cullFace( v ); break;
						default:
							gl.ctx[ (this.options[k].state)? "enable" : "disable" ]( this.options[k].id );
						break;
					}
					
				}
			}

			return this;
		}

		load_entity( e ){	
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			this.ubo_model
				.set_var( "view_matrix", e.Node.model_matrix )
				.update();
			
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( e.Armature && this.ubo_armature ){
				this.ubo_armature
					.set_var( "bones", e.Armature.fbuf_offset )
					.update();
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			return this;
		}


	////////////////////////////////////////////////////////////////////
	// 
	////////////////////////////////////////////////////////////////////
		draw( d ){
			let m = d.mesh;
			//console.log( "Draw", m, d.mode );
			//...............................
			if(this.vao !== m.vao){
				this.vao = m.vao;
				gl.ctx.bindVertexArray( m.vao.ref );
			}

			//...............................
			if( !m.is_instanced ){
				if( m.buf.idx ) gl.ctx.drawElements( d.mode, m.elm_cnt, m.elm_type, 0 );
				else		 	gl.ctx.drawArrays( d.mode, 0, m.elm_cnt );
			}else{
				if( m.buf.idx )	gl.ctx.drawElementsInstanced( d.mode, m.elm_cnt, m.elm_type, 0, m.instance_cnt ); 
				else			gl.ctx.drawArraysInstanced( d.mode, 0, m.elm_cnt, m.instance_cnt );
			}

			return this;
		}
}

export default Renderer;