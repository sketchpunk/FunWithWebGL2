import gl 		from "../gl.js";
import Fungi 	from "../Fungi.js";				//Needed for Camera Controller
import Quat 	from "../maths/Quat.js";	//Needed just for Rotating Camera
import Vec3 	from "../maths/Vec3.js";	//Needed just for Rotating Camera

class KBMController{
	constructor(){
		this.canvas	= gl.ctx.canvas;
		this.coord = {
			x:0,
			y:0,
			ix:0,	//initial down values
			iy:0,	
			idx:0,	//Delta since inital
			idy:0,
			px:0,	//previous value
			py:0,
			pdx:0,	//Delta since previous
			pdy:0
		}

		//.............................
		var box			= this.canvas.getBoundingClientRect();
		this.offsetX	= box.left;	//Help get X,Y in relation to the canvas position.
		this.offsetY	= box.top;
		
		//.............................
		//Setup Mouse and Keyboard Event Listeners
		//this.canvas.addEventListener("mouseout",this.onMouseUp.bind(this));
		this._boundMouseMove = this.onMouseMove.bind(this); //Reused often, so save bound reference

		this.canvas.addEventListener("mousedown",	this.onMouseDown.bind(this));
		this.canvas.addEventListener("mouseup",		this.onMouseUp.bind(this));
		this.canvas.addEventListener("mousewheel",	this.onMouseWheel.bind(this));
		document.addEventListener("keydown",		this.onKeyDown.bind(this));
		document.addEventListener("keyup",			this.onKeyUp.bind(this));

		//.............................
		this.onMouseStart 		= null;			//Optional, Allow the ability to swop event handlers or do whatever else before the evtHandlers do their job

		this._activeHandler		= null;			//Handlers are like state machines, swop functionality when needed
		this._handlers			= new Map();	
		this._handlerStack		= [];
		this._defaultHandler	= null;
	}

	//------------------------------------------------------
	// Handler Stack
		stackSwitch(name,data){
			if(this._activeHandler) this._handlerStack.push(this._activeHandler.name);
			this.switchHandler(name, data);
		}

		unStack(){
			if(this._handlerStack.length > 0){
				//if we have a stacked item, switch to it.
				this.switchHandler(this._handlerStack.pop()); 
			}else if(this._activeHandler != null && this._activeHandler.name != this._defaultHandler){
				this.switchHandler(this._defaultHandler,null);
			}
		}
	//endregion


	//------------------------------------------------------
	// Methods
		switchHandler(name,data){
			if(this._activeHandler.onDeactivate)	this._activeHandler.onDeactivate();
			this._activeHandler = this._handlers.get(name);

			if(this._activeHandler.onActive)		this._activeHandler.onActive(data);
			return this;
		}

		addHandler(name, h, active = false, isDefault = false){
			h.name = name;
			this._handlers.set(name, h);

			if(active == true)		this._activeHandler = h;
			if(isDefault == true)	this._defaultHandler = name;

			return this;
		}
		
		//setMouseStart(d){ this.onMouseStart = d; return this; }
	//endregion


	//------------------------------------------------------
	// Mouse
		updateCoords(e){
			//Current Position
			this.coord.x = e.pageX - this.offsetX;
			this.coord.y = e.pageY - this.offsetY;

			//Change since last
			this.coord.pdx = this.coord.x - this.coord.px;
			this.coord.pdy = this.coord.y - this.coord.py;

			//Change Since Initial
			this.coord.idx = this.coord.x - this.coord.ix;
			this.coord.idy = this.coord.y - this.coord.iy;		
		}

		onMouseWheel(e){
			if(!this._activeHandler.onMouseWheel) return;

			e.preventDefault(); e.stopPropagation();

			var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail))); //Try to map wheel movement to a number between -1 and 1
			this._activeHandler.onMouseWheel(e,this,delta);
		}

		onMouseDown(e){
			e.preventDefault(); e.stopPropagation();

			this.coord.ix = this.coord.px = this.coord.x = e.pageX - this.offsetX;
			this.coord.iy = this.coord.py = this.coord.y = e.pageY - this.offsetY;
			this.coord.pdx = this.coord.idx = this.coord.pdy = this.coord.idy = 0;

			if(this.onMouseStart &&
				this.onMouseStart(e, this, this.coord) ) return true;

			if(this._activeHandler.onMouseDown)
				this._activeHandler.onMouseDown( e, this, this.initX, this.initY );

			this.canvas.addEventListener("mousemove", this._boundMouseMove );
		}

		onMouseMove(e){
			e.preventDefault(); e.stopPropagation();
			this.updateCoords(e);

			if(this._activeHandler.onMouseMove) this._activeHandler.onMouseMove(e, this, this.coord);

			//Copy Current to Previous
			this.coord.px = this.coord.x;
			this.coord.py = this.coord.y;
		}

		onMouseUp(e){
			e.preventDefault(); e.stopPropagation();
			this.updateCoords(e);

			this.canvas.removeEventListener("mousemove",this._boundMouseMove);
			if(this._activeHandler.onMouseUp) this._activeHandler.onMouseUp(e, this, this.coord);
		}
	//endregion

	//------------------------------------------------------
	// Keyboard
		onKeyDown(e){
			if(this._activeHandler.onKeyDown){
				e.preventDefault(); e.stopPropagation();
				this._activeHandler.onKeyDown(e,this,e.keyCode);
			}
		}

		onKeyUp(e){
			if(this._activeHandler.onKeyUp){
				e.preventDefault(); e.stopPropagation();
				this._activeHandler.onKeyUp(e,this,e.keyCode);
			}
		}
	//endregion
}


