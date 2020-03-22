class InputTracker{
	constructor( elm ){
		this.elm		= elm;
		this.on_input	= null;

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
		// Touch State
		this.touch_cnt		= 0;
		this.touch_state	= 0;
		this.touch_ver		= 0;
		this.touch_map		= new Map();

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		var box			= this.elm.getBoundingClientRect();
		this.offsetX	= box.left;	//Help get X,Y in relation to the canvas position.
		this.offsetY	= box.top;

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		//Setup Mouse and Keyboard Event Listeners
		this._boundMouseMove = this.onMouseMove.bind(this); //Reused often, so save bound reference
		this.elm.addEventListener("contextmenu",	this.onContextMenu );
		this.elm.addEventListener("mousedown",	this.onMouseDown.bind(this) );
		this.elm.addEventListener("mouseup",		this.onMouseUp.bind(this) );
		this.elm.addEventListener("mouseout",	this.onMouseUp.bind(this) );
		this.elm.addEventListener("mousewheel",	this.onMouseWheel.bind(this) );

		document.addEventListener("keydown",	this.onKeyDown.bind(this));
		document.addEventListener("keyup",		this.onKeyUp.bind(this));

		this.elm.addEventListener( "touchstart", this.onTouchStart.bind(this) );
		this.elm.addEventListener( "touchmove", this.onTouchMove.bind(this) );
		this.elm.addEventListener( "touchend", this.onTouchEnd.bind(this) );
	}

	//////////////////////////////////////////////////////////////////
	// TOUCH
	//////////////////////////////////////////////////////////////////
	
	onTouchStart( e ){ 
		// e.touches, e.targetTouches, e.changedTouches
		let itm, idx, t = e.changedTouches;
		for( let i=0; i < t.length; i++ ){
			itm = t[ i ];
			idx = itm.identifier;

			this.touch_map.set( idx,{
				init	: [ itm.clientX, itm.clientY ],
				current	: [ itm.clientX, itm.clientY ],
				delta 	: [ 0, 0 ],
			});
		}

		this.touch_cnt		= e.touches.length;
		this.touch_state	= 1;
		this.touch_ver++;

		if( this.on_input ) this.on_input();
	}

	onTouchMove( e ){
		e.preventDefault();
		
		let tt, itm, idx, t = e.changedTouches;
		for( let i=0; i < t.length; i++ ){
			itm = t[ i ];
			idx = itm.identifier;
			tt 	= this.touch_map.get( idx );

			tt.current[ 0 ]	= itm.clientX;
			tt.current[ 1 ]	= itm.clientY;
			tt.delta[ 0 ]	= itm.clientX - tt.init[ 0 ];
			tt.delta[ 1 ]	= itm.clientY - tt.init[ 1 ];
		}

		this.touch_state = 2;
		this.touch_ver++;

		if( this.on_input ) this.on_input();
	}

	onTouchEnd( e ){
		let t = e.changedTouches;
		for( let i=0; i < t.length; i++ ) this.touch_map.delete( t[ i ].identifier );
		
		this.touch_cnt = e.touches.length;
		this.touch_ver++;

		if( this.touch_cnt == 0 )	this.touch_state = 0;
		else						this.touch_state = 1;

		if( this.on_input ) this.on_input();
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
			this.wheelUpdateOn++;

			if( this.on_input ) this.on_input();
		}

		onMouseDown(e){
			e.preventDefault(); e.stopPropagation();

			this.coord.ix = this.coord.px = this.coord.x = e.pageX - this.offsetX;
			this.coord.iy = this.coord.py = this.coord.y = e.pageY - this.offsetY;
			this.coord.pdx = this.coord.idx = this.coord.pdy = this.coord.idy = 0;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			//If no mouse buttons was previously active, start tracking mouse move
			if(!this.leftButton && !this.middleButton && !this.rightButton){
				this.elm.addEventListener("mousemove", this._boundMouseMove );
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			switch(e.which){
				case 1: this.leftMouse		= true; break;
				case 2: this.middleMouse	= true; break;
				case 3: this.rightMouse		= true; break;
			}

			this.isMouseActive = (this.leftMouse || this.middleMouse || this.rightMouse);

			if( this.on_input ) this.on_input();
		}

		onMouseMove(e){
			e.preventDefault(); e.stopPropagation();
			this.updateCoords(e);

			if( this.on_input ) this.on_input();
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
				this.elm.removeEventListener("mousemove", this._boundMouseMove );
			}

			if( this.on_input ) this.on_input();
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

			if( this.on_input ) this.on_input();
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

			if( this.on_input ) this.on_input();
		}
}

export default InputTracker;