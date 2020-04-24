import App, {THREE}				from "../App.js";
import Maths, { Vec3, Quat }	from "../../fungi/maths/Maths.js";

const VEC = new THREE.Vector3(); // Temp var used to convert Fungi.Vec3 to THREE.Vector3

const ORBIT_SCALE 		= 0.07;
const WHEEL_SCALE 		= 0.1;
const PAN_SCREEN_SCALE	= 0.003;

const MODE_ORBIT		= 0;
const MODE_PAN_SCREEN	= 1;

class OrbitCamera{
	static init( priority=1 ){
		App.cam_ctrl = new OrbitCamera();
		App.ecs.sys_add( App.cam_ctrl, priority );
	}

	constructor(){
		this.active 		= true;

		this.target_pos 	= new Vec3();
		this.init_tar_pos 	= new Vec3();
		this.init_cam_pos	= new Vec3();
		this.init_cam_up 	= new Vec3();	// Need This for Panning, once camera starts moving this changes which causes issues
		this.init_cam_left 	= new Vec3();	

		this.is_left_down	= false;
		this.wheel_update	= 0;

		this.last_x			= Infinity;
		this.last_y 		= Infinity;

		this.mode 			= 0;
	}

	run( ecs ){
		if( !this.active ) return;

		let c = App.input.coord;
		
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Determine Mouse Down / Up States
		if( !this.is_left_down && App.input.leftMouse ){
			this.is_left_down = true;
			
			// Save Initial Values
			this.init_cam_pos.from_struct( App.camera.position );
			this.init_tar_pos.copy( this.target_pos );

			// Set which mouse movement to handle
			this.mode = ( App.input.shift )? MODE_PAN_SCREEN : MODE_ORBIT;

			if( this.mode == MODE_PAN_SCREEN ){
				// Camera's UP Direction
				VEC.set( 0, 1, 0 ).applyQuaternion( App.camera.quaternion );
				this.init_cam_up.from_struct( VEC );

				// Camera's Right Direction
				VEC.set( 1, 0, 0 ).applyQuaternion( App.camera.quaternion );
				this.init_cam_left.from_struct( VEC );
			}

		}else if( this.is_left_down && !App.input.leftMouse ) this.is_left_down = false;

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Handle Left Click Dragging
		if( this.is_left_down && (c.x != this.last_x || c.y != this.last_y) ){
			
			switch( this.mode ){
				case MODE_ORBIT:		this.run_orbit( c.idx, c.idy ); 		break;
				case MODE_PAN_SCREEN:	this.run_pan_screen( c.idx, c.idy ); 	break;
			}

			this.last_x = c.x;
			this.last_y = c.y;
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Hanle Wheel
		if( App.input.wheelUpdateOn !== this.wheel_update ) this.run_wheel();
	}

	//////////////////////////////////////////////////////
	//
	//////////////////////////////////////////////////////

		set_orbit( x, y, dist=null ){
			y = Maths.clamp( y, -89.999999, 89.999999 );

			let len = dist || Vec3.len( this.init_cam_pos, this.target_pos ),
				pos = Maths.polar_to_cartesian( x, y, len ).add( this.target_pos );

			App.camera.position.fromArray( pos );
			App.camera.lookAt( VEC.fromArray( this.target_pos ) );
			return this;
		}

		set_target( x, y, z ){
			this.target_pos.set( x, y, z );
			App.camera.lookAt( VEC.fromArray( this.target_pos ) );
			return this;
		}

		set_distance( x, add_to=false ){
			let cam 	= App.camera.Node,
				delta	= new Vec3().from_struct( App.camera.position ).sub( this.target_pos ),
				len		= Math.max( 0.01, (add_to)? delta.len() + x : x );

			delta.norm().scale( len ).add( this.target_pos );

			App.camera.position.fromArray( delta );
			return this;
		}

	//////////////////////////////////////////////////////
	//
	//////////////////////////////////////////////////////
		
		run_orbit( dx, dy ){
			let delta	= Vec3.sub( this.init_cam_pos, this.target_pos ),
				polar	= Maths.cartesian_to_polar( delta );

			if( dx != null ) polar[0] -= dx * ORBIT_SCALE;
			if( dy != null ) polar[1] += dy * ORBIT_SCALE;

			this.set_orbit( polar[0], polar[1] );
		}

		run_pan_screen( dx=0, dy=0 ){
			let pos	= new Vec3(),
				v	= new Vec3();

			if( dx ) pos.add( v.from_scale( this.init_cam_left, dx * -PAN_SCREEN_SCALE ) );
			if( dy ) pos.add( v.from_scale( this.init_cam_up, dy * PAN_SCREEN_SCALE ) );

			this.target_pos.from_add( this.init_tar_pos, pos );
			App.camera.position.fromArray( pos.add( this.init_cam_pos ) );		
		}

		run_wheel(){
			let scl = ( App.input.shift )? 10 : 1;
			this.wheel_update = App.input.wheelUpdateOn;
			this.set_distance( App.input.wheelValue * WHEEL_SCALE * scl, true );
		}		
}

export default OrbitCamera;