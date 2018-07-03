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
		console.log("Create UBOs");
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

export default { launch, loadScene };