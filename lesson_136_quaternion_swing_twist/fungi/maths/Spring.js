/*
// Check when the spring is done.
let dot = Quat.dot(cq, target);
if( dot >= 0.9999  && this._velLenSqr() < 0.000001 ){
	cq.copy( target );
	return;
}
*/

export default class{
	//############################################################################
	static accel_vec3( dt, tension, damp, pos_tar, pos_cur_o, vel_o ){
		// a = -tension * ( pos - to ) / mass;
		// vel += ( a - damping * vel ) * dt;
		vel_o[0] += (-tension * ( pos_cur_o[0] - pos_tar[0] ) - damp * vel_o[0]) * dt;
		vel_o[1] += (-tension * ( pos_cur_o[1] - pos_tar[1] ) - damp * vel_o[1]) * dt;
		vel_o[2] += (-tension * ( pos_cur_o[2] - pos_tar[2] ) - damp * vel_o[2]) * dt;

		pos_cur_o[0] += vel_o[ 0 ] * dt;
		pos_cur_o[1] += vel_o[ 1 ] * dt;
		pos_cur_o[2] += vel_o[ 2 ] * dt;

		return pos_cur_o;
	}

	static accel_quat( dt, tension, damp, rot_tar, rot_cur_o, vel_o ){
		// a = -tension * ( pos - to ) / mass;
		// vel += ( a - damping * vel ) * dt;
		vel_o[0] += (-tension * ( rot_cur_o[0] - rot_tar[0] ) - damp * vel_o[0]) * dt;
		vel_o[1] += (-tension * ( rot_cur_o[1] - rot_tar[1] ) - damp * vel_o[1]) * dt;
		vel_o[2] += (-tension * ( rot_cur_o[2] - rot_tar[2] ) - damp * vel_o[2]) * dt;
		vel_o[3] += (-tension * ( rot_cur_o[3] - rot_tar[3] ) - damp * vel_o[3]) * dt;

		rot_cur_o[0] += vel_o[ 0 ] * dt;
		rot_cur_o[1] += vel_o[ 1 ] * dt;
		rot_cur_o[2] += vel_o[ 2 ] * dt;
		rot_cur_o[3] += vel_o[ 3 ] * dt;

		return rot_cur_o.norm();
		// ( Quat.dot( rot_cur, rot_tar ) >= 0.9999  && vel_o.lenSqr() < 0.00001 ) How to tell when done.
	}

	//############################################################################
	static springy_vec3( dt, fr, dt_scale, tension, damp, pos_tar, pos_cur_o, vel_o ){
		// dt *= scale;
		// accel = -this.stiffness * ( at - to );
		// vel = ( this.vel + accel * dt ) * Math.pow( 1 - this.damping / this.frameRate, this.frameRate * dt ); 
		// at = at + vel * dt;
		dt				*= dt_scale;
		let p_damp 		= Math.pow( 1 - damp / fr, fr * dt ), // TODO : 1 - damp / fr, can be cached somewhere
			dt_tension	= -tension * dt;

		vel_o[0] = ( vel_o[0] + ( pos_cur_o[0] - pos_tar[0] ) * dt_tension ) * p_damp;
		vel_o[1] = ( vel_o[1] + ( pos_cur_o[1] - pos_tar[1] ) * dt_tension ) * p_damp;
		vel_o[2] = ( vel_o[2] + ( pos_cur_o[2] - pos_tar[2] ) * dt_tension ) * p_damp;

		pos_cur_o[0] += vel_o[ 0 ] * dt;
		pos_cur_o[1] += vel_o[ 1 ] * dt;
		pos_cur_o[2] += vel_o[ 2 ] * dt;

		return pos_cur_o;
	}

