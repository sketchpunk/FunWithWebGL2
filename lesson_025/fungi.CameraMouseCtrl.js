Fungi.CameraMouseCtrl = class{
	constructor(camera){
		var oThis = this;
		var box = Fungi.gl.canvas.getBoundingClientRect();
		this.canvas = Fungi.gl.canvas;						//Need access to the canvas html element, main to access events
		this.camera = camera;							//Reference to the camera to control
		
		this.rotRate = -500;							//How fast to rotate, degrees per dragging delta
		this.panRate = 5;								//How fast to pan, max unit per dragging delta
		this.zoomRate = 200;							//How fast to zoom or can be viewed as forward/backward movement
		
		this.yRotRate = this.rotRate / this.canvas.width * Math.PI/180;
		this.xRotRate = this.rotRate / this.canvas.height * Math.PI/180;
		this.xPanRate = this.panRate / this.canvas.width;
		this.yPanRate = this.panRate / this.canvas.height;
		this.zPanRate = this.zoomRate / this.canvas.height;

		this.offsetX = box.left;						//Help calc global x,y mouse cords.
		this.offsetY = box.top;

		this.initX = 0;									//Starting X,Y position on mouse down
		this.initY = 0;
		this.prevX = 0;									//Previous X,Y position on mouse move
		this.prevY = 0;

		this.onUpHandler = function(e){ oThis.onMouseUp(e); };		//Cache func reference that gets bound and unbound a lot
		this.onMoveHandler = function(e){ oThis.onMouseMove(e); }

		this.canvas.addEventListener("mousedown",function(e){ oThis.onMouseDown(e); });		//Initializes the up and move events
		this.canvas.addEventListener("mousewheel", function(e){ oThis.onMouseWheel(e); });	//Handles zoom/forward movement

		this.onDownOverride = null;
	}

	//Transform mouse x,y cords to something useable by the canvas.
	getMouseVec2(e){ return {x:e.pageX - this.offsetX, y:e.pageY - this.offsetY}; }

	//Begin listening for dragging movement
	onMouseDown(e){
		this.initX = this.prevX = e.pageX - this.offsetX;
		this.initY = this.prevY = e.pageY - this.offsetY;

		if(this.onDownOverride != null){
			if(this.onDownOverride(this.initX,this.initY)) return;
		}

		this.canvas.addEventListener("mouseup",this.onUpHandler);
		this.canvas.addEventListener("mousemove",this.onMoveHandler);
	}

	//End listening for dragging movement
	onMouseUp(e){
		this.canvas.removeEventListener("mouseup",this.onUpHandler);
		this.canvas.removeEventListener("mousemove",this.onMoveHandler);
	}

	onMouseWheel(e){
		var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail))); //Try to map wheel movement to a number between -1 and 1
		this.camera.position.z += delta * this.zPanRate;
	}

	onMouseMove(e){
		var x = e.pageX - this.offsetX,	//Get X,y where the canvas's position is origin.
			y = e.pageY - this.offsetY,
			dx = x - this.prevX,		//Difference since last mouse move
			dy = y - this.prevY;

		//When shift is being helt down, we pan around else we rotate.
		if(!e.shiftKey){
			this.camera.euler.y += dx * this.yRotRate;
			this.camera.euler.x += dy * this.xRotRate;
		}else{
			this.camera.position.x += -dx * this.xPanRate;
			this.camera.position.y += dy * this.yPanRate;
		}

		this.prevX = x;
		this.prevY = y;
	}
};

