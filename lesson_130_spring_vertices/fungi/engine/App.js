import gl 			from "../core/gl.js";
import Ubo			from "../core/Ubo.js";
import Cache  		from "../core/Cache.js";
import Vao 			from "../core/Vao.js";
import Shader 		from "../core/Shader.js";
import Material		from "../core/Material.js";
import Page			from "./lib/Page.js";

import Ecs, { Entity, System, Components } from "./Ecs.js";
import Camera, { CameraSystem }	from "./ecs/Camera.js";
import Node, { NodeSystem } 	from "./ecs/Node.js";
import { DrawSystem }			from "./ecs/Draw.js";
import CameraInputSystem		from "./ecs/CameraInputSystem.js";

/*
System Notes
001 - Input 
100 - Misc : DynamicVerts
700 - Physics
800 - Transform
801 - Camera
950 - Draw
1000 - Cleanup
*/

//##################################################################
let App = {
	ecs				: null,		// Main ECS instances, Primarily the World Entity List.
	loop			: null,		// Render Loop
	camera			: null,		// Reference to the Main Camera for the view port
	cameraCtrl		: null,		// Reference to the Camera Controller
	input			: null,		// Handle Keeping Mouse and Keyboard state for application
	cache			: Cache,	// Quick Access to Cache
	node 			: Node,		// Quick Access to Node Static Functions

	deltaTime		: 0,		// Time between frames
	sinceStart		: 1,		// Time since the render loop started.

	$Node	: ( name )=>{ return App.ecs.entity( name, "Node" ); },
	$Draw	: ( name, vao = null, mat = null, mode = 4 ) => { 
		let e = App.ecs.entity( name, [ "Node", "Draw" ] );
		if( vao ) e.Draw.add( vao, mat, mode );
		return e;
	},
	$Grp	: ( name ) => {
		let e = App.ecs.entity( name, "Node" );
		e.add = function( e, updateLevels = true ){
			Node.addChild( this, e, updateLevels );
			return this;
		}
		return e;
	}
};


//##################################################################
class AppBuilder{
	constructor(){
		this._queue		= new Array();
		this._promise	= null;
		this._reject 	= null;
		this._resolve	= null;
		this._ecs_setup	= new Array();
		this._mod_list	= new Array();
	}

	//////////////////////////////////////////////////////////
	// Promise Queue
	//////////////////////////////////////////////////////////
		add( f ){ this._queue.push( f ); return this; }
		add_task( f ){
			this.add(()=>{
				return new Promise((resolve,reject)=>{
					if( f() ) 	resolve(true);
					else		reject();
				});
			});
			return this;
		}

		build(){
			if( this._promise ){ console.log("Task is Active"); return null; }
			if( this._queue.length == 0 ){ console.log("No Tasks"); return null; }

			this._promise = new Promise((resolve, reject)=>{
				this._resolve	= resolve;
				this._reject	= reject;
				this._run();
			});

			return this._promise;
		}

		_done( err ){
			if( err )	this._reject();
			else		this._resolve();

			this._promise	= null;
			this._reject 	= null;
			this._resolve	= null;
		}

		async _run(){
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( this._queue.length == 0 ){ this._done(); return; }

			let isErr = false;
			while( this._queue.length > 0 ){
				let p = this._queue.shift();
				let ok = await p( this );
				if( !ok ){ isErr = true; break; }
			}

			this._done( isErr );
		}

	//////////////////////////////////////////////////////////
	// Predefined Tasks
	//////////////////////////////////////////////////////////
		download( func ){
			this.add(async()=>{
				let dl = await import("./lib/Downloader.js").then( mod=>{
					mod.HandlerTypes.shader = ShaderHandler;
					return new mod.default();
				});

				func( dl );
				return dl.start();
			});
			return this;
		}

		launch( layout=0 ){
			Page.init( layout );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Create a Task to Wait for Page to Load
			this.add(()=>{
				return new Promise( (r, e)=>{
					window.addEventListener("load", ()=>{ r(true); } );
				});
			});

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Create a task to handle things after page is loaded.
			this.add( init_gl );
			this.add( init_ecs );
			
			return this;
		}

		load_module( mPath ){ this._mod_list.push( mPath ); return this; }

		load_scene( useFloor=true, useDebug=false, is_dark=false ){
			this.add( async()=>{
				if( is_dark ) gl.setClearColor("#3a3a3a");

				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				// CAMERA
				App.camera = App.ecs.entity( "MainCamera", [ "Node", "Camera" ] );		
				Camera.setPerspective( App.camera );

				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				// EXTRA MODULES
				let pAry = [];
				pAry.push( import( "./lib/InputTracker.js").then( mod=>{ App.input = new mod.default() } ) );

				if( useFloor ) pAry.push( import( "../primitives/GridFloor.js").then( mod=>mod.default() ) );
				if( useDebug ) pAry.push( import( "./Debug.js").then( mod=>mod.default.init( App.ecs ) ) );
				if( pAry.length > 0 ) await Promise.all( pAry );
	
				return true;
			});
			return this;
		}

