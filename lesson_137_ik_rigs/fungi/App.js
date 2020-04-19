
import PageLayout 			from "./webcom/PageLayout.js";

import gl 					from "./core/gl.js";
import Mesh 				from "./core/Mesh.js";
import Shader 				from "./core/Shader.js";
import ShaderBuilder 		from "./core/ShaderBuilder.js";
import Ubo 					from "./core/Ubo.js";
import Vao 					from "./core/Vao.js";
import Buf 					from "./core/Buf.js";
import Cache 				from "./core/Cache.js";
import Colour 				from "./core/Colour.js";

import Ecs, { Components }	from "./engine/Ecs.js";
import RenderLoop			from "./engine/RenderLoop.js"

import InputTracker 		from "./lib/InputTracker.js";

import Maths, { Quat, Vec3, Transform, Mat4 }	from "./maths/Maths.js";

import Node 				from "./engine/com/Node.js";
import Draw 				from "./engine/com/Draw.js";
import Camera 				from "./engine/com/Camera.js";
import OrbitCamera 			from "./engine/com/OrbitCamera.js";


/*++++++++++++++++++++++++++++++++++++++++++++++++
SYSTEMS LAYOUT
001 	- OrbitCamera

700 	- BoneSpring ( Update movement of specific bones )
700		- Gizmos

800		- NodeSys
801		- CameraSys
801 	- BoneSys ( Updates Bone Offset Matrices )
802		- ArmatureSys ( Updates Float Buffers with offsets )
810		- BoneViewSys ( Updates Bone Preview Instances )

950 	- DrawSys

1000	- NodeCleanupSys
1000	- ArmatureCleanupSys
++++++++++++++++++++++++++++++++++++++++++++++++*/


let App = {
	ecs				: null,		// Main ECS instances, Primarily the World Entity List.
	loop			: null,		// Render Loop
	camera			: null,		// Reference to the Main Camera for the view port
	cam_ctrl		: null,		// Reference to the Camera Controller
	input			: null,		// Handle Keeping Mouse and Keyboard state for application

	delta_time		: 0,		// Time between frames
	since_start		: 1,		// Time since the render loop started.

	on_render		: null,

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Core
	gl, Shader, ShaderBuilder, Mesh, Cache, Vao, Buf, Colour, Ubo,
	
	// Ecs
	Components,	

	// Misc
	Maths, Quat, Vec3, Transform,

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	builder	: function( use_debug=false, use_scene=true ){ return new Builder( use_debug, use_scene ); },
	get_e	: ( idx )=>{ return App.ecs.entities[ idx ]; },
	
	$		: ( name, com_ary=null )=>{ return App.ecs.entity( name, com_ary ); },
	$Draw	: ( name, mesh, mat, mode=Mesh.TRI )=>{
		let e = App.ecs.entity( name, ["Node", "Draw"] );
		if( mesh && mat ) e.Draw.add( mesh, mat, mode )
		return e;
	},

	new_mat : ( sh_name, u_struct=null )=>{ 
		let sh = App.Cache.get_shader( sh_name );
		return ( sh )? sh.new_material( sh_name + "_mat", u_struct ) : null;
	},

	render 	: ( dt, ss )=>{
		if( App.on_render ) App.on_render( dt, ss );	// Run a hook into render pipeline
		App.ecs.sys_run();								// Run Systems
	},
};


//////////////////////////////////////////////////////////////////
//
//////////////////////////////////////////////////////////////////
	class Builder{
		constructor( use_debug=false, use_scene=true ){
			this.task_queue 	= new Array();
			this.using_armature	= false;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			this
				.add( new Promise( (r, e)=>window.addEventListener("load", _=>r(true)) ) )
				.add( init_gl )
				.add( init_ecs );

			if( use_scene ) this.add( init_scene );
			if( use_debug ) this.add( init_debug );
		}

		// #region HELPER
		add( f ){ this.task_queue.push( f ); return this; }
		
		build(){ 
			return new Promise( ( r , e )=>this.run( r, e ) )
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
		// #endregion ///////////////////////////////////////////////////////

		// #region BUILDER FUNCTIONS
		set_camera( ox=-15, oy=15, od=2.5, tx=0, ty=0.75, tz=0 ){
			this.add( ()=>{
				//App.cameraCtrl.setTarget( tx, ty, tz ).setOrbit( ox, oy, od );
				//App.camera.Node.set_pos( ox, oy, od );

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
				await import( "./engine/RenderLoop.js").then( mod=>{ App.loop = new mod.default( App.render, 0, App ) });
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
		// #endregion ///////////////////////////////////////////////////////

		// #region EXTRA BUILDER FUNCTIONS
		use_armature(){
			this.using_armature = true;
			this.init_mod( "../fungi.armature/Armature.js", "../fungi.armature/BoneView.js" );
			return this;
		}
		// #endregion ///////////////////////////////////////////////////////
	}

	function run_module_init( mod ){ if( mod.default.init ) mod.default.init(); }

//////////////////////////////////////////////////////////////////
//
//////////////////////////////////////////////////////////////////
	function init_gl( bld ){
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
			{ name:"camera_pos", type:"vec3" },
			{ name:"delta_time", type:"float" },
			{ name:"screen_size", type:"vec2" },
			{ name:"clock", type:"float" },
		])
			.set_var( "screen_size", [ gl.width, gl.height ] );

		Ubo.build( "Model", 1, [
			{ name:"view_matrix", type:"mat4" },
		]);

		if( bld.using_armature ){
			Ubo.build( "Armature", 2, [ { name:"bones", type:"mat4", ary_len:90 } ]);
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		App.input = new InputTracker( gl.ctx.canvas );
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
			//import( "./shaders/MetricGrid.js" ),
			import( "./shaders/GridFloor.js" ),
			import( "./geo/Quad.js" ),
		]);

		let mat = mods[0].default.new_material().opt_cullface( false ),	// Floor Shader
			e 	= mods[1].default( "floor", mat );	// Quad

		e.Draw.priority = 900;
		e.Node.set_rot_axis( [1,0,0], -90 * Math.PI / 180 );
		e.Node.set_scl( 10 );

		return true;
	}

	async function init_debug(){
		let mod = await import("./engine/Debug.js");
		mod.default.init();
		App.Debug = mod.default;
		return true;
	}


//#########################################################
console.log("-- Fungi.App");
window.App = App;	// Put App in the Global Scope.
export default App;
export { 
	Maths, Quat, Vec3, Mat4, Transform
};