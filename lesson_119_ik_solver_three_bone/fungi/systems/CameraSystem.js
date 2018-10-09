import Fungi			from "../Fungi.js";
import { Quat, Vec3 }	from "../Maths.js";
import { System }		from "../Ecs.js";
import Api 				from "../Api.js";

const LOOK_RATE 		= 0.002;
const ORBIT_RATE		= 0.003;
const PAN_RATE			= 0.008;
const KB_FORWARD_RATE	= -0.1;
const KB_ROTATE_RATE	= 0.04;

const FRAME_LIMIT		= 1;

class CameraSystem extends System{
	constructor(){
		super();

		this.isActive	= false;	//
		this.mode		= 1;		//Which Mouse Mode to use
		this.state_c	= false;	//State of the C button
		this.wheelChg	= null;

		//Keep track of inital state for mode
		this.initRotation = new Quat();	
		this.initPosition = new Vec3();

		//Track last mouse change, so if no change, dont handle mouse movements
		this.lastYChange = 0;
		this.lastXChange = 0;
	}


	update(ecs){
		//............................................
		//Handle Keyboard Input
		if(Fungi.input.keyCount > 0) this.handleKeyboard();

		//console.log(ecs);

		//............................................
		//Handle Mouse Wheel Change
		if(Fungi.input.wheelUpdateOn !== this.wheelChg){
			this.wheelChg = Fungi.input.wheelUpdateOn;

			let t = Fungi.camera.com.Transform,
				cc = (Fungi.input.isCtrl())? 5 : 1;

			t.position.add( Api.getLocalForward(Fungi.camera, null, KB_FORWARD_RATE * Fungi.input.wheelValue * cc) );
			t.isModified = true;
		}


		//............................................
		//Has mouse movement started, if so which mode to be in
		if(!Fungi.input.leftMouse){  //if(!Fungi.input.isMouseActive){
			this.isActive = false;		
			return;	
		}else if(!this.isActive){
			this.isActive = true;
			this.initRotation.copy( Fungi.camera.com.Transform.rotation );
			this.initPosition.copy( Fungi.camera.com.Transform.position );

			if(Fungi.input.keyState[16] == true)		this.mode = 0; // Shift - Pan Mode
			else if(Fungi.input.keyState[17] == true)	this.mode = 2; // Ctrl - Orbit Mode
			else 										this.mode = 1; // Look
		}


		//............................................
		//Only handle mouse Movements if there was a change since last frame.
		if(	this.lastYChange != Fungi.input.coord.idy || 
			this.lastXChange != Fungi.input.coord.idx ) this.handleMouse();

		this.lastYChange = Fungi.input.coord.idy;
		this.lastXChange = Fungi.input.coord.idx;
	}


	handleMouse(){
		let t = Fungi.camera.com.Transform,
			c = Fungi.input.coord;

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
				var euler = Quat.toEuler(this.initRotation);
				euler[0] += c.idy * LOOK_RATE;
				euler[1] += c.idx * LOOK_RATE;

				t.rotation.copy( Quat.fromEuler(null, euler[0], euler[1], 0, "YZX") );
				t.isModified = true;
			break;
			//------------------------------------ Orbit
			case 2:
				//Rotate the camera around X-Z
				var pos		= this.initPosition.clone(),
					lenXZ	= Math.sqrt(pos.x*pos.x + pos.z*pos.z),
					radXZ	= Math.atan2(pos.z, pos.x) + ORBIT_RATE * c.idx;

				pos[0]	= Math.cos(radXZ) * lenXZ;
				pos[2]	= Math.sin(radXZ) * lenXZ;

				//Then Rotate point around the the left axis
				var q = new Quat().setAxisAngle( Api.getLocalLeft(Fungi.camera) , -c.idy * ORBIT_RATE);
				Quat.rotateVec3(q, pos, pos);

				//Save New Position, then update rotation
				t.position.copy( pos );
				t.rotation.copy( Quat.lookRotation(pos, Vec3.UP) );
				t.isModified = true;
			break;
			//------------------------------------ Panning
			default:
				t.position.copy( new Vec3()
					.add( Api.getLocalUp(	Fungi.camera, null, PAN_RATE * c.idy) )		// Up-Down
					.add( Api.getLocalLeft(	Fungi.camera, null, PAN_RATE * -c.idx) )	// Left-Right
					.add( this.initPosition )											// Add Change to Inital Position
				);
				t.isModified = true;
			break;
		}
	}


	handleKeyboard(){
		let key	= Fungi.input.keyState,
			t	= Fungi.camera.com.Transform,
			ss	= (Fungi.input.isShift())? 5.0 : 1.0;

		//.......................................
		//C - Output Camera Position and Rotation
		//Only do operation on Key Up.
		if(!key[67] && this.state_c){
			this.state_c = false;

			let axis = t.rotation.getAxisAngle();
			console.log(".setPosition(%f, %f, %f)\n.setAxisAngle([%f,%f,%f], %f);", 
				t.position.x,t.position.y, t.position.z,
				axis[0], axis[1], axis[2], axis[3]
			);
			console.log("Camera Length: %f", t.position.length());
		}else if(key[67] && !this.state_c) this.state_c = true;

		//..................................... Forward / Backwards
		 // w - s
		if(key[87] || key[83]){
			let s = (key[87])? KB_FORWARD_RATE : -KB_FORWARD_RATE;
			t.position.add( Api.getLocalForward(Fungi.camera, null, s * ss) );
			t.isModified = true;
		}

		//..................................... Left / Right
		// A - D
		if(key[65] || key[68]){
			let s = (key[68])? -KB_FORWARD_RATE : KB_FORWARD_RATE;
			t.position.add( Api.getLocalLeft(Fungi.camera, null, s * ss) );
			t.isModified = true;
		}

		//..................................... Left / Right
		// Q - E
		if(key[81] || key[69]){
			let s = (key[69])? -KB_ROTATE_RATE : KB_ROTATE_RATE;

			Quat.mulAxisAngle(t.rotation, Vec3.UP, s * ss);
			t.isModified = true;
		}
	}
}


export default CameraSystem;