import { AnimUtil } from "../fungi/lib/Animation.js";

class PoseAnimator{
	constructor(){
		this.clock 		= 0;
		this.root_idx 	= null;
		this.root_x 	= 0;
		this.root_z 	= 2;
	}

	/////////////////////////////////////////////////////////////////
	// CLOCK
	/////////////////////////////////////////////////////////////////
		
		tick( dt ){ this.clock += dt; return this; }
		reset( ){ this.clock = 0; return this; }

	/////////////////////////////////////////////////////////////////
	// POSE UPDATING
	/////////////////////////////////////////////////////////////////

		key_frame( ti, anim, pose ){
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( ti >= anim.frame_cnt ){ console.log("key frame index exceeds total key frames."); return this; }

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let q		= [0,0,0,0],
				v		= [0,0,0],
				qi 		= ti*4,
				vi 		= ti*3,
				track;

			for( track of anim.tracks ){
				if( ti >= anim.times[ track.time_idx ].length ) continue;

				switch( track.type ){
					case "rot": 
						AnimUtil.quat_buf_copy( track.data, q, qi );
						pose.set_bone( track.joint_idx, q ); 
						break;
					case "pos": 
						AnimUtil.vec3_buf_copy( track.data, v, vi );
						pose.set_bone( track.joint_idx, null, v );
						break;
				}
			}
		}

		// Run animation and save results to pose object
		update( anim, pose ){
			let f_times	= this._frame_times( anim ),
				q 		= [0,0,0,0],
				v		= [0,0,0],
				track, ft;

			for( track of anim.tracks ){
				ft = f_times[ track.time_idx ];

				switch( track.type ){
					// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
					case "rot":
						switch( track.interp ){
							case "STEP"	: AnimUtil.quat_buf_copy( track.data, q, ft.a_idx*4 ); break;
							default		: AnimUtil.quat_buf_blend( track.data, ft.a_idx*4, ft.b_idx*4, ft.time, q ); break;
						}
						pose.set_bone( track.joint_idx, q ); 
						break;

					// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
					case "pos":
						switch( track.interp ){
							case "STEP"	: AnimUtil.vec3_buf_copy( track.data, v, ft.a_idx*3 ); break;
							default		: AnimUtil.vec3_buf_lerp( track.data, ft.a_idx*3, ft.b_idx*3, ft.time, v ); break;
						}

						if( this.root_idx == track.joint_idx ){
							v[ this.root_x ] = 0;
							v[ this.root_z ] = 0;
						}

						pose.set_bone( track.joint_idx, null, v );
						break;
				}
			}

			return this;
		}

	/////////////////////////////////////////////////////////////////
	// PRIVATE
	/////////////////////////////////////////////////////////////////
		// Every animation can have multiple shared time tracks.
		// So we incrmement our animation clock, then for each time
		// track we find between which two frames does the time exist.
		// Then we normalized the time between the two frames.
		// Return: [ { a_idx, b_idx, time }, ... ];
		_frame_times( anim ){
			// Find the Frames for each group time.
			let j, i, time, fa, fb, ft,
				times	= anim.times,
				rtn		= new Array( anim.times.length ),
				clock 	= this.clock % anim.time;

			for( j=0; j < anim.times.length; j++ ){
				time = anim.times[ j ];

				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				// Find the first frame that is less then the clock.
				fa = 0;
				for( i=time.length-2; i > 0; i-- )
					if( time[i] < clock ){ fa = i; break; }

				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				// Normalize Time Between Frames
				fb = fa + 1;
				
				if( fb < time.length )	ft = ( clock - time[ fa ] ) / ( time[ fb ] - time[ fa ] );
				else{ 					ft = 0; fb = null; }

				rtn[ j ] = { a_idx:fa, b_idx:fb, time:ft };
			}
			return rtn;
		}
}

export default PoseAnimator;