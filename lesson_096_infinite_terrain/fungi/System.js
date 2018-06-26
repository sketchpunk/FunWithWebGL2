import gl			from "./gl.js";
import Ubo			from "./Ubo.js";
import Fungi		from "./Fungi.js";
import Camera		from "./data/Camera_Perspective.js";
import Renderer 	from "./rendering/Renderer.js";
import RenderLoop 	from "./rendering/RenderLoop.js";
import Scene 		from "./rendering/Scene.js";
import Mat4			from "./maths/Mat4.js";

class System{

	//Setup GL Canvas and Uniform Blocks
	static gl_init(){
		//.........................................
		// Get GL Context
		if(!gl.init("FungiCanvas")) throw new Error("Unable to load canvas");

		//.........................................
		//Build UBOs
		System.UBOTransform = new Ubo("UBOTransform", 0)
			.addItems(
				"projViewMatrix",	"mat4",
				"cameraPos",		"vec3",
				"globalTime",		"float",
				"screenSize",		"vec2"
			)
			.finalize(false)
			.updateItem("screenSize", new Float32Array( [ gl.width, gl.height ] ) )
			.unbind();

		System.UBOLighting = new Ubo("UBOLighting", 1)
			.addItems( "lightPosition","vec3", "lightDirection", "vec3",  "lightColor","vec3" )
			.finalize(false)
			.updateItem("lightPosition",	new Float32Array([ 8.0, 4.0, 1.0 ]) )
			.updateItem("lightDirection",	new Float32Array([ -8.0, -4.0, -1.0 ]) )
			.updateItem("lightColor",		new Float32Array([ 1.0, 1.0, 1.0 ]) )
			.unbind();
	}


	//Begin the startup Process by downloading resources
	static async beginWithResources(dlAry){
		//.........................................
		// Download Modules for Download and Loading support
		var Downloader, Loader;
		await Promise.all([
			import("./net/Downloader.js").then( mod=>{ Downloader = mod.default; }),
			import("./data/Loader.js").then( mod=>{ Loader = mod.default; })
		]);

		//.........................................
		var dl 		= new Downloader(dlAry),
			isOk	= await dl.start();

		if(!isOk) throw new Error("Error Downloading");

		if(gl.ctx == null) System.gl_init();

		//....................................
		//Load Up Shaders
		var arySnippets	= Loader.getSnippets( dl.complete ),
			aryShaders	= Loader.parseShaders( dl.complete, arySnippets );

		if(aryShaders == null)
			throw new Error("Problems parsing shader text");
		
		if(!Loader.compileShaders(aryShaders))
			throw new Error("Failed compiling shaders");

		//....................................
		//Load Textures
		Loader.textures( dl.complete );
		
		//....................................
		//Load Materials
		Loader.materials( aryShaders );

		return true;
	}

	static darkScene(){
		gl.setClearColor("505050");

		for(var itm of Fungi.scene.items){
			if(itm.name == "GridFloor"){ itm.setMaterial("MatGridFloorDark"); break; }
		}
	}

	/* Start up the system
		Opt 1 == GridFloor()
		Opt 2 == KBM with Camera Controller
	*/
	static async startUp(onRender, opt=3){
		if(gl.ctx == null) System.gl_init();

		//.........................................
		Fungi.camera	= new Camera();
		Fungi.render	= new Renderer();
		Fungi.scene		= new Scene();

		if(onRender) Fungi.loop = new RenderLoop(onRender);
		
		//.........................................
		if( (opt & 1) == 1 ){
			await import("./primitives/GridFloor.js").then( 
				mod=>{ Fungi.scene.add( mod.default() ); }
			);
		}

		//.........................................
		if( (opt & 2) == 2 ){
			await import("./input/KBMController.js").then(
				mod=>{
					Fungi.controller = new mod.KBMController();
					Fungi.controller.addHandler("camera", new mod.CameraController(), true, true );
				}
			);
		}
	}


	//prepare scene and render frame
	static update(){
		//..............................................
		// Step : Update Camera and UBO
		System.GlobalTime[0] = Fungi.sinceStart;

		System.UBOTransform.bind()
			.updateItem("projViewMatrix",	Fungi.camera.getProjectionViewMatrix() )
			.updateItem("cameraPos",		Fungi.camera._position)
			.updateItem("globalTime",		System.GlobalTime )
			.unbind();

		//..............................................
		// Step : Perform Updates
		if( Fungi.scene.updateItems ){
			for(var i of Fungi.scene.updateItems) i.update(Fungi.deltaTime, Fungi.sinceStart);
		}

		return this;
	}

	static renderScene(){
		if( !Fungi.scene.renderItems )	Fungi.render.drawScene( Fungi.scene.items );
		else							Fungi.render.drawScene( Fungi.scene.renderItems );
		return this;
	}

};

System.UBOTransform = null; //Save reference, so no need to request it from Fungi in render loop
System.UBOLighting	= null;
System.GlobalTime 	= new Float32Array([0]); //Allocate this once for UBO and reuse for renderloop

export default System;