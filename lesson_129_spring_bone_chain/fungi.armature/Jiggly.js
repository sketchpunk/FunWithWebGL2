import App								from "../fungi/engine/App.js";
import { Entity, Components, System }	from "../fungi/engine/Ecs.js";
import Maths, { Vec3, Quat }			from "../fungi/maths/Maths.js";
import Transform						from "../fungi/maths/Transform.js";
import Spring							from "../fungi/maths/Spring.js";

//#########################################################################
class Jiggly{
	static $( e, damp=0.3, damp_time=0.9, osc_scale=0.5 ){
		if( e instanceof Entity && !e.Jiggly ) Entity.com_fromName( e, "Jiggly" );
		
		e.Jiggly
			.set_osc_scale( osc_scale )
			.set_damp_ratio( damp, damp_time );

		e.Jiggly.bone_tail.set( 0, e.Bone.length, 0 );
		e.Jiggly.reset_follow_pos();
		return e;
	}

	static $raw( e, damp_ratio=0.5, osc_scale=0.5 ){
		if( e instanceof Entity && !e.Jiggly ) Entity.com_fromName( e, "Jiggly" );
		
		e.Jiggly.set_osc_scale( osc_scale );
		e.Jiggly.damp_ratio = damp_ratio;
		e.Jiggly.bone_tail.set( 0, e.Bone.length, 0 );
		e.Jiggly.reset_follow_pos();
		return e;
	}


	constructor(){
		//this.active		= true;

		this.osc_ps		= Maths.PI_2;
		this.damp_ratio	= 1.0;
		this.follow_pos	= new Vec3();
		this.follow_vel	= new Vec3();
		this.bone_tail	= new Vec3();
	}

	set_osc_scale( s ){ this.osc_ps = Maths.PI_2 * s; return this; }
	set_damp_ratio( damp=0.3, damp_time=0.5 ){ this.damp_ratio = Math.log( damp ) / ( -this.osc_ps * damp_time ); return this; }

	reset_follow_pos(){
		let eb = App.ecs.entity_by_id( this.entityID ),
			wp = new Transform();

		//eb.Bone.arm_e_ref.Node.get_world_transform( wp, true );	// Get the Root Entity's World Transform

		eb.Node
			.get_world_transform( wp, false )				// Add the Bone's World Transform
			.add( eb.Bone.bind );

		wp.transformVec( this.bone_tail, this.follow_pos );
		return this;
	}
} Components(Jiggly);


//#########################################################################
function fSort_bone_lvl( a, b ){ 
	a = App.ecs.entity_by_id( a.entityID );
	b = App.ecs.entity_by_id( b.entityID );
	return (a.Node.level == b.Node.level)? 0 : (a.Node.level < b.Node.level)? -1 : 1; }

class JigglySystem extends System{
	static init( ecs, priority = 700 ){ ecs.sys_add( new JigglySystem(), priority ); }
	constructor(){ super(); }
	run( ecs ){
		let ary		= ecs.query_comp( "Jiggly", fSort_bone_lvl, "JigglySort" ),
			wp		= new Transform(),	// Calc World Space Transform
			ray_a	= new Vec3(),		
			ray_b	= new Vec3(),
			t_pos	= new Vec3(),		// Target Position
			q 		= new Quat(),		
			rot_inv	= new Quat(),		// Parent World Rotation, Inverted.
			j, 
			eb, 						// Entity Bone
			ea;							// Entity Armature

		App.debug.reset();

		for( j of ary ){
			eb	= App.ecs.entity_by_id( j.entityID );
			ea	= eb.Bone.arm_e_ref;

			//TODO, Checks if Jiggly should be active (ArmNode.isMod || Arm.isMod) maybe will work.

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			eb.Node.get_world_transform( wp, false );		// Get Bone's Parent WS Transform.
			
			wp.rot.invert( rot_inv );						// Invert Parent WS Rotation

			wp.add( eb.Bone.bind );							// Add Bone Bind Transform, For Complete Bone's WS Transform.
			wp.transformVec( j.bone_tail, t_pos );			// Use Transform to get WS Position of the bone's Tail.

			App.debug.point( t_pos, 6 );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Apply Spring Movement
			Spring.semi_implicit_euler_vec3( App.deltaTime, j.osc_ps, j.damp_ratio, t_pos, j.follow_pos, j.follow_vel );
			App.debug.point( j.follow_pos, 2 );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			ray_a.from_sub( t_pos, wp.pos ).norm();			// Ray from Bone Head to Tail's Resting Position
			ray_b.from_sub( j.follow_pos, wp.pos ).norm();	// Ray from Bone Head to Following Position.

			q	.from_unit_vecs( ray_a, ray_b )				// Rot angle of the 2 rays, axis on they're cross product.
				.mul( wp.rot )								// Apply Rot to WS Bind Transform
				.pmul( rot_inv );							// Mul Parent WS Rot to convert to Bone Local Space Rot.
			
			/*
			let v_lft 	= Vec3.cross( ray_b, j.follow_vel ).norm();
			let v_fwd 	= Vec3.cross( v_lft, ray_b ).norm();
			q	.from_axis( v_lft, ray_b, v_fwd )
				.pmul( rot_inv );
			*/

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			eb.Node.setRot( q );							// Set Rotation, set is Modified
			ea.Armature.isModified = true;					// Mark Armature as well.

			// TODO : Determine when Jiggly is done, so disable.
		}
	}
}


//#########################################################################
export default Jiggly;
export { JigglySystem };