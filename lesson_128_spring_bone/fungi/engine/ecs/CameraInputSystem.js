import App						from "../App.js";
import { System }				from "../Ecs.js";
import Maths, { Quat, Vec3 }	from "../../maths/Maths.js";

//###########################################################################
const ORBIT_RATE		= 0.003;
const ORBIT_ZOOM 		= 0.4;
const PAN_RATE			= 0.008;
const PANY_RATE			= 0.08;
const LOOK_RATE 		= 0.002;
const KB_FORWARD_RATE	= -0.03;
const KB_ROTATE_RATE	= 0.02;

const MODE_ORBIT		= 0;
const MODE_PANXZ		= 1;
const MODE_PAN_SCREEN	= 2;
const MODE_LOOK			= 3;
	

//###########################################################################
const PI_HALF = 1.5707963267948966;

function polarToCartesian( lon, lat, radius, out) {
	out = out || new Vec3();

	let phi 	= ( PI_HALF - lat ), // 90 Degrees in Rad - Lat
		theta 	= ( lon + Math.PI );

	out[0] = -(radius * Math.sin(phi) * Math.sin(theta));
	out[1] = radius * Math.cos(phi);
	out[2] = radius * Math.sin(phi) * Math.cos(theta);
	return out;
}

function cartesianToPolar( v, out ){
	out = out || [0,0];
	var lon 	= Math.atan2( v[0], -v[2] ),
		length 	= Math.sqrt( v[0] * v[0] + v[2] * v[2] ),
		lat 	= Math.atan2( v[1], length );
	return [ lon, lat ]
}


//###########################################################################
class CameraInputSystem extends System{
	static init( ecs, priority = 1 ){ 
		let sys = new CameraInputSystem();
		ecs.sys_add( sys, priority );
		return sys;
	}

	constructor(){
		super();

		this.isActive	= false;	//
		this.mode		= 0;		//Which Mouse Mode to use
		this.state_c	= false;	//State of the C button
		this.wheelChg	= 0;

		//Keep track of inital state for mode
		this.initRotation	= new Quat();	
		this.initPosition	= new Vec3();
		this.initTarget		= new Vec3();

		this.targetPos 			= new Vec3( 0, 0, 0 );
		this.targetDistance		= 5;
		this.targetDistanceMin	= 0.1;

		//Track last mouse change, so if no change, dont handle mouse movements
		this.lastYChange = 0;
		this.lastXChange = 0;
	}

	run( ecs ){
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		if( App.input.keyCount > 0 ) this.handleKeyboard();		// Handle Keyboard Input

		// switch mode around.
		if( App.input.shift && App.input.ctrl ) this.mode = MODE_LOOK;
		else if( App.input.ctrl )				this.mode = MODE_PANXZ;
		else if( App.input.shift )				this.mode = MODE_PAN_SCREEN;
		else 									this.mode = MODE_ORBIT;

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Has mouse movement started, if so which mode to be in
		if( !App.input.leftMouse && this.isActive  ){
			this.isActive	= false;
			this.mode		= MODE_ORBIT;
			return;
		}else if( App.input.leftMouse && !this.isActive ){
			this.isActive = true;
			this.initRotation.copy( App.camera.Node.local.rot );
			this.initPosition.copy( App.camera.Node.local.pos );
			this.initTarget.copy( this.targetPos );
		}

		if( App.input.wheelUpdateOn !== this.wheelChg ) this.handleWheel();	// Handle Mouse Wheel Change

		// Only handle mouse Movements if there was a change since last frame.
		if(	(this.lastYChange != App.input.coord.idy || this.lastXChange != App.input.coord.idx ) 
			&& this.isActive ) this.handleMouse();

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		this.lastYChange = App.input.coord.idy;
		this.lastXChange = App.input.coord.idx;
	}

	/////////////////////////////////////////////////////////////////////////
	// Setters
	/////////////////////////////////////////////////////////////////////////
		setTarget( x, y, z, dis=null ){
			this.targetPos.set( x, y, z );
			this.initPosition.copy( this.targetPos );
			if( dis) this.targetDistance = dis;
			return this;
		}

		setOrbit( orbX=null, orbY=null, tDis=null ){
			if( tDis)	this.targetDistance = tDis;
			if( orbX )	orbX = Maths.toRad( orbX );
			if( orbY )	orbY = Maths.toRad( orbY );

			this.orbit( orbX, orbY );
			return this;
		}

	/////////////////////////////////////////////////////////////////////////
	// Camera Controls
	/////////////////////////////////////////////////////////////////////////
		
