FungiApp = {
	renderLoop		:null,
	mainCamera		:null,
	ctrlCamera		:null,
	debugLines		:null,
	gridFloor		:null,
	uboTransform	:null,
	lblFPS			:null,
	scene			:[],

	startup:function(){
		Fungi.Init("FungiCanvas").fClearColor("FFFFFF").fFitScreen(1,1).fClear();

		this.uboTransform	= Fungi.Shaders.UBO.createTransformUBO();
		this.mainCamera		= new Fungi.CameraOrbit().setPosition(0,0.5,5).setEulerDegrees(-15,45,0);
		this.ctrlCamera		= new Fungi.KBMCtrl().addHandler("camera",new Fungi.KBMCtrl_Viewport(this.mainCamera),true);

		this.renderLoop		= new Fungi.RenderLoop(onRender);
		this.debugLines		= Fungi.Debug.Lines.getRenderable().update();
		this.gridFloor 		= Fungi.Debug.GridFloor.getRenderable()

		this.scene.push(this.debugLines,this.gridFloor);

		this.lblFPS = document.getElementById("lblFPS");
		setInterval(function(){ FungiApp.lblFPS.innerHTML = FungiApp.renderLoop.fps; },200);
	},

	update:function(){
		this.mainCamera.update();
		Fungi.gl.fClear();
	}
};