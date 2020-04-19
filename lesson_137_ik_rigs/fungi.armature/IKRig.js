import Vec3 from "../fungi/maths/Vec3.js";
import Quat from "../fungi/maths/Quat.js";

//#########################################################

class IKRig{
	constructor(){
		this.arm 	= null;		// Reference back to Armature Component
		this.tpose	= null;		// TPose or Bind Pose, TPose is better for IK
		this.pose	= null;		// Pose object to manipulate before applying to bone entities
		this.chains = {};		// Bone Chains, Usually Limbs / Spine / Hair / Tail
		this.points = {};		// Main Single Bones of the Rig, like Head / Hip / Chest

		this.leg_len_lmt = 0;
	}

	// #region METHODS
	apply_pose(){ this.pose.apply(); }
	update_world(){ this.pose.update_world(); }
	// #endregion ////////////////////////////////////////////////

	// #region MANAGE RIG DATA
	init( tpose=null, use_node_offset=false, arm_type=1 ){
		let e = App.get_e( this.entity_id );

		this.arm	= e.Armature;
		this.pose	= this.arm.new_pose();
		this.tpose	= tpose || this.arm.new_pose(); // If Passing a TPose, it must have its world space computed.

		//-----------------------------------------
		// Apply Node's Starting Transform as an offset for poses.
		// This is only important when computing World Space Transforms when
		// dealing with specific skeletons, like Mixamo stuff.
		// Need to do this to render things correctly
		if( use_node_offset ){
			let l = ( e.Obj )? e.Obj.get_transform() : e.Node.local; // Obj is a ThreeJS Component

			this.pose.set_offset( l.rot, l.pos, l.scl );
			if( !tpose ) this.tpose.set_offset( l.rot, l.pos, l.scl );
		}

		//-----------------------------------------
		// If TPose Was Created by Rig, it does not have its world
		// Space Computed. Must do this after setting offset to work right.
		if( !tpose ) this.tpose.update_world();

		//-----------------------------------------
		// Auto Setup the Points and Chains based on
		// Known Skeleton Structures.
		switch( arm_type ){
			case IKRig.ARM_MIXAMO : init_mixamo_rig( this.arm, this ); break;
		}

		return this;
	}

	add_point( name, b_name ){
		this.points[ name ] = { 
			idx : this.arm.name_map[ b_name ]
		}; 
		return this;
	}
	
	add_chain( name, name_ary, end_name=null, ik_solver=null ){ //  axis="z",
		let i, b, ch = new Chain(  ); // axis
		for( i of name_ary ){
			b = this.pose.get_bone( i );
			ch.add_bone( b.idx, b.len );
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		if( end_name ){
			ch.end_idx = this.pose.get_bone( end_name ).idx;
		}

		ch.ik_solver = ik_solver;

		this.chains[ name ] = ch;
		return this;
	}

	set_leg_lmt( len=null, offset=0 ){
		if( !len ){
			let hip = this.tpose.bones[ this.points.hip.idx ];
			this.leg_len_lmt = hip.world.pos.y + offset;
		}else{
			this.leg_len_lmt = len + offset;
		}
		return this;
	}
	// #endregion ////////////////////////////////////////////////

	// #region METHODS
	first_bone( ch_name ){
		let idx = this.chains[ ch_name ].bones[ 0 ].idx;
		return this.pose.bones[ idx ];
	}

	get_chain_indices( ch_name ){
		let ch = this.chains[ ch_name ];
		if( !ch ) return null;

		let b, ary = new Array();
		for( b of ch.bones ) ary.push( b.idx );

		return ary;
	}
	// #endregion ////////////////////////////////////////////////

	// #region SPECIAL METHODS
	recompute_from_tpose(){
		// Recompute the Length of the bones for each chain. Most often this
		// is a result of scale being applied to the armature object that can
		// only be computed after the rig is setup
		this.chains.leg_l.compute_len_from_bones( this.tpose.bones );
		this.chains.leg_r.compute_len_from_bones( this.tpose.bones );
		this.chains.arm_l.compute_len_from_bones( this.tpose.bones );
		this.chains.arm_r.compute_len_from_bones( this.tpose.bones );

		return this;
	}
	// #endregion ////////////////////////////////////////////////

} App.Components.reg( IKRig ); //TODO This will not work well for 3JS, need to Reg Comp Differently.

//#########################################################

// CONSTANTS
IKRig.ARM_MIXAMO = 1;

//#########################################################

class Chain{
	constructor( ){ // axis="z"
		this.bones		= new Array();	// Index to a bone in an armature / pose
		this.len		= 0;			// Chain Length
		this.len_sqr	= 0;			// Chain Length Squared, Cached for Checks without SQRT
		this.cnt		= 0;			// How many Bones in the chain
		//this.align_axis	= axis;			// Chain is aligned to which axis
		this.end_idx 	= null;			// Joint that Marks the true end of the chain

		//this.alt_dir 	= Vec3.FORWARD.clone();

		this.alt_fwd 	= Vec3.FORWARD.clone();
		this.alt_up		= Vec3.UP.clone();

		this.ik_solver 	= null;
	}

