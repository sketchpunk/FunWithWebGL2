import gl			from "./gl.js";
import CameraOrbit	from "./cameras/Orbit.js";
import GridFloor	from "./primitives/GridFloor.js";
import Renderer		from "./util/Renderer.js";
import RenderLoop 	from "./util/RenderLoop.js";
import VDebug 		from "./entities/VisualDebugger.js";
import {KBMCtrl, KBMCtrl_Viewport} from "./util/KBMCtrl.js"

export default{
	render 			:Renderer,	//Main Render Function
	renderLoop		:null,		//Render loop
	lblFPS			:null,		//Html Element reference to a tag to update text of FPS

	mainCamera		:null,		//Main camera for the scene
	ctrlCamera		:null,		//Keyboard and Mouse controls for the camera
	
	debugLine		:null,		//Renderable used to help debug data or models
	debugPoint		:null,		//Same but with points.

	gridFloor		:null,		//Just a reference to the renderable for the grid floor.
	scene			:[],		//Array that holds the heirarchy of transforms / renderables.

	//Begin the GL Context
	init:function(){ gl.set("FungiCanvas"); return this; },

	//Build all the main objects needed to get a scene up and running
	ready:function(renderHandler,opt){
		this.mainCamera		= new CameraOrbit().setPosition(0,0.5,4).setEulerDegrees(-15,10,0);
		this.ctrlCamera		= new KBMCtrl().addHandler("camera",new KBMCtrl_Viewport(this.mainCamera),true,true);

		this.renderLoop		= new RenderLoop(renderHandler);
		this.lblFPS			= document.getElementById("lblFPS");
		setInterval(function(){ this.lblFPS.innerHTML = this.renderLoop.fps; }.bind(this),200);

		this.gridFloor = GridFloor();
		this.scene.push(this.gridFloor);

		//Setup Features
		if(opt){
			if(opt & 1 == 1) this.scene.push( this.debugLine = new VDebug() ); //DEBUG LINE RENDERER
			if(opt & 2 == 2) this.scene.push( this.debugPoint = new VDebug().drawPoints() ); //DEBUG POINT RENDERER
		}
	},

	//Get a frame ready to be rendered.
	update:function(){
		this.mainCamera.update();
		gl.clear();
		return this;
	}
}