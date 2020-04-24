import PageLayout 			from "../fungi/webcom/PageLayout.js";
import * as THREE			from "./three.module.js";

import Ecs, { Components }	from "../fungi/engine/Ecs.js";
import RenderLoop			from "../fungi/engine/RenderLoop.js"

import InputTracker 		from "../fungi/lib/InputTracker.js";

import OrbitCamera 			from "./ecs/OrbitCamera.js";
import Obj 					from "./ecs/Obj.js";

import Maths, { Vec3, Quat }	from "../fungi/maths/Maths.js";

/*++++++++++++++++++++++++++++++++++++++++++++++++
SYSTEMS LAYOUT
0001 - Orbit Camera
1000 - 
++++++++++++++++++++++++++++++++++++++++++++++++*/

let App = {
	ecs				: null,		// Main ECS instances, Primarily the World Entity List.
	loop			: null,		// Render Loop
	camera			: null,		// Reference to the Main Camera for the view port
	cam_ctrl		: null,		// Reference to the Camera Controller
	input			: null,		// Handle Keeping Mouse and Keyboard state for application
	canvas 			: null,

	renderer 		: null,		// Three.js Related Objects
	scene 			: null,
	clock 			: null,

	delta_time		: 0,		// Time between frames
	since_start		: 1,		// Time since the render loop started.

	on_render		: null, 

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~	
	// Ecs
	Components,	


	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	$ : function( o=null, com_ary=null ){
		let e;
		if( typeof o == "string"){
			e = App.ecs.entity( o, com_ary || ["Obj"] );
		}else{
			e = App.ecs.entity( o.name, com_ary || ["Obj"] );
			if( o && e.Obj ) e.Obj.set_ref( o );
		}
		return e;
	},


	get_e : ( idx )=>{ return App.ecs.entities[ idx ]; },

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	builder	: function( use_debug=false, use_scene=true ){ return new Builder( use_debug, use_scene ); },

	render 	: ( dt, ss )=>{
		if( App.on_render ) App.on_render( dt, ss );	// Run a hook into render pipeline

		App.ecs.sys_run();								// Run Systems
		App.renderer.render( App.scene, App.camera );	// Run Three.JS Renderer
	},
};


//////////////////////////////////////////////////////////////////
//
//////////////////////////////////////////////////////////////////
	class Builder{
		constructor( use_debug=false, use_scene=true){
			this.task_queue = new Array();

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			this
				.add( new Promise( (r, e)=>window.addEventListener("load", _=>r(true)) ) )
				.add( init_3js )
				.add( init_ecs );

			if( use_scene ) this.add( init_scene );
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
					App.cam_ctrl
						.set_target( tx, ty, tz )
						.set_orbit( ox, oy, od );

					return true;
				});
				return this;
			}

			render_loop( cb=null ){
				App.on_render = cb;

				this.add( async()=>{
					await import( "../fungi/engine/RenderLoop.js").then( mod=>{ App.loop = new mod.default( App.render, 0, App ) });
					App.loop.start();
					return true;
				});
				return this;
			}

			render_on_mouse( cb=null ){
				App.on_render = cb;

				this.add(()=>{
					App.input.on_input = ()=>{ window.requestAnimationFrame( App.render ); }
					App.render();
					return true;
				});
				return this;
			}

			init_mod(){
				let args = arguments;
				this.add( async()=>{
					let i, ary = new Array( args.length );

					for( i=0; i < args.length; i++ ) ary[ i ] = import( args[i] ).then( run_module_init );
		
					await Promise.all( ary );
					return true;
				})
				return this;
			}

			use_events(){
				this.add( async()=>{
					await import( "../fungi/lib/EventManager.js").then( mod=>{ App.events = new mod.default(); });
					return true;
				});
				return this;
			}
	}


	function run_module_init( mod ){ if( mod.default.init ) mod.default.init(); }

//////////////////////////////////////////////////////////////////
//
//////////////////////////////////////////////////////////////////
	function init_3js(){
		App.canvas = document.getElementById( "pg_canvas" );
		
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Setup Renderer
		let w = window.innerWidth,
			h = window.innerHeight;

		//App.renderer = new THREE.WebGLRenderer( { canvas: App.canvas, antialias:true } );
		let ctx = App.canvas.getContext( "webgl2" ); //, { alpha: false }
		App.renderer = new THREE.WebGLRenderer( { canvas:App.canvas, context:ctx, antialias:true } );

		App.renderer.setClearColor( 0x3a3a3a, 1 );
		App.renderer.setSize( w, h );

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		App.scene		= new THREE.Scene();
		App.camera		= new THREE.PerspectiveCamera( 45, w / h, 0.01, 1000 );

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Setup Lighting
		let light = new THREE.DirectionalLight( 0xffffff, 1.0 );
		light.position.set( 4, 10, 1 );
		App.scene.add( light );

		App.scene.add( new THREE.AmbientLight( 0x404040 ) );
		//App.scene.add( new THREE.HemisphereLight( 0xffffbb, 0x080820, 1 ) );
		 

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Fungi Stuff
		App.input = new InputTracker( App.canvas );
		return true;
	}

	function init_ecs( bld ){
		App.ecs = new Ecs();

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Register Components and Setup Systems
		OrbitCamera.init();
		return true;
	}

	async function init_scene(){
		App.scene.add( new THREE.GridHelper( 20, 20, 0x0c610c, 0x444444 ) );
		return true;
	}

	async function init_debug(){
		let mod 	= await import("./Debug.js");
		App.Debug	= mod.default.init();
		return true;
	}

//##################################################################################

window.App = App; // Make App Globally Scoped

export default App;
export { THREE, Components, Maths, Vec3, Quat };