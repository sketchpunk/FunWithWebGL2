import App from "../../App.js";
import Maths, { Vec3, Quat } from "../../maths/Maths.js";

const ORBIT_SCALE		= 0.2;
const WHEEL_SCALE		= 0.3;
const PAN_SCREEN_SCALE	= 0.003;

const MODE_ORBIT		= 0;
const MODE_PAN_SCREEN	= 1;

class OrbitCamera{
	static init( priority=1 ){
		App.cam_ctrl = new OrbitCamera();
		App.ecs.sys_add( App.cam_ctrl, priority );
	}

	constructor(){
		this.target_pos 	= new Vec3();
		this.init_tar_pos 	= new Vec3();
		this.init_cam_pos	= new Vec3();
		this.init_cam_up 	= new Vec3();	// Need This for Panning, once camera starts moving this changes which causes issues
		this.init_cam_left 	= new Vec3();
		this.init_distance	= 0;

		this.is_left_down	= false;
		this.wheel_update	= 0;
		this.touch_ver 		= 0;			// Touch Data Version
		this.touch_distance	= 0;			// Distance between two fingers in pinch guesture.

		this.last_x			= Infinity;
		this.last_y 		= Infinity;

		this.mode 			= 0;
	}

	run( ecs ){
		let cam	= App.camera.Node;
		if( !this.handle_touch( cam ) ) this.handle_mouse( cam );
	}

	//////////////////////////////////////////////////////
	//
	//////////////////////////////////////////////////////

		handle_mouse( cam ){
			let c	= App.input.coord;
			
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Determine Mouse Down / Up States
			if( !this.is_left_down && App.input.leftMouse ){
				this.is_left_down = true;

				// Save Initial Values
				this.init_cam_pos.copy( cam.local.pos );
				this.init_tar_pos.copy( this.target_pos );

				// Set which mouse movement to handle
				this.mode = ( App.input.shift )? MODE_PAN_SCREEN : MODE_ORBIT;

				if( this.mode == MODE_PAN_SCREEN ){
					cam.get_matrix_dir( 1, this.init_cam_left, 1 );
					cam.get_matrix_dir( 2, this.init_cam_up, 1 );
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

		handle_touch( cam ){
			if( App.input.touch_cnt == 0 || this.touch_ver == App.input.touch_ver ) return false;

			let i = App.input;

			switch( i.touch_state ){
				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				// ON TOUCH START
				case 1:
					this.init_cam_pos.copy( cam.local.pos );
					this.init_tar_pos.copy( this.target_pos );

					switch( i.touch_cnt ){
						case 2:
							let v = i.touch_map.values();
							let a = v.next().value.current;
							let b = v.next().value.current;

							this.touch_distance	= Math.sqrt( ( b[0] - a[0] ) ** 2 + ( b[1] - a[1] ) ** 2 );
							this.init_distance	= Vec3.len( cam.local.pos, this.target_pos );
							break;
						case 3:
							cam.get_matrix_dir( 1, this.init_cam_left, 1 );
							cam.get_matrix_dir( 2, this.init_cam_up, 1 );
						break;
					}
				break;

				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				// ON TOUCH MOVE
				case 2:
					const pan_scl = 4;

					let v = i.touch_map.values();
					let a = v.next().value;

					switch( i.touch_cnt ){
						// ORBIT
						case 1:	this.run_orbit( a.delta[0], a.delta[1] ); break;
						
						// SCREEN PANNING
						case 3:	this.run_pan_screen( a.delta[0] * pan_scl, a.delta[1] * pan_scl ); break;
						
						// PINCH ( ZOOM )
						case 2:
							const d_scl = 0.02;

							a 			= a.current;
							let b 		= v.next().value.current;
							let len 	= Math.sqrt( ( b[0] - a[0] ) ** 2 + ( b[1] - a[1] ) ** 2 );
							let delta	= ( len - this.touch_distance ) * d_scl;

							this.set_distance( this.init_distance - delta, false );
						break;
					}
				break;
			}

			this.touch_ver = i.touch_ver;
			return true;
		}

	//////////////////////////////////////////////////////
	//
	//////////////////////////////////////////////////////

		set_orbit( x, y, dist=null ){
			y = Maths.clamp( y, -89.999999, 89.999999 );

			let len = dist || Vec3.len( this.init_cam_pos, this.target_pos ),
				pos = Maths.polar_to_cartesian( x, y, len ),
				cam = App.camera.Node;

			cam.local.pos.from_add( pos, this.target_pos );
			cam.local.rot.from_look( pos, Vec3.UP );
			cam.updated = true;
			return this;
		}

		set_target( x, y, z ){
			this.target_pos.set( x, y, z );

			let cam = App.camera.Node,
				pos = Vec3.sub( cam.local.pos, this.target_pos );

			cam.local.rot.from_look( pos, Vec3.UP );
			cam.updated = true;
			return this;
		}

		set_distance( x, add_to=false ){
			let cam 	= App.camera.Node,
				delta	= Vec3.sub( cam.local.pos, this.target_pos ),
				len		= Math.max( 0.01, (add_to)? delta.len() + x : x );

			delta.norm().scale( len ).add( this.target_pos );

			cam.set_pos( delta ); 
			return this;
		}

	//////////////////////////////////////////////////////
	//
	//////////////////////////////////////////////////////
		
		run_orbit( dx=0, dy=0 ){
			let delta	= Vec3.sub( this.init_cam_pos, this.target_pos ),
				polar	= Maths.cartesian_to_polar( delta );

			if( dx ) polar[0] -= dx * ORBIT_SCALE;
			if( dy ) polar[1] += dy * ORBIT_SCALE;

			this.set_orbit( polar[0], polar[1] );
		}

		run_pan_screen( dx=0, dy=0 ){
			let pos	= new Vec3(),
				v	= new Vec3();

			if( dx ) pos.add( v.from_scale( this.init_cam_left, dx * -PAN_SCREEN_SCALE ) );
			if( dy ) pos.add( v.from_scale( this.init_cam_up, dy * PAN_SCREEN_SCALE ) );

			this.target_pos.from_add( this.init_tar_pos, pos );
			App.camera.Node.set_pos( pos.add( this.init_cam_pos ) );			
		}

		run_wheel(){
			let scl = ( App.input.shift )? 10 : 1;
			this.wheel_update = App.input.wheelUpdateOn;
			this.set_distance( App.input.wheelValue * WHEEL_SCALE * scl, true );
		}		
}

export default OrbitCamera;