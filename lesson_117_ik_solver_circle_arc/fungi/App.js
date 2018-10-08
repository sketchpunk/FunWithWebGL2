import gl			from "./gl.js";
import Fungi		from "./Fungi.js";
import Ubo			from "./Ubo.js";
import InputTracker	from "./input/InputTracker.js";
import RenderLoop	from "./RenderLoop.js";

import Ecs, { Components, Assemblages }	from "./Ecs.js";

import Camera			from "./components/Camera.js";
import TransformSystem	from "./systems/TransformSystem.js";
import RenderSystem		from "./systems/RenderSystem.js";
import CameraSystem		from "./systems/CameraSystem.js";

import Api 				from "./Api.js";


/* SYSTEM NOTES:
	CameraSystem		10
	Behaviour 			20

	DynamicVao			21
	DynamicVoxelSystem	21

	ArmatureSystem		50

	TransformSystem		100
	RenderSystem		200
*/


/////////////////////////////////////////////////////////////////////////////////
// Main Fungi App Startup Functions
/////////////////////////////////////////////////////////////////////////////////
async function launch(renderCallback, dlAry = null){
	/*==========================================================
	Download and Load Resources */
	if(dlAry && dlAry.length > 0) await loadResources(dlAry);

	if( !gl.ctx && !gl_launch() )	throw new Error("Unable to load canvas");	// Load WebGL


	/*==========================================================
	Start Loading up ECS Framework */
	Fungi.ecs = new Ecs();


	//.................................
	// Create Assemblages and in the process dynamiclly load and register components
	await Assemblages.add("Draw", ["Transform", "Drawable"] );


	//.................................
	// Load up default systems in the order they need to execute.
	Fungi.ecs.addSystem(new CameraSystem(),		10);
	Fungi.ecs.addSystem(new TransformSystem(),	100);
	Fungi.ecs.addSystem(new RenderSystem(),		200);


	/*==========================================================
	Fungi Setup */
	Fungi.components	= Components;
	Fungi.assemblages	= Assemblages;

	Fungi.camera = Fungi.ecs.newEntity("Camera", ["Transform", "Camera"]);
	Fungi.camera.com.Transform.setPosition(0,0,1);
	Camera.setProjection( Fungi.camera.com.Camera );

	Fungi.input = new InputTracker();
	if(renderCallback) Fungi.loop = new RenderLoop( renderCallback ) ;
}

async function loadResources(dlAry){
	//.................................
	// Download Modules for Download and Loading support
	let dl, Loader;
	await Promise.all([
		import("./net/Downloader.js").then(	mod=>{ dl		= new mod.default(dlAry); }),
		import("./data/Loader.js").then(	mod=>{ Loader	= mod.default; })
	]);

	if(! await dl.start() )			throw new Error("Error Downloading");		// Resource Downloading
	if( !gl.ctx && !gl_launch() )	throw new Error("Unable to load canvas");	// Load WebGL

	//.................................
	// Load Up Shaders
	var arySnippets	= Loader.getSnippets( dl.complete ),
		aryShaders	= Loader.parseShaders( dl.complete, arySnippets );

	if(aryShaders == null)					throw new Error("Problems parsing shader text");
	if(!Loader.compileShaders(aryShaders))	throw new Error("Failed compiling shaders");

	//....................................
	// Load Other Resources
	Loader.textures( dl.complete );
	Loader.materials( aryShaders );
}

function gl_launch(){
	/*..............................................
	Get GL Context*/
	if(!gl.init("FungiCanvas")) throw new Error("Unable to load canvas");

	/*..............................................
	Build UBOs */
		var UBOTransform = new Ubo("UBOTransform", 0)
			.addItems(
				"projViewMatrix",	"mat4",
				"cameraPos",		"vec3",
				"globalTime",		"float",
				"screenSize",		"vec2"
			).finalize()
			.updateItem("screenSize", new Float32Array( [ gl.width, gl.height ] ) )
			.updateGL();

		var UBOLighting = new Ubo("UBOLighting", 1)
			.addItems( "lightPosition","vec3",  "lightDirection","vec3",  "lightColor","vec3" )
			.finalize()
			.updateItem("lightPosition",	new Float32Array([  8.0,  4.0,  1.0 ]) )
			.updateItem("lightDirection",	new Float32Array([ -8.0, -4.0, -1.0 ]) )
			.updateItem("lightColor",		new Float32Array([  1.0,  1.0,  1.0 ]) )
			.updateGL();

		var UBOModel = new Ubo("UBOModel", 2)
			.addItems( "modelMatrix","mat4",  "normalMatrix","mat3" )
			.finalize();

		var UBOWorld = new Ubo("UBOWorld", 3)
			.addItems( "rotation","vec4", "position","vec3", "scale","vec3" )
			.finalize();

		var UBOArmature = new Ubo("UBOArmature", 4)
			.addItem( "joints", "mat2x4", 60)
			.addItem( "scale", "vec3", 60)
		.finalize();

	return true;
}


