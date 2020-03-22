import Vec3 from "./Vec3.js";

class Vec3Spring{
	constructor( osc=1, damp=1, damp_time=0 ){
		this.vel = new Vec3();
		this.pos = new Vec3();
		this.tar = new Vec3();

		// Damp_ratio = Log(damp) / ( -osc_ps * damp_time ) 
		// Damp Time, in seconds to damp. So damp 0.5 for every 2 seconds.
		// Damp needs to be a value between 0 and 1, if 1, creates critical damping.
		this.osc_ps 	= Math.PI * 2 * osc;
		if( damp_time )	this.damping = Math.log( damp ) / ( -this.osc_ps * damp_time );
		else 			this.damping = damp;
	}

	reset( pos=null, tar=null, vel=null ){
		if( pos ) 	this.pos.copy( pos );
		else 		this.pos.set( 0,0,0 );

		if( tar ) 	this.tar.copy( tar );
		else 		this.tar.set( 0,0,0 );

		if( vel )	this.vel.copy( vel );
		else		this.vel.set( 0,0,0 );

		return this;
	}

	set_target( p ){ this.tar.copy( p ); return this; }
	update( dt, target_pos=null ){
		let a = -2.0 * dt * this.damping * this.osc_ps,
			b = dt * this.osc_ps * this.osc_ps;

        // Often need to change target, so make it optional on update to elimatate 1 function call.
		if( target_pos ) this.tar.copy( target_pos );

		// Compute Acceleration, Add it to Velocity
		this.vel[0] += ( a * this.vel[0] + b * ( this.tar[0] - this.pos[0] ) ); // * this.mass_inv;
		this.vel[1] += ( a * this.vel[1] + b * ( this.tar[1] - this.pos[1] ) ); // * this.mass_inv;
		this.vel[2] += ( a * this.vel[2] + b * ( this.tar[2] - this.pos[2] ) ); // * this.mass_inv;

		// Add Velocity to Position
		this.pos[0] += this.vel[0] * dt;
		this.pos[1] += this.vel[1] * dt;
		this.pos[2] += this.vel[2] * dt;
		return this.pos;
	}
}

export default Vec3Spring;