	static springy_quat( dt, fr, dt_scale, tension, damp, rot_tar, rot_cur_o, vel_o ){
		// dt *= scale;
		// accel = -this.stiffness * ( at - to );
		// vel = ( this.vel + accel * dt ) * Math.pow( 1 - this.damping / this.frameRate, this.frameRate * dt ); 
		// at = at + vel * dt;
		dt				*= dt_scale;
		let p_damp 		= Math.pow( 1 - damp / fr, fr * dt ), // TODO : 1 - damp / fr, can be cached somewhere
			dt_tension	= -tension * dt;

		vel_o[0] = ( vel_o[0] + ( rot_cur_o[0] - rot_tar[0] ) * dt_tension ) * p_damp;
		vel_o[1] = ( vel_o[1] + ( rot_cur_o[1] - rot_tar[1] ) * dt_tension ) * p_damp;
		vel_o[2] = ( vel_o[2] + ( rot_cur_o[2] - rot_tar[2] ) * dt_tension ) * p_damp;
		vel_o[3] = ( vel_o[3] + ( rot_cur_o[3] - rot_tar[3] ) * dt_tension ) * p_damp;

		rot_cur_o[0] += vel_o[ 0 ] * dt;
		rot_cur_o[1] += vel_o[ 1 ] * dt;
		rot_cur_o[2] += vel_o[ 2 ] * dt;
		rot_cur_o[3] += vel_o[ 3 ] * dt;

		return rot_cur_o.norm();
	}

	//############################################################################
	// http://box2d.org/files/GDC2011/GDC2011_Catto_Erin_Soft_Constraints.pdf
	// http://allenchou.net/2015/04/game-math-more-on-numeric-springing/
	// Ocs_ps = PI * 2 * i (I should not be over 10)
	// Damp_ratio = -Log(0.5) / ( osc_ps * damp_time ) :: Damp Time, in seconds to damp. So damp 0.5 for every 2 seconds.
	// Damp_ratio is using half life, but can replace log(0.5) with any log value between 0 and 1.
	static semi_implicit_euler_vec3( dt, osc_ps, damp_ratio, pos_tar, pos_cur_o, vel_o ){
		//vel += -2.0 * dt * damp_ratio * osc_ps * vel + dt * osc_ps * osc_ps * (to - pos);
		//pos += dt * vel;

		let a = -2.0 * dt * damp_ratio * osc_ps,
			b = dt * osc_ps * osc_ps;

		vel_o[0] += a * vel_o[0] + b * ( pos_tar[0] - pos_cur_o[0] );
		vel_o[1] += a * vel_o[1] + b * ( pos_tar[1] - pos_cur_o[1] );
		vel_o[2] += a * vel_o[2] + b * ( pos_tar[2] - pos_cur_o[2] );

		pos_cur_o[0] += dt * vel_o[0];
		pos_cur_o[1] += dt * vel_o[1];
		pos_cur_o[2] += dt * vel_o[2];

		return pos_cur_o;
	}

	static semi_implicit_euler_quat( dt, osc_ps, damp_ratio, rot_tar, rot_cur_o, vel_o ){
		//vel += -2.0 * dt * damp_ratio * osc_ps * vel + dt * osc_ps * osc_ps * (to - pos);
		//pos += dt * vel;
		let a = -2.0 * dt * damp_ratio * osc_ps,
			b = dt * osc_ps * osc_ps;

		vel_o[0] += a * vel_o[0] + b * ( rot_tar[0] - rot_cur_o[0] );
		vel_o[1] += a * vel_o[1] + b * ( rot_tar[1] - rot_cur_o[1] );
		vel_o[2] += a * vel_o[2] + b * ( rot_tar[2] - rot_cur_o[2] );
		vel_o[3] += a * vel_o[3] + b * ( rot_tar[3] - rot_cur_o[3] );

		rot_cur_o[0] += dt * vel_o[0];
		rot_cur_o[1] += dt * vel_o[1];
		rot_cur_o[2] += dt * vel_o[2];
		rot_cur_o[3] += dt * vel_o[3];

		return rot_cur_o.norm();
	}

