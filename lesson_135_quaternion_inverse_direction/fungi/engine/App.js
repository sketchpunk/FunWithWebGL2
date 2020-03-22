
import gl 					from "../core/gl.js";
import Mesh 				from "../core/Mesh.js";
import Shader 				from "../core/Shader.js";
import ShaderBuilder 		from "../core/ShaderBuilder.js";
import Ubo 					from "../core/Ubo.js";
import Vao 					from "../core/Vao.js";
import Buf 					from "../core/Buf.js";
import Cache 				from "../core/Cache.js";
import Colour 				from "../core/Colour.js";

import Ecs, { Components }	from "./Ecs.js";
import RenderLoop			from "./RenderLoop.js"

import InputTracker 		from "../lib/InputTracker.js";

import Maths, { Quat, Vec3, Transform }	from "../maths/Maths.js";

import Node 				from "./com/Node.js";
import Draw 				from "./com/Draw.js";
import Camera 				from "./com/Camera.js";
import OrbitCamera 			from "./com/OrbitCamera.js";


/*++++++++++++++++++++++++++++++++++++++++++++++++
SYSTEMS LAYOUT
001 	- OrbitCamera
800		- NodeSys
801		- CameraSys
950 	- DrawSys
1000	- NodeCleanupSys
++++++++++++++++++++++++++++++++++++++++++++++++*/


let App = {
	ecs				: null,		// Main ECS instances, Primarily the World Entity List.
	loop			: null,		// Render Loop
	camera			: null,		// Reference to the Main Camera for the view port
	cam_ctrl		: null,		// Reference to the Camera Controller
	input			: null,		// Handle Keeping Mouse and Keyboard state for application

	delta_time		: 0,		// Time between frames
	since_start		: 1,		// Time since the render loop started.

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Core
	gl, Shader, ShaderBuilder, Mesh, Cache, Vao, Buf, Colour,
	
	// Ecs
	Components,	

	// Misc
	Maths, Quat, Vec3, Transform,

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	$Draw	: ( name, mesh, mat, mode=Mesh.TRI )=>{
		let e = App.ecs.entity( name, ["Node", "Draw"] );
		if( mesh && mat ) e.Draw.add( mesh, mat, mode )
		return e;
	},

	get_e : ( idx )=>{ return App.ecs.entities[ idx ]; },

	builder	: function( use_debug=false ){ return new Builder( use_debug ); },
};


//////////////////////////////////////////////////////////////////
//
//////////////////////////////////////////////////////////////////
	class Builder{
		constructor( use_debug=false ){
			this.task_queue = new Array();

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			this
				.add( new Promise( (r, e)=>window.addEventListener("load", _=>r(true)) ) )
				.add( init_gl )
				.add( init_ecs )
				.add( init_scene );

			if( use_debug ) this.add( init_debug );
		}

		///////////////////////////////////////////////////////
		//
		///////////////////////////////////////////////////////
			add( f ){ this.task_queue.push( f ); return this; }
			
			build(){ 
				return new Promise( ( r , e)=>this.run( r, e ) )
					.catch( err=>console.error( "PromiseError :", err ) ); }
			
			async run( r, e ){
				let task, ok;
				for( task of this.task_queue ){
					if( task instanceof Promise )
						ok = await task;
					else if( task.constructor.name == "AsyncFunction" )
						ok = await task( this );
					else
						ok = task( this );	

					if( !ok ){ e("Error running tasks"); return; }
				}

				r( "done" );
			}

		///////////////////////////////////////////////////////
		//
		///////////////////////////////////////////////////////
			set_camera( ox=-15, oy=15, od=2.5, tx=0, ty=0.75, tz=0 ){
				this.add( ()=>{
					//App.cameraCtrl.setTarget( tx, ty, tz ).setOrbit( ox, oy, od );
					//App.camera.Node.set_pos( ox, oy, od );

					App.cam_ctrl
						.set_orbit( ox, oy, od )
						.set_target( tx, ty, tz );

					return true;
				});
				return this;
			}

			render_loop( cb ){
				this.add( async()=>{
					await import( "./RenderLoop.js").then( mod=>{ App.loop = new mod.default( cb, 0, App ) });
					App.loop.start();
					return true;
				});
				return this;
			}

			render_on_mouse( cb ){
				this.add(()=>{
					App.input.on_input = ()=>{ window.requestAnimationFrame( cb ); }
					cb();
					return true;
				});
				return this;
			}

			load_shaders(){
				let args = arguments;
				this.add( async()=>{
					let i, ary = new Array( args.length );

					for( i=0; i < args.length; i++ ) ary[ i ] = import( args[i] );
		
					await Promise.all( ary );
					return true;
				})
				return this;
			}
	}


//////////////////////////////////////////////////////////////////
//
//////////////////////////////////////////////////////////////////
	function init_gl(){
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		if( !gl.init("pg_canvas") ) return false;

		let box = gl.ctx.canvas.getBoundingClientRect(); // if not enough sleep time, can not get correct size
		gl.set_color( "#3a3a3a" )
			.fit_screen() //.set_size( box.width, box.height )
			.clear();

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		Ubo.build( "Global", 0, [
			{ name:"proj_view", type:"mat4" },
			{ name:"camera_matrix", type:"mat4" },
		]);

		Ubo.build( "Model", 1, [
			{ name:"view_matrix", type:"mat4" },
		]);

		Ubo.build( "Armature", 2, [
			{ name:"bones", type:"mat2x4", ary_len:90 },
			{ name:"scales", type:"vec3", ary_len:90 },
		]);

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		App.input = new InputTracker();
		return true;
	}

	function init_ecs( bld ){
		App.ecs = new Ecs();

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Register Components and Setup Systems
		Node.init();			// Handle Transform Heirachy
		Draw.init();
		Camera.init();
		OrbitCamera.init();

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Setup Some Global Entities
		App.camera = App.ecs.entity( "main_camera", ["Node","Camera"] );
		App.camera.Camera.set_perspective( 45, 0.01, 100.0 );

		return true;
	}

	async function init_scene(){
		let mods = await Promise.all([
			//import( "../shaders/CircleGrid.js" ),
			import( "../shaders/MetricGrid.js" ),
			import( "../geo/Quad.js" ),
		]);

		let mat = mods[0].default.new_material(),	// Floor Shader
			e 	= mods[1].default( "floor", mat );	// Quad

		mat.options.cullFace = false;

		e.Draw.priority = 100;
		e.Node.set_rot_axis( [1,0,0], -90 * Math.PI / 180 );
		e.Node.set_scl( 10 );

		return true;
	}

	async function init_debug(){
		let mod = await import("./Debug.js");
		mod.default.init();
		App.Debug = mod.default;
		return true;
	}

export default App;