		// Move on the XZ plane by Delta
		panXZ( dx=null, dz=null ){
			let cpos	= this.initPosition.clone(),
				tpos	= this.initTarget.clone(),
				v		= new Vec3();

			if( dx != null ){
				App.node.getDir( App.camera, 1, v ).scale( dx );
				v.y = 0;
				tpos.add( v );
				cpos.add( v );
			}

			if( dz != null ){
				App.node.getDir( App.camera, 0, v ).scale( dz );
				v.y = 0;
				tpos.add( v );
				cpos.add( v );
			}

			this.targetPos.copy( tpos );
			App.camera.Node.local.pos.copy( cpos );
			App.camera.Node.isModified = true;
		}

		panXZ_inc( x=null, z=null ){
			let v = new Vec3();

			if( x != null ){
				App.node.getDir( App.camera, 1, v ).scale( x );
				v.y = 0;
				this.targetPos.add( v );
				App.camera.Node.local.pos.add( v );
			}

			if( z != null ){
				App.node.getDir( App.camera, 0, v ).scale( z );
				v.y = 0;
				this.targetPos.add( v );
				App.camera.Node.local.pos.add( v );
			}

			App.camera.Node.isModified = true;
		}

		// Move the target/camera on the Y by increment
		panY_inc( i ){
			this.targetPos.y += i;
			App.camera.Node.local.pos.y += i;
			App.camera.Node.isModified = true;
		}

		// Move target and Camera Screen's Forward Direction by Increments
		panForward( i ){
			let v = new Vec3();
			App.node.getDir( App.camera, 0, v ).scale( i );

			this.targetPos.add( v );
			App.camera.Node.addPos( v );
		}

		// Move Camera and Target based on Screen Direction by Delta Change
		panScreen( dx=null, dy=null, dz=null ){
			let cpos	= this.initPosition.clone(),
				tpos	= this.initTarget.clone(),
				v		= new Vec3();

			if( dx != null ){
				App.node.getDir( App.camera, 1, v ).scale( dx );
				tpos.add( v );
				cpos.add( v );
			}

			if( dy != null ){
				App.node.getDir( App.camera, 2, v ).scale( dy );
				tpos.add( v );
				cpos.add( v );
			}

			if( dz != null ){
				App.node.getDir( App.camera, 0, v ).scale( dz );
				tpos.add( v );
				cpos.add( v );
			}

			this.targetPos.copy( tpos );
			App.camera.Node.local.pos.copy( cpos );
			App.camera.Node.isModified = true;
		}

		// Move Camera and Target based on Screen Direction by Delta Change
		panScreen_inc( x=null, y=null, z=null ){
			let pos	= new Vec3(),
				v	= new Vec3();

			if( x != null ){
				App.node.getDir( App.camera, 1, v ).scale( x );
				pos.add( v );
			}

			if( y != null ){
				App.node.getDir( App.camera, 2, v ).scale( y );
				pos.add( v );
			}

			if( z != null ){
				App.node.getDir( App.camera, 0, v ).scale( z );
				pos.add( v );
			}

			this.targetPos.add( pos );
			App.camera.Node.local.pos.add( pos );
			App.camera.Node.isModified = true;
		}

		// Orbit Around target by delta
		orbit( dx=null, dy=null ){
			let delta = Vec3.sub( this.initPosition, this.targetPos ),
				polar = cartesianToPolar( delta );

			if( dx != null ) polar[0] += dx;
			if( dy != null ) polar[1] += dy;

			//TODO, Fix this, Pos + Target, then Look = Pos - Target, Do better.
			let pos		= polarToCartesian( polar[0], polar[1], this.targetDistance ).add( this.targetPos ),
				look	= Vec3.sub( pos, this.targetPos );

			App.camera.Node.local.pos.copy( pos );
			Quat.look( look, Vec3.UP, App.camera.Node.local.rot );
			App.camera.Node.isModified = true;

			//BETTER SOLUTION, FIX LAter.
			//this.camera.position.copy( pos ).add( this.targetPos );
			//this.camera.lookAt( pos.invert() );
		}

		// Orbit Around target by Inc
		orbit_inc( x=null, y=null ){
			let delta = Vec3.sub( App.camera.Node.local.pos, this.targetPos ),
				polar = cartesianToPolar( delta );

			if( x != null ) polar[0] += x;
			if( y != null ) polar[1] += y;

			let pos		= polarToCartesian( polar[0], polar[1], this.targetDistance ).add( this.targetPos ),
				look	= Vec3.sub( pos, this.targetPos );

			App.camera.Node.local.pos.copy( pos );
			Quat.look( look, Vec3.UP, App.camera.Node.local.rot );
			App.camera.Node.isModified = true;
		}

