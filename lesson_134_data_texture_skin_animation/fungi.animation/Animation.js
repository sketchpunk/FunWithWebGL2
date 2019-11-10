import App from "../fungi/engine/App.js";


class Animation{
	constructor( anim = null ){
		this.frame_cnt	= 0;
		this.time_max	= 0;
		this.times 		= null;
		this.tracks		= new Array();

		if( anim ) this.clone_from( anim );
	}

	////////////////////////////////////////////////////////////////////
	// 
	////////////////////////////////////////////////////////////////////
		add_time_array( tary ){
			// Create Main Array if not setup
			if( !this.times ) this.times = new Array();
			
			// Get Item Index then save.
			let i = this.times.length;
			this.times.push( tary );

			// Update max time.
			let n = tary[ tary.length-1 ];
			if( n > this.time_max ) this.time_max = n;

			// Update frame count
			if( tary.length > this.frame_cnt ) this.frame_cnt = tary.length;

			return i;
		}

		add_track( type, time_idx, interp, data ){
			let i = this.tracks.length;
			this.tracks.push({ type, time_idx, interp, data });
			return i;
		}

		add_joint_track( type, time_idx, joint_idx, interp, data ){
			let i = this.tracks.length;
			this.tracks.push({ type, time_idx, joint_idx, interp, data });
			return i;
		}

		clone_from( anim ){
			let a;
			this.frame_cnt	= anim.frame_cnt;
			this.time_max	= anim.time_max;
			this.times		= new Array();

			for( a of anim.times ) this.times.push( a.slice(0) );

			for( a of anim.tracks ){
				this.tracks.push({ 
					type 		: a.type, 
					time_idx	: a.time_idx, 
					interp		: a.interp, 
					data 		: a.data.slice( 0 ),
				});
			}

			return this;
		}

	/*///////////////////////////////////////////////////////////////
	Animation data is saved in a flat array for simplicity & memory sake. 
	Because of that can not easily use Quaternion / Vector functions. So 
	recreate any functions needed to work with a flat data buffer.
	///////////////////////////////////////////////////////////////*/

		static quat_buf_copy( buf, q, i ){ return q.set( buf[ i ], buf[ i+1 ], buf[ i+2 ], buf[ i+3 ] ); }

		// Special Quaternion NLerp Function. Does DOT checking & Fix
		static quat_buf_blend( buf, ai, bi, t, out ){
			let a_x = buf[ ai ],	// Quaternion From
				a_y = buf[ ai+1 ],
				a_z = buf[ ai+2 ],
				a_w = buf[ ai+3 ],
				b_x = buf[ bi ],	// Quaternion To
				b_y = buf[ bi+1 ],
				b_z = buf[ bi+2 ],
				b_w = buf[ bi+3 ],
				dot = a_x * b_x + a_y * b_y + a_z * b_z + a_w * b_w,
				ti 	= 1 - t,
				s 	= 1;

		    // if Rotations with a dot less then 0 causes artifacts when lerping,
		    // Can fix this by switching the sign of the To Quaternion.
		    if( dot < 0 ) s = -1;
			out[ 0 ] = ti * a_x + t * b_x * s;
			out[ 1 ] = ti * a_y + t * b_y * s;
			out[ 2 ] = ti * a_z + t * b_z * s;
			out[ 3 ] = ti * a_w + t * b_w * s;
			//console.log( "x", out );
			return out.norm();
		}

		//#############################################################

		static vec3_buf_copy( buf, v, i ){ return v.set( buf[ i ], buf[ i+1 ], buf[ i+2 ] ); }

		// basic vec3 lerp
		static vec3_buf_lerp( buf, ai, bi, t, out ){
			let ti = 1 - t;
			out[ 0 ] = ti * buf[ ai ]		+ t * buf[ bi ];
			out[ 1 ] = ti * buf[ ai + 1 ]	+ t * buf[ bi + 1 ];
			out[ 2 ] = ti * buf[ ai + 2 ]	+ t * buf[ bi + 2 ];
			return out;
		}
}


//#######################################################################
class AnimUtil{
	/*///////////////////////////////////////////////////////////////
	Animation data is saved in a flat array for simplicity & memory sake. 
	Because of that can not easily use Quaternion / Vector functions. So 
	recreate any functions needed to work with a flat data buffer.
	///////////////////////////////////////////////////////////////*/

		static quat_buf_copy( buf, q, i ){ return q.set( buf[ i ], buf[ i+1 ], buf[ i+2 ], buf[ i+3 ] ); }

		// Special Quaternion NLerp Function. Does DOT checking & Fix
		static quat_buf_blend( buf, ai, bi, t, out ){
			let a_x = buf[ ai ],	// Quaternion From
				a_y = buf[ ai+1 ],
				a_z = buf[ ai+2 ],
				a_w = buf[ ai+3 ],
				b_x = buf[ bi ],	// Quaternion To
				b_y = buf[ bi+1 ],
				b_z = buf[ bi+2 ],
				b_w = buf[ bi+3 ],
				dot = a_x * b_x + a_y * b_y + a_z * b_z + a_w * b_w,
				ti 	= 1 - t,
				s 	= 1;

		    // if Rotations with a dot less then 0 causes artifacts when lerping,
		    // Can fix this by switching the sign of the To Quaternion.
		    if( dot < 0 ) s = -1;
			out[ 0 ] = ti * a_x + t * b_x * s;
			out[ 1 ] = ti * a_y + t * b_y * s;
			out[ 2 ] = ti * a_z + t * b_z * s;
			out[ 3 ] = ti * a_w + t * b_w * s;
			//console.log( "x", out );
			return out.norm();
		}

		//#############################################################

		static vec3_buf_copy( buf, v, i ){ return v.set( buf[ i ], buf[ i+1 ], buf[ i+2 ] ); }

		// basic vec3 lerp
		static vec3_buf_lerp( buf, ai, bi, t, out ){
			let ti = 1 - t;
			out[ 0 ] = ti * buf[ ai ]		+ t * buf[ bi ];
			out[ 1 ] = ti * buf[ ai + 1 ]	+ t * buf[ bi + 1 ];
			out[ 2 ] = ti * buf[ ai + 2 ]	+ t * buf[ bi + 2 ];
			return out;
		}
}


//#######################################################################
export default Animation;
export { AnimUtil };

App.global["Animation"] = Animation;