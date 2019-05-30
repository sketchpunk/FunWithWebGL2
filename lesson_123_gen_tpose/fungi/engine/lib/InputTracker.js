import App 	from "../App.js";
import gl	from "../../core/gl.js";


class InputTracker{
	constructor(){
		this.canvas		= gl.ctx.canvas;
		this.onInput	= null;

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		//Keyboard State Data
		this.keyState 		= []; //Keep track of the key state
		this.keyCount		= 0;
		this.arrowUp		= false;
		this.arrowDown		= false;
		this.arrowLeft		= false;
		this.arrowRight		= false;
		this.shift 			= false;
		this.ctrl 			= false;
		this.alt			= false;
		this.spaceBar		= false;

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		//Mouse State Data
		this.wheelUpdateOn	= 0;
		this.wheelValue		= 0;

		this.isMouseActive	= false;
		this.leftMouse		= false;
		this.middleMouse	= false;
		this.rightMouse		= false;
		this.coord 			= {
			x:0,	//current position
			y:0,
			ix:0,	//initial down position
			iy:0,
			px:0,	//previous move position
			py:0,
			idx:0,	//Delta since inital
			idy:0,
			pdx:0,	//Delta since previous
			pdy:0
		};

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		var box			= this.canvas.getBoundingClientRect();
		this.offsetX	= box.left;	//Help get X,Y in relation to the canvas position.
		this.offsetY	= box.top;

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		//Setup Mouse and Keyboard Event Listeners
		this._boundMouseMove = this.onMouseMove.bind(this); //Reused often, so save bound reference
		this.canvas.addEventListener("contextmenu",	this.onContextMenu );
		this.canvas.addEventListener("mousedown",	this.onMouseDown.bind(this) );
		this.canvas.addEventListener("mouseup",		this.onMouseUp.bind(this) );
		this.canvas.addEventListener("mouseout",	this.onMouseUp.bind(this) );
		this.canvas.addEventListener("mousewheel",	this.onMouseWheel.bind(this) );

		document.addEventListener("keydown",	this.onKeyDown.bind(this));
		document.addEventListener("keyup",		this.onKeyUp.bind(this));
	}

	//////////////////////////////////////////////////////////////////
	// MOUSE
	//////////////////////////////////////////////////////////////////
		toCoord( e ){ return [ e.pageX - this.offsetX, e.pageY - this.offsetY ]; }

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

		onContextMenu(e){ e.preventDefault(); e.stopPropagation(); return false; }

		onMouseWheel( e ){
			e.preventDefault(); e.stopPropagation();
			this.wheelValue		= Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail))); //Try to map wheel movement to a number between -1 and 1	
			this.wheelUpdateOn	= App.sinceStart;

			if( this.onInput ) this.onInput();
		}

		onMouseDown(e){
			e.preventDefault(); e.stopPropagation();

			this.coord.ix = this.coord.px = this.coord.x = e.pageX - this.offsetX;
			this.coord.iy = this.coord.py = this.coord.y = e.pageY - this.offsetY;
			this.coord.pdx = this.coord.idx = this.coord.pdy = this.coord.idy = 0;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			//If no mouse buttons was previously active, start tracking mouse move
			if(!this.leftButton && !this.middleButton && !this.rightButton){
				this.canvas.addEventListener("mousemove", this._boundMouseMove );
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			switch(e.which){
				case 1: this.leftMouse		= true; break;
				case 2: this.middleMouse	= true; break;
				case 3: this.rightMouse		= true; break;
			}

			this.isMouseActive = (this.leftMouse || this.middleMouse || this.rightMouse);

			if( this.onInput ) this.onInput();
		}

		onMouseMove(e){
			e.preventDefault(); e.stopPropagation();
			this.updateCoords(e);

			if( this.onInput ) this.onInput();
		}

		onMouseUp(e){
			e.preventDefault(); e.stopPropagation();
			this.updateCoords(e);

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			switch(e.which){
				case 1: this.leftMouse		= false; break;
				case 2: this.middleMouse	= false; break;
				case 3: this.rightMouse		= false; break;
			}

			this.isMouseActive = (this.leftMouse || this.middleMouse || this.rightMouse);

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			//If No mouse buttons are active, disable mouse move.
			if(!this.isMouseActive){
				this.canvas.removeEventListener("mousemove", this._boundMouseMove );
			}

			if( this.onInput ) this.onInput();
		}


	//////////////////////////////////////////////////////////////////
	// KEYBOARD
	//////////////////////////////////////////////////////////////////
		key( kCode ){ return ( this.keyState[kCode] == true ); }

		onKeyDown( e ){	//console.log( "KEY DOWN", e.keyCode );
			switch(e.keyCode){
				case 32: this.spaceBar		= true; break;
				case 37: this.arrowLeft		= true; break;
				case 38: this.arrowUp		= true; break;
				case 39: this.arrowRight	= true; break;
				case 40: this.arrowDown		= true; break;
				case 16: this.shift 		= true; break;
				case 17: this.ctrl 			= true; break;
				case 18: this.alt 			= true; break;
			}

			// Shift, Ctrl and Alt isn't to be counted as part of active keyboard activity.
			switch( e.keyCode ){
				case 16: case 17: case 18: break;
				default:
					this.keyState[ e.keyCode ] = true; 
					this.keyCount++;
				break;
			}

			if( this.onInput ) this.onInput();
		}

		onKeyUp( e ){
			switch(e.keyCode){
				case 32: this.spaceBar		= false; break;
				case 37: this.arrowLeft		= false; break;
				case 38: this.arrowUp		= false; break;
				case 39: this.arrowRight	= false; break;
				case 40: this.arrowDown		= false; break;
				case 16: this.shift 		= false; break;
				case 17: this.ctrl 			= false; break;
				case 18: this.alt 			= false; break;
			}

			// Shift, Ctrl and Alt isn't to be counted as part of active keyboard activity.
			switch( e.keyCode ){
				case 16: case 17: case 18: break;
				default:
					this.keyState[ e.keyCode ] = false;
					this.keyCount--;
				break;
			}

			if( this.onInput ) this.onInput();
		}
}

export default InputTracker;