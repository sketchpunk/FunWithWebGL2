import Maths, { Vec3, Quat }	from "../fungi/maths/Maths.js";

class Motion{
	static sin( e, speed, v_max, offset=Vec3.ZERO ){
		let t = 0;

		return ( dt )=>{
			let s = Math.sin( (t += speed * dt) );
			Vec3.scale( v_max, s, e.Node.local.pos ).add( offset );
			e.Node.isModified = true;
		}
	}

	static circle( e, speed, radius ){
		let t = 0;
		return ( dt )=>{
			t += speed * dt;

			let c = Math.cos( t );
			let s = Math.sin( t );

			e.Node.setPos( radius * c, 0, radius * s );
		}
	}

	static rnd_radius( e, speed, radius ){
		let v = new Vec3();
		return ( dt )=>{
			let p = e.Node.local.pos;

			if( Math.abs(Vec3.len_sqr( v, p )) < 0.00001 ){
				let r = Math.random() * radius;
				let a = Math.random() * Maths.PI_2;
				v.set( r * Math.cos( a ), 0, r * Math.sin( a ) );
			}

			p.lerp( v, speed );
			e.Node.isModified = true;
		}
	}

	static axis_sin_rot( e, speed, axis, max_ang ){
		let rad		= max_ang * Math.PI / 180;
		let org_rot = e.Node.local.rot.clone();
		let t 		= 0;
		let q 		= new Quat();

		return ( dt )=>{
			let a = rad * Math.sin( (t += speed * dt) );
			
			q.setAxisAngle( axis, a ).mul( org_rot );
			e.Node.setRot( q );
		}
	}

	static noise_pos( e, speed, min, max, scale=1 ){
		let noise	= SimpleNoise1D( 1, scale );
		let x 	 	= 0;
		let y 		= 45;
		let z 		= 92;
		let range 	= [ ( max[0] - min[0] ), 
						( max[1] - min[1] ),
						( max[2] - min[2] ) ];

		return ( dt )=>{
			dt	*= speed;
			x	+= dt;
			y	+= dt;
			z	+= dt;
			e.Node.local.pos.set(
				noise( x ) * range[0] + min[0],
				noise( y ) * range[1] + min[1],
				noise( z ) * range[2] + min[2]
			);
			e.Node.isModified = true;
		}
	}

	static noise_rot( e, speed, min, max, scale=1 ){
		let noise	= SimpleNoise1D( 1, scale );
		let euler 	= [0,47,92];
		let q 		= new Quat();
		let range 	= [ ( max[0] - min[0] ), 
						( max[1] - min[1] ),
						( max[2] - min[2] ) ];

		return ( dt )=>{
			dt			*= speed;
			euler[ 0 ]	+= dt;
			euler[ 1 ]	+= dt;
			euler[ 2 ]	+= dt;

			e.Node.local.rot.from_euler( 
				noise( euler[ 0 ] ) * range[0] + min[0],
				noise( euler[ 1 ] ) * range[1] + min[1],
				noise( euler[ 2 ] ) * range[2] + min[2],
			);
			e.Node.isModified = true;
		}
	}

	static lerp_pos( e, apos, bpos, time ){
		let tt = 0;

		return ( dt )=>{
			tt	+= dt;
			e.Node.local.pos.from_lerp( 
				sine_InOut( (tt % time) / time ), 
				apos, 
				bpos
			);
			e.Node.isModified = true;
		}
	}

}

function sine_InOut(k){ return 0.5 * (1 - Math.cos(Math.PI * k)); }

//https://www.michaelbromley.co.uk/blog/simple-1d-noise-in-javascript/
function SimpleNoise1D( amplitude=1, scale=1 ){ // 1, 0.3
    const MAX_VERTICES		= 256;
    const MAX_VERTICES_MASK	= MAX_VERTICES -1;

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    let r = [];
    for ( let i=0; i < MAX_VERTICES; ++i ) r.push( Math.random() );

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    return ( x ) => {
		var scaledX				= x * scale,
			xFloor				= Math.floor( scaledX ),
			t					= scaledX - xFloor,
			tRemapSmoothstep	= t * t * ( 3 - 2 * t ),
			xMin				= xFloor % MAX_VERTICES_MASK,
        	xMax				= ( xMin + 1 ) % MAX_VERTICES_MASK,
        	y					= r[ xMin ] * (1-tRemapSmoothstep) + r[ xMax ] * tRemapSmoothstep;;
        return y * amplitude;
    }
}

export default Motion;