		load_armature( opt=3 ){
			App.armature_opt = opt;

			if( (opt & 2) == 2 ) this.load_module( "../../fungi.armature/ArmaturePreview.js" ); //ary.push( import( "../../fungi.armature/ArmaturePreview.js" ).then( run_module_init ) );
			if( (opt & 1) == 1 ){
				this.load_module( "../../fungi.armature/Armature.js" );
				this._ecs_setup.push( ()=>{
					let ubo = new Ubo( "UBOArmature" );
					Ubo .addItem( ubo, "bones", "mat2x4", 90 )
						.addItem( ubo, "scale", "vec3", 90 )
						.addItem( ubo, "boneCount", "int" )
						.finalize( ubo, 4 );

					ubo.setItem( "boneCount", 2 );
				});
			}
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
			this.add( async()=>{
				App.input.onInput = ()=>{ window.requestAnimationFrame( cb ); }
				cb();
				return true;
			});
			return this;
		}

		set_camera( ox=-15, oy=15, od=2.5, tx=0, ty=0.75, tz=0 ){
			this.add( async()=>{
				App.cameraCtrl.setTarget( tx, ty, tz ).setOrbit( ox, oy, od );
				return true;
			});
			return this;
		}
}


//##################################################################

function run_module_init( mod ){
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Run any System Init function if it exists
	let sys;
	for( let m in mod ){
		//console.log( m );
		if( m.endsWith("System") ){
			sys = mod[ m ];
			if( sys.init ) sys.init( App.ecs );
		}
	}

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Check if the default has an init Static function
	if( mod.default.init ) mod.default.init( App.ecs );
}

async function init_gl(){
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	if( !gl.init("pgCanvas") ) return false;

	let box = gl.ctx.canvas.getBoundingClientRect(); // if not enough sleep time, can not get correct size
	gl.setClearColor("#d0d0d0")
		.setSize( box.width, box.height )
		.clear();

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Setup UBOs
	Ubo.build( "UBOGlobal", 0, [
		"projViewMatrix",	"mat4",
		"cameraPos",		"vec3",
		"globalTime",		"float",
		"screenSize",		"vec2",
		"deltaTime",		"float",
	])	.setItem( "screenSize", [ gl.width, gl.height ] );

	//............................
	Ubo.build( "UBOModel", 1, [
		"modelMatrix",	"mat4",
		"normalMatrix",	"mat3",
	]);

	//............................
	Ubo.build( "UBOLighting", 2, [
		"lightPosition",	"vec3",  
		"lightDirection",	"vec3",
		"lightColor",		"vec3"
	])	.setItem( "lightPosition",	[  8.0,  4.0,  1.0 ] )
		.setItem( "lightDirection",	[ -8.0, -4.0, -1.0 ] )
		.setItem( "lightColor",		[  1.0,  1.0,  1.0 ] )
		.update();

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	return true;
}

async function init_ecs( bld ){
	App.ecs = new Ecs();

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Run speciual setups for ecs
	if( bld._ecs_setup.length > 0 ){
		for( let i=0; i < bld._ecs_setup.length; i++ ) bld._ecs_setup[i]();
	}
	
	// Load up
	if( bld._mod_list.length > 0 ){
		let ary = new Array();
		for( let i=0; i < bld._mod_list.length; i++ ){
			ary.push( import( bld._mod_list[i] ).then( run_module_init ) );
		}
		await Promise.all( ary );
	}

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// SYSTEMS
	NodeSystem.init( App.ecs );			// Handle Transform Heirachy
	CameraSystem.init( App.ecs );		// Just Camera Matrices
	DrawSystem.init( App.ecs );			// Render Enttities

	// Handle Input for controlling the camera
	App.cameraCtrl = CameraInputSystem.init( App.ecs );
	return true;
}


//##################################################################
// RESOURCE HANDLERS
class ShaderHandler{
	static load( dl ){
		let m, itm, json, shader;

		while( dl.shader.length > 0 ){
			itm = dl.shader.pop();

			// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Parse Download into Shader Json Data
			json = Shader.parse( itm.download );	
			if( json == null ) return false;

			// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Create Shader based on Data
			shader = Shader.buildFromJson( json );
			if( shader == null ) return false;

			// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Create Materials if they exist
			if( json.materials && json.materials.length ){
				for( m=0; m < json.materials.length; m++ ){
					Material.build( shader, json.materials[ m ] );
				}
			}
		}

		return true;
	}
}; ShaderHandler.priority = 50;


//##################################################################
export default App;
export { AppBuilder, Vao, Shader, Material, gl, Entity, System, Components, Ubo };