class CameraController{
	constructor(){
		this.kbForwardRate	= -0.1;
		this.kbRotateRate	= 0.04

		this.mPanRate		= 0.008;
		this.mLookRate 		= 0.002;
		this.mOrbitRate		= 0.003;

		this.mode			= 0;
	}

	onMouseWheel(e, ctrl, delta){
		Fungi.camera.addPosition( Fungi.camera.forward(null, 
			this.kbForwardRate * delta * ((e.ctrlKey)? 5:1)
		) );
	}
	
	onMouseDown(e, ctrl, c){
		if(e.shiftKey) 		this.mode = 0; //Pan Mode
		else if(e.ctrlKey)	this.mode = 2; //Orbit Mode
		else				this.mode = 1; //Look Mode
	}

	onMouseMove(e, ctrl, c){
		switch(this.mode){
			//------------------------------------ LOOK
			case 1:
				//Quaternion Way
				//var pos = Fungi.camera.getPosition()
				//			.add( Fungi.camera.left(null, c.pdx * this.mLookRate) )
				//			.add( Fungi.camera.up(null, c.pdy * -this.mLookRate) )
				//			.add( Fungi.camera.forward() )
				//			.sub( Fungi.camera.getPosition() );

				//Works just as good without local position as a starting point then 
				//subtracting it to make a Direction vector
				//var pos = Fungi.camera.left(null, c.pdx * this.mLookRate)
				//			.add( Fungi.camera.up(null, c.pdy * -this.mLookRate) )
				//			.add( Fungi.camera.forward() );
				//Fungi.camera.rotation = Quat.lookRotation(pos, Vec3.UP);

				//Euler Way
				var euler = Quat.toEuler(Fungi.camera._rotation);
				euler[0] += c.pdy * this.mLookRate;
				euler[1] += c.pdx * this.mLookRate;

				Fungi.camera.rotation = Quat.fromEuler(null, euler[0], euler[1], 0, "YZX");
			break;

			//------------------------------------ Orbit
			case 2:
				//Rotate the camera around X-Z
				var pos		= Fungi.camera.getPosition(),
					lenXZ	= Math.sqrt(pos.x*pos.x + pos.z*pos.z),
					radXZ	= Math.atan2(pos.z, pos.x) + this.mOrbitRate * c.pdx;

				pos[0]	= Math.cos(radXZ) * lenXZ;
				pos[2]	= Math.sin(radXZ) * lenXZ;

				//Then Rotate point around the the left axis
				var q = new Quat().setAxisAngle(Fungi.camera.left(), -c.pdy * this.mOrbitRate);
				Quat.rotateVec3(q, pos);

				//Save New Position, then update rotation
				Fungi.camera.position	= pos;
				Fungi.camera.rotation	= Quat.lookRotation(pos, Vec3.UP);
			break;

			//------------------------------------ Panning
			default: 
				if(c.pdy != 0) Fungi.camera.addPosition( Fungi.camera.up(null, this.mPanRate * c.pdy) );
				if(c.pdx != 0) Fungi.camera.addPosition( Fungi.camera.left(null, this.mPanRate * -c.pdx) );
			break;
		}
	}
	
	onKeyDown(e, ctrl, keyCode){
		var ss = (e.shiftKey)? 5.0 : 1.0;
		switch(keyCode){
			case 67: //C Output Camera Position and Rotation
				var axis = Fungi.camera._rotation.getAxisAngle();
				console.log(".setPosition(%f, %f, %f)\n.setAxisAngle([%f,%f,%f], %f);", 
					Fungi.camera._position.x, Fungi.camera._position.y, Fungi.camera._position.z,
					axis[0], axis[1], axis[2], axis[3]
				);
				console.log("Camera Length: %f", Fungi.camera._position.length());
			//..................................... Forward / Backwards
			case 87: //W
			case 83: //S
				var s = (keyCode == 87)? this.kbForwardRate : -this.kbForwardRate;
				Fungi.camera.addPosition( Fungi.camera.forward(null,s * ss) );
				break;
			//..................................... Left / Right
			case 65: //A
			case 68: //D
				var s = (keyCode == 68)? -this.kbForwardRate : this.kbForwardRate;
				Fungi.camera.addPosition(  Fungi.camera.left(null,s * ss) );
				break;
			//..................................... Rotate from Top
			case 81: //Q
			case 69: //E
				var s = (keyCode == 69)? -this.kbRotateRate : this.kbRotateRate;
				//Fungi.camera.mulRotationAxis(Fungi.camera.up(), s * ss);
				Fungi.camera.mulRotationAxis(Vec3.UP, s * ss);
				break;
		}
	}
}

export { KBMController, CameraController };