Fungi.KBMCtrl = class{
	constructor(){
		this.canvas = Fungi.gl.canvas;
		this.initX = 0;
		this.initY = 0;
		this.prevX = 0;
		this.prevY = 0;
		this._boundMouseMove = this.onMouseMove.bind(this);

		var box = this.canvas.getBoundingClientRect();
		this.offsetX = box.left;
		this.offsetY = box.top;

		this.canvas.addEventListener("mousedown",this.onMouseDown.bind(this));
		this.canvas.addEventListener("mouseup",this.onMouseUp.bind(this));
		this.canvas.addEventListener("mousewheel", this.onMouseWheel.bind(this));

		document.addEventListener("keydown",this.onKeyDown.bind(this));
		document.addEventListener("keyup",this.onKeyUp.bind(this));

		this.onDownOverride = null;		//Optional, Allow the ability to swop event handlers or do whatever else before the evtHandlers do their job
		this._activeHandler = null;		//Handlers are like state machines, swop functionality when needed
		this._handlers = {};
	}

	switchHandler(name){ this._activeHandler = this._handlers[name]; return this; }
	addHandler(name,h,active){
		this._handlers[name] = h;
		if(active == true) this._activeHandler = h;
		return this;
	}
	
	setDownOverride(d){ this.onDownOverride = d; return this; }

	onMouseWheel(e){
		if(!this._activeHandler.onMouseWheel) return;

		var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail))); //Try to map wheel movement to a number between -1 and 1
		this._activeHandler.onMouseWheel(e,this,delta);
	}

	onMouseDown(e){
		this.initX = this.prevX = e.pageX - this.offsetX;
		this.initY = this.prevY = e.pageY - this.offsetY;

		if(this.onDownOverride != null) this.onDownOverride(e,this,this.initX,this.initY);
		if(this._activeHandler.onMouseDown) this._activeHandler.onMouseDown(e,this,this.initX,this.initY);

		this.canvas.addEventListener("mousemove",this._boundMouseMove);
	}

	onMouseMove(e){
		var x = e.pageX - this.offsetX,	//Get X,y where the canvas's position is origin.
			y = e.pageY - this.offsetY,
			dx = x - this.prevX,		//Difference since last mouse move
			dy = y - this.prevY;

		if(this._activeHandler.onMouseMove) this._activeHandler.onMouseMove(e,this,x,y,dx,dy);
		this.prevX = x;
		this.prevY = y;
	}

	onMouseUp(e){
		var x = e.pageX - this.offsetX,	//Get X,y where the canvas's position is origin.
			y = e.pageY - this.offsetY,
			dx = x - this.prevX,		//Difference since last mouse move
			dy = y - this.prevY;

		this.canvas.removeEventListener("mousemove",this._boundMouseMove);
		if(this._activeHandler.onMouseUp) this._activeHandler.onMouseUp(e,this,x,y,dx,dy);
	}

	////console.log(e.key,e.keyCode,e.shiftKey,e.ctrlKey);
	onKeyDown(e){	if(this._activeHandler.onKeyDown)	this._activeHandler.onKeyDown(e,this,e.keyCode); }
	onKeyUp(e){		if(this._activeHandler.onKeyUp)		this._activeHandler.onKeyUp(e,this,e.keyCode); }
}

Fungi.KBMCtrl_Viewport = class{
	constructor(camera){
		var w = Fungi.gl.fWidth, h = Fungi.gl.fHeight;
		this.camera = camera;

		this.rotRate = -500;	//How fast to rotate, degrees per dragging delta
		this.panRate = 5;		//How fast to pan, max unit per dragging delta
		this.zoomRate = 200;	//How fast to zoom or can be viewed as forward/backward movement

		this.yRotRate = this.rotRate / w * Math.PI/180;
		this.xRotRate = this.rotRate / h * Math.PI/180;
		this.xPanRate = this.panRate / w;
		this.yPanRate = this.panRate / h;
		this.zPanRate = this.zoomRate / h;
	}

	onMouseWheel(e,ctrl,delta){ this.camera.position.z += delta * this.zPanRate; }
	onMouseMove(e,ctrl,x,y,dx,dy){
		//When shift is being helt down, we pan around else we rotate.
		if(!e.shiftKey){
			this.camera.euler.y += dx * this.yRotRate;
			this.camera.euler.x += dy * this.xRotRate;
		}else{
			this.camera.position.x += -dx * this.xPanRate;
			this.camera.position.y += dy * this.yPanRate;
		}
	}

	onKeyDown(e,ctrl,keyCode){
		switch(keyCode){		
			case 87: this.camera.position.z -= 2 * this.zPanRate; break;	//W
			case 83: this.camera.position.z += 2 * this.zPanRate; break;	//S
			case 65: this.camera.position.x -= 50 * this.xPanRate; break;	//A
			case 68: this.camera.position.x += 50 * this.xPanRate; break;	//D
			case 81: this.camera.euler.y += 10 * this.yRotRate; break;		//Q
			case 69: this.camera.euler.y -= 10 * this.yRotRate; break;		//E
		}
	}
}