import { Vec3 } from "../maths/Maths.js";


class Vec3Spring{
	constructor( pos=null ){
		this.vel 		= new Vec3();
		this.pos 		= new Vec3();
		this.tar 		= new Vec3();

		this.mode 		= 0;	// Define which spring equation to use.
		this.osc_ps		= 0;	// used for semi-implicit euler
		this.tension	= 0;	
		this.damping	= 0;

		this.mass		= 1;
		this.mass_inv	= 1 / this.mass;	// a = f / m OR a = f * m_inv

		if( pos ) this.pos.copy( pos );
	}

	/////////////////////////////////////////////////////////////////
	// Setters
	/////////////////////////////////////////////////////////////////
		use_euler( osc=1, damp=1, damp_time=0 ){
			this.osc_ps = Math.PI * 2 * osc;

			// Damp_ratio = Log(damp) / ( -osc_ps * damp_time ) 
			// Damp Time, in seconds to damp. So damp 0.5 for every 2 seconds.
			// Damp needs to be a value between 0 and 1, if 1, creates critical damping.
			if( this.damp_time )	this.damping = Math.log( damp ) / ( -this.osc_ps * damp_time );
			else 					this.damping = damp;

			this.mode = 1;
			return this;
		}

		use_tension( tension=2.0, damp=1.2 ){
			this.tension	= tension;
			this.damping	= damp;
			this.mode		= 2;
			return this;
		}

		set_mass( m ){ this.mass = m; this.mass_inv = 1 / this.mass; return this; }
		set_pos( p ){ this.pos.copy( p ); return this; }
		set_target( p ){ this.tar.copy( p ); return this; }

		get_dir( s=1, out=null ){
			let mag = 1 / Math.sqrt( this.vel[0] ** 2 + this.vel[1] ** 2 + this.vel[2] ** 2 ) * s;

			out = out || new Vec3();
			return out.set( this.vel[0] * mag, this.vel[1] * mag, this.vel[2] * mag );
		}

	/////////////////////////////////////////////////////////////////
	//
	/////////////////////////////////////////////////////////////////
		update( dt ){
			switch( this.mode ){
				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				// semi-implicit euler
				case 1: 
					let a = -2.0 * dt * this.damping * this.osc_ps,
						b = dt * this.osc_ps * this.osc_ps;

					this.vel[0] += ( a * this.vel[0] + b * ( this.tar[0] - this.pos[0] ) ) * this.mass_inv;
					this.vel[1] += ( a * this.vel[1] + b * ( this.tar[1] - this.pos[1] ) ) * this.mass_inv;
					this.vel[2] += ( a * this.vel[2] + b * ( this.tar[2] - this.pos[2] ) ) * this.mass_inv;
					break;

				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				// Acceleration from Tension
				case 2: 
					let ax	= -this.tension * ( this.pos[0] - this.tar[0] ) * this.mass_inv,
						ay	= -this.tension * ( this.pos[1] - this.tar[1] ) * this.mass_inv,
						az	= -this.tension * ( this.pos[2] - this.tar[2] ) * this.mass_inv;

					this.vel[0] += ( ax - this.damping * this.vel[0] ) * dt;
					this.vel[1] += ( ay - this.damping * this.vel[1] ) * dt;
					this.vel[2] += ( ay - this.damping * this.vel[2] ) * dt;
					break;
			}

			this.pos[0] += this.vel[0] * dt;
			this.pos[1] += this.vel[1] * dt;
			this.pos[2] += this.vel[2] * dt;
			return this.pos;
		}
}


class Vec3SpringXX{
	constructor( osc_ps=1, damp_ratio=1, pos=null ){
		this.vel = new Vec3();
		this.pos = new Vec3( pos );
		this.tar = new Vec3();

		this.damp_ratio	= damp_ratio;
		this.osc_ps		= Math.PI * 2 * osc_ps; 
	}

	/////////////////////////////////////////////////////////////////
	// Setters
	/////////////////////////////////////////////////////////////////
		set_pos( p ){ this.pos.copy( p ); return this; }
		set_target( p ){ this.tar.copy(p); return this; }
		set_ocs( i ){ this.osc_ps = Math.PI * 2 * i; return this; }
		set_damp_raw( damp ){ this.damp_ratio = damp; return this; }
		set_damp( damp, damp_time ){ 
			// Damp_ratio = Log(damp) / ( -osc_ps * damp_time ) 
			// Damp Time, in seconds to damp. So damp 0.5 for every 2 seconds.
			// Damp needs to be a value between 0 and 1, if 1, creates criticle clamping.
			this.damp_ratio = Math.log(damp) / ( -this.osc_ps * damp_time ); 
			return this; 
		}

	/////////////////////////////////////////////////////////////////
	//
	/////////////////////////////////////////////////////////////////
		update( dt ){
			let a = -2.0 * dt * this.damp_ratio * this.osc_ps,
				b = dt * this.osc_ps * this.osc_ps;

			this.vel[0] += a * this.vel[0] + b * ( this.tar[0] - this.pos[0] );
			this.vel[1] += a * this.vel[1] + b * ( this.tar[1] - this.pos[1] );
			this.vel[2] += a * this.vel[2] + b * ( this.tar[2] - this.pos[2] );

			this.pos[0] += dt * this.vel[0];
			this.pos[1] += dt * this.vel[1];
			this.pos[2] += dt * this.vel[2];

			return this.pos;
		}
}

export default Vec3Spring;