	// #region Getters / Setters
	add_bone( idx, len ){
		let o = { idx, len };

		this.bones.push( o );
		this.cnt++;
		this.len		+= len;
		this.len_sqr	= this.len * this.len;
		return this;
	}

	// Get Skeleton Index of Bones
	first(){ return this.bones[0].idx; }
	last(){ return this.bones[ this.cnt-1 ].idx; }
	idx( i ){ return this.bones[ i ].idx; }

	//set_alt_dir( dir, tpose=null, idx=0 ){
		//if( tpose ){
		//	let b = tpose.bones[ this.bones[ idx ].idx ],
		//		q = Quat.invert( b.world.rot );	// Invert World Space Rotation 
		//	this.alt_dir.from_quat( q, dir );	// Use invert to get direction that will Recreate the real direction
		//}else this.alt_dir.copy( v );

	//	return this;
	//}

	set_alt( fwd, up, tpose=null ){
		if( tpose ){
			let b = tpose.bones[ this.bones[ 0 ].idx ],
				q = Quat.invert( b.world.rot );	// Invert World Space Rotation 

			this.alt_fwd.from_quat( q, fwd );	// Use invert to get direction that will Recreate the real direction
			this.alt_up.from_quat( q, up );	
		}else{
			this.alt_fwd.copy( fwd );
			this.alt_up.copy( up );
		}
		return this;
	}
	// #endregion ////////////////////////////////////////////////
	
	// #region Special Methods
	compute_len_from_bones( bones ){
		let end = this.cnt - 1,
			sum = 0,
			b, i;

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Loop Every Bone Except Last one
		for( i=0; i < end; i++ ){
			b = bones[ this.bones[i].idx ];
			b.len = Vec3.len( 
				bones[ this.bones[i+1].idx ].world.pos, 
				bones[ this.bones[i].idx ].world.pos 
			);

			sum += b.len;
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// If End Point exists, Can calculate the final bone's length
		if( this.end_idx != null ){
			b = bones[ this.bones[i].idx ];
			b.len = Vec3.len( 
				bones[ this.end_idx ].world.pos,
				bones[ this.bones[i].idx ].world.pos
			);
			sum += b.len;
		}else console.warn( "Recompute Chain Len, End Index is missing"); 

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		//sum = b.len = Vec3.len( 
		//	bones[ this.end_idx ].world.pos,
		//	bones[ this.bones[0].idx ].world.pos
		//);

		this.len 		= sum;
		this.len_sqr	= sum * sum;
		return this;
	}
	// #endregion ////////////////////////////////////////////////
}

//#########################################################

function init_mixamo_rig( arm, rig ){
	rig
		.add_point( "hip", "Hips" )
		.add_point( "head", "Head" )
		.add_point( "neck", "Neck" )
		.add_point( "chest", "Spine2" )
		.add_point( "foot_l", "LeftFoot" )
		.add_point( "foot_r", "RightFoot" )

		.add_chain( "arm_r", [ "RightArm", "RightForeArm" ],  "RightHand" ) //"x",
		.add_chain( "arm_l", [ "LeftArm", "LeftForeArm" ], "LeftHand" ) //"x", 

		.add_chain( "leg_r", [ "RightUpLeg", "RightLeg" ], "RightFoot" ) //"z", 
		.add_chain( "leg_l", [ "LeftUpLeg", "LeftLeg" ], "LeftFoot" )  //"z", 

		.add_chain( "spine", [ "Spine", "Spine1", "Spine2" ] ) //, "y"
	;

	// Set Direction of Joints on th Limbs
	//rig.chains.leg_l.set_alt_dir( Vec3.FORWARD, rig.tpose );
	//rig.chains.leg_r.set_alt_dir( Vec3.FORWARD, rig.tpose );
	//rig.chains.arm_r.set_alt_dir( Vec3.BACK, rig.tpose );
	//rig.chains.arm_l.set_alt_dir( Vec3.BACK, rig.tpose );

	rig.chains.leg_l.set_alt( Vec3.DOWN, Vec3.FORWARD, rig.tpose );
	rig.chains.leg_r.set_alt( Vec3.DOWN, Vec3.FORWARD, rig.tpose );
	rig.chains.arm_r.set_alt( Vec3.RIGHT, Vec3.BACK, rig.tpose );
	rig.chains.arm_l.set_alt( Vec3.LEFT, Vec3.BACK, rig.tpose );
}

//#########################################################

export default IKRig;
export { Chain };