		// First Person Look Around by delta
		look( dx=null, dy=null ){
			let euler = Quat.toEuler( this.initRotation );
			
			if( dy != null ) euler[0] += dy;
			if( dx != null ) euler[1] += dx;

			Quat.fromEuler( App.camera.Node.local.rot, euler[0], euler[1], 0, "YZX" );
			App.camera.Node.isModified = true;
		}

		// Change Orbit distance by increment
		targetZoom( i ){
			this.targetDistance = Math.max( this.targetDistanceMin, this.targetDistance + i );
						
			let delta = Vec3.sub( App.camera.Node.local.pos, this.targetPos );	// Get Distance Vector
			delta.setLength( this.targetDistance ).add( this.targetPos );		// Resize and Append
			App.camera.Node.setPos( delta );									// Update Camera
		}


	/////////////////////////////////////////////////////////////////////////
	// Input Handlers
	////////////////////////////////////////////////////////////////////////

		handleWheel(){
			this.wheelChg = App.input.wheelUpdateOn;
			switch( this.mode ){
				case MODE_ORBIT: this.targetZoom( App.input.wheelValue * ORBIT_ZOOM ); break;
				case MODE_PANXZ: this.panY_inc( App.input.wheelValue * PANY_RATE ); break;
				case MODE_PAN_SCREEN: this.panForward( -App.input.wheelValue * PANY_RATE ); break;
			}
		}

		handleMouse(){
			let c = App.input.coord;
			switch( this.mode ){
				case MODE_ORBIT:		this.orbit( ORBIT_RATE * c.idx, ORBIT_RATE * c.idy ); break;
				case MODE_PANXZ:		this.panXZ( -c.idx * PAN_RATE, -c.idy * PAN_RATE ); break;
				case MODE_LOOK : 		this.look( c.idx * LOOK_RATE, c.idy * LOOK_RATE ); break;
				case MODE_PAN_SCREEN:	this.panScreen( -c.idx * PAN_RATE, c.idy * PAN_RATE ); break;
			}
		}

		handleKeyboard(){
			let w = App.input.keyState[87],
				s = App.input.keyState[83],
				a = App.input.keyState[65],
				d = App.input.keyState[68],
				q = App.input.keyState[81],
				e = App.input.keyState[69];

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Left and Forward Movement
			if( w || s || a || d ){
				let fwd = null, lft = null;

				if( w ) 		fwd = KB_FORWARD_RATE;
				else if( s )	fwd = -KB_FORWARD_RATE;

				if( a )			lft = KB_FORWARD_RATE;
				else if( d )	lft = -KB_FORWARD_RATE;

				if( !App.input.shift )	this.panXZ_inc( lft, fwd );
				else 					this.panScreen_inc( lft, null, fwd );
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Pan up or Down
			// Z - X 
			if( App.input.keyState[90] )		this.panY_inc( KB_ROTATE_RATE );
			else if( App.input.keyState[88] )	this.panY_inc( -KB_ROTATE_RATE );


			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Left/Right Orbit
			if( App.input.shift && q ) 		this.orbit_inc( null, KB_ROTATE_RATE );
			else if( App.input.shift && e )	this.orbit_inc( null, -KB_ROTATE_RATE );
			else if( q ) 					this.orbit_inc( KB_ROTATE_RATE );
			else if( e )					this.orbit_inc( -KB_ROTATE_RATE );


			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// C - Output Camera Position and Rotation
			// Only do operation on Key Up.
			if( !App.input.keyState[67] && this.state_c ){
				this.state_c = false;

				let axis = App.camera.Node.local.rot.getAxisAngle();
				console.log(".setPos(%f, %f, %f)\n.setRotAxis([%f,%f,%f], %f);", 
					App.camera.Node.local.pos.x, 
					App.camera.Node.local.pos.y, 
					App.camera.Node.local.pos.z,
					axis[0], axis[1], axis[2], axis[3]
				);

			}else if( App.input.keyState[67] && !this.state_c ) this.state_c = true;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// r - Reset Target
			if( App.input.keyState[82] ){
				let v = Vec3.sub( App.camera.Node.local.pos, this.targetPos );

				this.targetPos.set( 0, 0, 0 );
				App.camera.Node.setPos( v );
			}
		}
}


//###########################################################################
export default CameraInputSystem;