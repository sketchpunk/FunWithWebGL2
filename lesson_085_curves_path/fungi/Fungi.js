import gl, { FBO }	from "./gl.js";
import CameraOrbit	from "./cameras/Orbit.js";
import GridFloor	from "./primitives/GridFloor.js";
import Quad			from "./primitives/Quad.js";
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

	deltaTime		:0,
	sinceStart		:0,

	//Begin the GL Context
	init:function(){ gl.set("FungiCanvas"); return this; },

	//Build all the main objects needed to get a scene up and running
	ready:function(renderHandler,opt=1){
		this.mainCamera		= new CameraOrbit().setPosition(0,0.5,2).setEulerDegrees(-15,10,0);
		this.ctrlCamera		= new KBMCtrl().addHandler("camera",new KBMCtrl_Viewport(this.mainCamera),true,true);

		this.renderLoop		= new RenderLoop(renderHandler);
		this.lblFPS			= document.getElementById("lblFPS");
		setInterval(function(){ this.lblFPS.innerHTML = this.renderLoop.fps; }.bind(this),200);

		if((opt & 1) == 1){
			this.gridFloor = GridFloor();
			this.scene.push(this.gridFloor);
		}

		//Setup Features
		if(opt){
			if((opt & 2) == 2) this.scene.push( this.debugLine = new VDebug() ); //DEBUG LINE RENDERER
			if((opt & 4) == 4) this.scene.push( this.debugPoint = new VDebug().drawPoints() ); //DEBUG POINT RENDERER
		}

		return this;
	},


	//Lesson 61 has example of how to do Deferred Rendering with MultiSample Render Buffers then Blits to Texture Buffers for final render
	setupDeferred:function(matName,onPre=null,onPost=null){
		var fbo = new FBO(); //FBO Struct Builder
		this.deferred = {
			quad : Quad(-1,-1,1,1,matName,"postQuad").setOptions(true,false),
			fboRender : fbo.create().texColorBuffer("bColor",0).texDepthBuffer().finalize("fboRender"),
			onPreRender : ()=>{ FBO.clear(this.deferred.fboRender,false); },
			onPostRender : ()=>{
				FBO.deactivate();
				this.render.prepareNext(this.deferred.quad).draw();
			}
		};

		if(onPre != null) this.render.onPreRender = onPre;
		if(onPost != null) this.render.onPostRender = onPost;
	},


	//Get a frame ready to be rendered.
	update:function(){
		this.mainCamera.update();

		gl.UBOTransform.update(
			"matCameraView",this.mainCamera.invertedLocalMatrix,
			"posCamera",this.mainCamera.getWorldPosition(),  //Because of Orbit, Position isn't true worldspace position, need to rotate , //this.mainCamera.position
			"fTime",new Float32Array( [this.sinceStart] )
		);

		gl.clear();
		return this;
	}
}