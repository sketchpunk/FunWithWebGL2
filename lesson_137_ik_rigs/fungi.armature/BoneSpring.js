import { Vec3, Quat, Transform } from "../fungi/maths/Maths.js";

//#################################################################
class BoneSpring{
	static init( priority = 700 ){
		App.Components.reg( BoneSpring );
		App.ecs.sys_add( BoneSpringSys, priority )
	}

	constructor(){
		this.sets		= new Array();
		this.do_reset	= true;
	}

	add( idx_ary, osc=1.0, damp=0.9, damp_inc=0, osc_inc=0){
		let i, o = { bones : new Array() };

		// If only passing in a single bone index, turn it into an array.
		if( !Array.isArray( idx_ary ) ) idx_ary = [ idx_ary ];

		for( i=0; i < idx_ary.length; i++ ){
            //if( !idx_ary[ i ] ){
            //  console.log( "Bone Idex", idx_ary[ i ]  );
            //    return this;
            //}

			o.bones.push( { 
				idx		: idx_ary[ i ], 
				spring	: new SemiImplicitEuler( osc + osc_inc * i, damp + damp_inc * i ), 
			});
		}

		this.sets.push( o );
		return this;
	}

	reset_all(){
		//console.log( "reset all" );
		let rig	= App.get_e( this.entity_id ).IKRig,
			pt	= new Transform(),
			pos = new Vec3(),
			i, sb, b, s;

        console.log( this.sets );
		for( i=0; i < this.sets.length; i++ ){
			s 	= this.sets[ i ];					// Get Bone Set
			b 	= rig.arm.bones[ s.bones[0].idx ];	// Root Bone
            console.log("x", s );
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Compute Parent's World Space Transform
			if( b.ref.Node.parent )
				b.ref.Node.parent.Node.get_world_transform( pt );
			else pt.clear();
			
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			for( sb of s.bones ){
				b = rig.arm.bones[ sb.idx ]; // Get Bone
				
				pt.add( b.local )
					.transform_vec( pos.set( 0, b.len, 0 ) );	// Use Bones local to compute, Then transform Tail Position
				
				sb.spring.reset( pos );	// Save resting position to spring
				//App.Debug.pnt( sb.spring.pos, "red" );
			}
		}

		this.do_reset = false;
		return this;
	}

	update( dt ){
		let rig		= App.get_e( this.entity_id ).IKRig,
			pt		= new Transform(),
			ct		= new Transform(),
			tail	= new Vec3(),
			ray_a 	= new Vec3(),
			ray_b 	= new Vec3(),
			rot 	= new Quat(),
			i, b, s, sb, s_pos;

		for( i=0; i < this.sets.length; i++ ){
			s 	= this.sets[ i ];					// Get Bone Set
			b 	= rig.arm.bones[ s.bones[0].idx ];	// Root Bone Node

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Compute Parent's World Space Transform
			if( b.ref.Node.parent )
				b.ref.Node.parent.Node.get_world_transform( pt );
			else pt.clear();
			
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			for( sb of s.bones ){
				b = rig.arm.bones[ sb.idx ]; 		// Get Bone Object ( use .ref for entity )
				
				//---------------------------
				// Compute ws for the bone, then using it to get ws tail position
				tail.set( 0, b.len, 0 )
				ct.from_add( pt, b.local ).transform_vec( tail );

				///App.Debug.pnt( tail, "green" );

				//---------------------------
				s_pos = sb.spring.update( dt, tail );			// Pass updated target to spring and update

				ray_a.from_sub( tail, ct.pos ).norm();			// Ray to Resting position
				ray_b.from_sub( s_pos, ct.pos ).norm();			// and to spring pos

				rot .from_unit_vecs( ray_a, ray_b )				// Create Rotation based on Rays
					.mul( ct.rot )								// Apply it to WS Bind Transfrom
					.pmul_invert( pt.rot );						// Convert it to local Space

				//---------------------------
				b.ref.Node.set_rot( rot );						// Save Results
				//pose.set_bone( bone.idx, rot );					
				pt.add( rot, b.local.pos, b.local.scl );		// Use new rotation to build the next parent ws transform for next bone
			}
		}

		return this;
	}
}

//#################################################################
function BoneSpringSys( ecs ){
	let n, ary = ecs.query_comp( "BoneSpring" );
	for( n of ary ){
		if( n.do_reset )	n.reset_all();
		else 				n.update( App.delta_time );
	}
}

//#################################################################
class SemiImplicitEuler{
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

// #region Save Incase
/*
class TensionSpring{
	constructor( t=2.0, d=1.2 ){
		this.vel = new Vec3();
		this.pos = new Vec3();
		this.tar = new Vec3();

		this.tension = t;
		this.damping = d;
		//this.mass		= 1;
		//this.mass_inv	= 1 / this.mass;	// a = f / m OR a = f * m_inv
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
	
	//{ type:"tension", tension:2.0, damp:1.2, tension_inc:0, damp_inc:0 }
	static from_config( c, inc=null ){
		return ( inc != null )?
			new TensionSpring( c.tension + (c.tension_inc || 0) * inc, c.damp + (c.damp_inc || 0) * inc ) :
			new TensionSpring( c.tension , c.damp );
	}


	set_target( p ){ this.tar.copy( p ); return this; }
	update( dt, target_pos=null ){
		if( target_pos ) this.tar.copy( target_pos );

		// Compute Acceleration, Add it to Velocity
		let ax	= -this.tension * ( this.pos[0] - this.tar[0] ), // * this.mass_inv,
			ay	= -this.tension * ( this.pos[1] - this.tar[1] ), // * this.mass_inv,
			az	= -this.tension * ( this.pos[2] - this.tar[2] ); // * this.mass_inv;

		this.vel[0] += ( ax - this.damping * this.vel[0] ) * dt;
		this.vel[1] += ( ay - this.damping * this.vel[1] ) * dt;
		this.vel[2] += ( ay - this.damping * this.vel[2] ) * dt;

		// Add Velocity to Position
		this.pos[0] += this.vel[0] * dt;
		this.pos[1] += this.vel[1] * dt;
		this.pos[2] += this.vel[2] * dt;
		return this.pos;
	}
}
*/

// #endregion

//#################################################################
export default BoneSpring;