	//############################################################################
	// http://box2d.org/files/GDC2011/GDC2011_Catto_Erin_Soft_Constraints.pdf
	// http://allenchou.net/2015/04/game-math-precise-control-over-numeric-springing/
	// Ocs_ps = PI * 2 * i
	// Damp_ratio = Log(damp) / ( -osc_ps * damp_time ) :: Damp Time, in seconds to damp. So damp 0.5 for every 2 seconds.
	// Damp needs to be a value between 0 and 1, if 1, creates criticle clamping.
	static implicit_euler_vec3( dt, osc_ps, damp_ratio, pos_tar, pos_cur_o, vel_o ){
		/*
		f		= 1.0 + 2.0 * dt * damp_ratio * osc_ps,
		dt_osc	= dt * osc_ps * osc_ps,
		dt2_osc	= dt * dt_osc,
		det_inv	= 1.0 / (f + dt2_osc),
		det_pos	= f * pos + dt * vel + dt2_osc * to,
		det_vel	= vel + dt_osc * (to - pos);
		pos 	= det_pos * det_inv;
		vel 	= det_vel * det_inv;
		*/

		let f		= 1.0 + 2.0 * dt * damp_ratio * osc_ps,	// TODO, F can be cached, anthing with DT can't.
			dt_osc	= dt * osc_ps * osc_ps,					// TODO, Can prob cache ocs_ps squared.
	 		dt2_osc	= dt * dt_osc,
			det_inv	= 1.0 / (f + dt2_osc);

		pos_cur_o[0] = ( f * pos_cur_o[0] + dt * vel_o[0] + dt2_osc * pos_tar[0] ) * det_inv;
		pos_cur_o[1] = ( f * pos_cur_o[1] + dt * vel_o[1] + dt2_osc * pos_tar[1] ) * det_inv;
		pos_cur_o[2] = ( f * pos_cur_o[2] + dt * vel_o[2] + dt2_osc * pos_tar[2] ) * det_inv;

		vel_o[0] = ( vel_o[0] + dt_osc * (pos_tar[0] - pos_cur_o[0]) ) * det_inv;
		vel_o[1] = ( vel_o[1] + dt_osc * (pos_tar[1] - pos_cur_o[1]) ) * det_inv;
		vel_o[2] = ( vel_o[2] + dt_osc * (pos_tar[2] - pos_cur_o[2]) ) * det_inv;

		return pos_cur_o;
	}

	static implicit_euler_quat( dt, osc_ps, damp_ratio, rot_tar, rot_cur_o, vel_o ){
		let f		= 1.0 + 2.0 * dt * damp_ratio * osc_ps,	// TODO, F can be cached, anthing with DT can't.
			dt_osc	= dt * osc_ps * osc_ps,					// TODO, Can prob cache ocs_ps squared.
	 		dt2_osc	= dt * dt_osc,
			det_inv	= 1.0 / (f + dt2_osc);

		rot_cur_o[0] = ( f * rot_cur_o[0] + dt * vel_o[0] + dt2_osc * rot_tar[0] ) * det_inv;
		rot_cur_o[1] = ( f * rot_cur_o[1] + dt * vel_o[1] + dt2_osc * rot_tar[1] ) * det_inv;
		rot_cur_o[2] = ( f * rot_cur_o[2] + dt * vel_o[2] + dt2_osc * rot_tar[2] ) * det_inv;

		vel_o[0] = ( vel_o[0] + dt_osc * (rot_tar[0] - rot_cur_o[0]) ) * det_inv;
		vel_o[1] = ( vel_o[1] + dt_osc * (rot_tar[1] - rot_cur_o[1]) ) * det_inv;
		vel_o[2] = ( vel_o[2] + dt_osc * (rot_tar[2] - rot_cur_o[2]) ) * det_inv;

		return rot_cur_o.norm();
	}
};