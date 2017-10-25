import gl from "../gl.js"

class KBMCtrl{
	constructor(){
		this.canvas = gl.ctx.canvas;
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
		//this.canvas.addEventListener("mouseout",this.onMouseUp.bind(this));
		this.canvas.addEventListener("mousewheel", this.onMouseWheel.bind(this));

		document.addEventListener("keydown",this.onKeyDown.bind(this));
		document.addEventListener("keyup",this.onKeyUp.bind(this));

		this.onDownOverride = null;		//Optional, Allow the ability to swop event handlers or do whatever else before the evtHandlers do their job
		this._activeHandler = null;		//Handlers are like state machines, swop functionality when needed
		this._handlers = {};
		this._handlerStack = [];
		this._defaultHandler = null;
	}

	stackSwitch(name,data){
		if(this._activeHandler != null){
			this._handlerStack.push(this._activeHandler.name);
		}
		this.switchHandler(name,data);
	}

	unStack(){
		if(this._handlerStack.length > 0){
			this.switchHandler(this._handlerStack.pop()); //if we have a stacked item, switch to it.
		}else if(this._activeHandler != null && this._activeHandler.name != this._defaultHandler){
			this.switchHandler(this._defaultHandler,null);
		}
	}

	switchHandler(name,data){
		if(this._activeHandler.onDeactivate)	this._activeHandler.onDeactivate();
		this._activeHandler = this._handlers[name];
		if(this._activeHandler.onActive)		this._activeHandler.onActive(data);
		return this;
	}

	addHandler(name, h, active, isDefault){
		h.name = name;
		this._handlers[name] = h;

		if(active == true)		this._activeHandler = h;
		if(isDefault == true)	this._defaultHandler = name;

		return this;
	}
	
	setDownOverride(d){ this.onDownOverride = d; return this; }

	onMouseWheel(e){
		if(!this._activeHandler.onMouseWheel) return;

		e.preventDefault(); e.stopPropagation();

		var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail))); //Try to map wheel movement to a number between -1 and 1
		this._activeHandler.onMouseWheel(e,this,delta);
	}

	onMouseDown(e){
		e.preventDefault(); e.stopPropagation();

		this.initX = this.prevX = e.pageX - this.offsetX;
		this.initY = this.prevY = e.pageY - this.offsetY;

		if(this.onDownOverride != null){
			if(this.onDownOverride(e,this,this.initX,this.initY)) return true;
		}

		if(this._activeHandler.onMouseDown) this._activeHandler.onMouseDown(e,this,this.initX,this.initY);

		this.canvas.addEventListener("mousemove",this._boundMouseMove);
	}

	onMouseMove(e){
		e.preventDefault(); e.stopPropagation();

		var x = e.pageX - this.offsetX,	//Get X,y where the canvas's position is origin.
			y = e.pageY - this.offsetY,
			dx = x - this.prevX,		//Difference since last mouse move
			dy = y - this.prevY;

		if(this._activeHandler.onMouseMove) this._activeHandler.onMouseMove(e,this,x,y,dx,dy);
		this.prevX = x;
		this.prevY = y;
	}

	onMouseUp(e){
		e.preventDefault(); e.stopPropagation();

		var x = e.pageX - this.offsetX,	//Get X,y where the canvas's position is origin.
			y = e.pageY - this.offsetY,
			dx = x - this.prevX,		//Difference since last mouse move
			dy = y - this.prevY;

		this.canvas.removeEventListener("mousemove",this._boundMouseMove);
		if(this._activeHandler.onMouseUp) this._activeHandler.onMouseUp(e,this,x,y,dx,dy);
	}

	////console.log(e.key,e.keyCode,e.shiftKey,e.ctrlKey);
	onKeyDown(e){
		if(this._activeHandler.onKeyDown){
			e.preventDefault(); e.stopPropagation();
			this._activeHandler.onKeyDown(e,this,e.keyCode);
		}
	}

	onKeyUp(e){
		if(this._activeHandler.onKeyUp){
			this._activeHandler.onKeyUp(e,this,e.keyCode);
			e.preventDefault(); e.stopPropagation();
		}
	}
}

class KBMCtrl_Viewport{
	constructor(camera){
		var w = gl.width, h = gl.height;
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

export {KBMCtrl, KBMCtrl_Viewport}