/////////////////////////////////////////////////////////////////////////////////
// Extra Optional Setups
/////////////////////////////////////////////////////////////////////////////////
async function loadScene(){
	await import("./primitives/GridFloor.js").then( 
		js=>{
			let eGridFloor = Fungi.ecs.newAssemblage("Draw", "GridFloor");
			eGridFloor.com.Drawable.vao 		= js.default.vao();
			eGridFloor.com.Drawable.drawMode 	= Fungi.LINE;
			eGridFloor.com.Drawable.material 	= Fungi.getMaterial("MatGridFloor");
		}
	);
}

function loadFPS(){
	let lblFPS = document.getElementById("lblFPS");
	setInterval(function(){ lblFPS.innerHTML = Fungi.loop.fps; }.bind(this),200);
}



/////////////////////////////////////////////////////////////////////////////////
// Load Optional Systems and their Components
/////////////////////////////////////////////////////////////////////////////////
async function useBehaviours( priority=20 ){
	await Promise.all([
		import("./components/Behaviour.js"),
		import("./systems/BehaviourSystem.js").then( mod=>{ Fungi.ecs.addSystem(new mod.default(), priority); })
	]);
}


async function useDynamicVao( useLine = false, usePoint = false, priority=21 ){
	let rtn = {};

	await Promise.all([
		import("./components/DynamicVao.js").then( mod=>{
			if(useLine)		rtn.line	= mod.default.initLine( Api.newDraw("eLine", "VecWColor") );
			if(usePoint)	rtn.point	= mod.default.initPoint( Api.newDraw("ePoint", "VecWColor") );
		}),
		import("./systems/DynamicVaoSystem.js").then( 
			mod=>{ Fungi.ecs.addSystem(new mod.default(), priority);
		})
	]);

	return rtn;
}


async function useTransformHierarchy( priority=100 ){
	await Promise.all([
		import("./components/Hierarchy.js"),
		import("./systems/TransformHierarchySystem.js").then( mod=>{ Fungi.ecs.addSystem(new mod.default(), priority); })
	]);

	await Assemblages.add("HDraw", ["Transform", "Drawable", "Hierarchy"] );
	Fungi.ecs.removeSystem("TransformSystem");

	//Add new function to API to quicly create a New Drawable
	Api.newHDraw = function(name, mat = null, vao = null, drawMode=null, cullFace=null){
		let out = Fungi.ecs.newAssemblage("HDraw", name);

		out.com.Drawable.vao = vao;

		if(drawMode != null) out.com.Drawable.drawMode = drawMode;
		if(cullFace != null) out.com.Drawable.options.cullFace = cullFace;
		if(mat) out.com.Drawable.material = Fungi.getMaterial(mat);

		return out;
	}
}


async function useTransformNode( priority=90 ){
	await Promise.all([
		import("./components/TransformNode.js"),
		import("./systems/TransformNodeSystem.js").then( mod=>{ mod.default.init( priority ); })
	]);
}

async function useArmature( priority=91 ){
	await Promise.all([
		import("../fungi.mod/armature_e/ArmatureSystem.js").then( mod=>{ mod.default.init( priority ); })
	]);
}


async function useMovement( priority=30 ){
	await Promise.all([
		Assemblages.add("Move", ["Movement", "Drawable", "Transform"]),
		import("./systems/MovementSystem.js").then( mod=>{ Fungi.ecs.addSystem(new mod.default(), priority); })
	]);	
}


export default { launch, loadScene, loadFPS, useBehaviours, useDynamicVao, useTransformHierarchy, useTransformNode, useArmature, useMovement };