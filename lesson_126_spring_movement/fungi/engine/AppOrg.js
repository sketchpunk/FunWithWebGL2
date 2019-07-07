import gl 			from "../core/gl.js";
import Shader 		from "../core/Shader.js";
import Material		from "../core/Material.js";
import Ubo			from "../core/Ubo.js";
import Cache  		from "../core/Cache.js";
import Vao 			from "../core/Vao.js";

import Page			from "./lib/Page.js";
import RenderLoop 	from "./RenderLoop.js";
import InputTracker from "./lib/InputTracker.js";

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


//######################################################
class App{
	//////////////////////////////////////////////
	// LOADERS
	//////////////////////////////////////////////
		static async launch( onDraw = null, getResources=false ){
			if( ! await init_gl() ) throw "GL Init Error";	// Create HTML Elements and GL Context
		
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			init_ecs();
			if( onDraw ) App.loop = new RenderLoop( onDraw, 0, App );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Setup Armature System if enabled.
			if( App.useArmature ){
				let ary = [];
				if( (App.useArmature & 1) == 1 ) ary.push( import( "../../fungi.armature/Armature.js" ).then( runModuleInit ) );
				if( (App.useArmature & 2) == 2 ) ary.push( import( "../../fungi.armature/ArmaturePreview.js" ).then( runModuleInit ) );
				await Promise.all( ary );
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( getResources ){
				return await import("./lib/Downloader.js").then( mod=>{
					mod.HandlerTypes.shader = ShaderHandler;
					return new mod.default(); 
				});
			}
		}

		static async loadModules(){
			let i, pAry = new Array( arguments.length );

			for(i=0; i < arguments.length; i++){
				pAry[ i ] = import( arguments[i] ).then( runModuleInit );
			}

			await Promise.all( pAry );
		}

		static async loadScene( useFloor=true, useDebug=false ){
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// CAMERA
			App.camera = App.ecs.entity( "MainCamera", [ "Node", "Camera" ] );		
			Camera.setPerspective( App.camera );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// MISC
			App.input = new InputTracker();

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// EXTRA MODULES
			let pAry = [];

			if( useFloor ) pAry.push( import( "../primitives/GridFloor.js").then( mod=>mod.default() ) );
			if( useDebug ) pAry.push( import( "./Debug.js").then( mod=>mod.default.init( App.ecs ) ) );
			if( pAry.length > 0 ) await Promise.all( pAry );
		}


	//////////////////////////////////////////////
	// ENTITY MANAGEMENT
	//////////////////////////////////////////////
		static $Node( name ){ return App.ecs.entity( name, "Node" ); }

		static $Draw( name, vao = null, mat = null, mode = 4 ){ 
			let e = App.ecs.entity( name, [ "Node", "Draw" ] );
			if( vao ) e.Draw.add( vao, mat, mode );
			return e;
		}

		static $Grp( name ){ 
			let e = App.ecs.entity( name, "Node" );
			e.add = function( e, updateLevels = true ){
				Node.addChild( this, e, updateLevels );
				return this;
			}
			return e;
		}
}


//######################################################

//////////////////////////////////////////////
// HELPERS
//////////////////////////////////////////////
	function SleepAsync( ms ){ return new Promise( resolve => setTimeout(resolve, ms) ); }

	function runModuleInit( mod ){
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


//////////////////////////////////////////////
// INITIALIZERS
//////////////////////////////////////////////
	async function init_gl(){
		Page.init();
		await SleepAsync( 50 ); // Need time for the new html elements to render to properly finish loading GL.

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
			"screenSize",		"vec2"
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

		//............................
		if( (App.useArmature) & 1 == 1 ){
			let ubo = new Ubo( "UBOArmature" );
			Ubo .addItem( ubo, "bones", "mat2x4", 90 )
				.addItem( ubo, "scale", "vec3", 90 )
				.addItem( ubo, "boneCount", "int" )
				.finalize( ubo, 4 );

			ubo.setItem( "boneCount", 2 );
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		return true;
	}

	function init_ecs(){
		App.ecs = new Ecs();

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// SYSTEMS
		NodeSystem.init( App.ecs );			// Handle Transform Heirachy
		CameraSystem.init( App.ecs );		// Just Camera Matrices
		DrawSystem.init( App.ecs );			// Render Enttities

		// Handle Input for controlling the camera
		App.cameraCtrl = CameraInputSystem.init( App.ecs );
	}


//////////////////////////////////////////////
// RESOURCE HANDLERS
//////////////////////////////////////////////
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


//######################################################
// GLOBAL VARIABLES
App.ecs				= null;		// Main ECS instances, Primarily the World Entity List.
App.loop			= null;		// Render Loop
App.camera			= null;		// Reference to the Main Camera for the view port
App.cameraCtrl		= null;		// Reference to the Camera Controller
App.input			= null;		// Handle Keeping Mouse and Keyboard state for application
App.cache			= Cache;	// Quick Access to Cache
App.node 			= Node;		// Quick Access to Node Static Functions

App.deltaTime		= 0;		// Time between frames
App.sinceStart		= 1;		// Time since the render loop started.

App.useArmature		= 0;		// Enable Armature Specific Features. 1 = Armature, 2 = Preview, 3 Both.

//######################################################
export default App;
export { Vao, Shader, Material, gl, Entity, System, Components };