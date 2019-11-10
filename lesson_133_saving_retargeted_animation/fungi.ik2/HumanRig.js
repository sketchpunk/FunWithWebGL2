import App			from "../fungi/engine/App.js";
import Maths, { Quat, Vec3 }		from "../fungi/maths/Maths.js";
import Transform	from "../fungi/maths/Transform.js";
import Pose 		from "./Pose.js";


//##############################################################################
class Chain{
	constructor( ik_align_axis="z" ){		
		this.bones			= [];			// Index to a bone in an armature / pose
		this.cnt			= 0;			// How many Bones in the chain
		this.len 			= 0;			// Chain Length
		this.len_sqr		= 0;			// Chain Length Squared, Cached for Checks without SQRT

		this.ik_align_axis	= ik_align_axis;
	}

	set_bones( pose, b_names ){
		let n, b;
		for( n of b_names ){
			b = pose.get_bone( n );
			this.len += b.len;
			this.bones.push( b.idx );
		}
		this.cnt		= b_names.length;
		this.len_sqr	= this.len ** 2;

		return this;
	}

	get_last(){ return this.bones[ this.cnt-1 ]; }
	get_first(){ return this.bones[ 0 ]; }
}


//##############################################################################
class HumanRig{
	constructor( e, use_root_offset=false ){
		this.entity = e;
		this.arm 	= e.Armature;

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		this.bind_pose	= new Pose( this.arm );
		this.pose_a		= new Pose( this.arm );

		if( use_root_offset ){
			this.bind_pose.set_offset( e.Node.local.rot, null, e.Node.local.scl );
			this.pose_a.set_offset( e.Node.local.rot, null, e.Node.local.scl );
		}

		this.bind_pose.update_world();

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		this.chains = {};

		this.arm_l 	= new Chain( "x" );
		this.arm_r 	= new Chain( "x" );
		this.leg_l 	= new Chain( "z" );
		this.leg_r 	= new Chain( "z" );
		this.spine 	= new Chain( "z" );

		this.hip 	= null;
		this.foot_l = { idx:null, up:Vec3.UP.clone() };
		this.foot_r = { idx:null, up:Vec3.UP.clone() };

		this.hand_l = { idx:null };
		this.hand_r = { idx:null };

		this.head	= { idx:null, fwd:Vec3.FORWARD.clone(), up:Vec3.UP.clone(), is_mod:false };
	}

	apply_pose(){ this.pose_a.apply(); return this; }
	update_world(){ this.pose_a.update_world(); return this; }

	/////////////////////////////////////////////////////////////////
	// 
	/////////////////////////////////////////////////////////////////
		set_hip( n ){ this.hip = this.bind_pose.get_bone( n ); return this; }

		set_arm_l( name_ary, do_align=false ){
			this.arm_l.set_bones( this.bind_pose, name_ary );
			if( do_align )  Pose.align_chain( this.bind_pose, Vec3.LEFT, name_ary );
			return this;			
		}

		set_arm_r( name_ary, do_align=false ){
			this.arm_r.set_bones( this.bind_pose, name_ary );
			if( do_align )  Pose.align_chain( this.bind_pose, Vec3.RIGHT, name_ary );
			return this;			
		}

		set_leg_l( name_ary, do_align=false ){
			this.leg_l.set_bones( this.bind_pose, name_ary );
			if( do_align )  Pose.align_chain( this.bind_pose, Vec3.DOWN, name_ary );
			return this;			
		}

		set_leg_r( name_ary, do_align=false ){
			this.leg_r.set_bones( this.bind_pose, name_ary );
			if( do_align )  Pose.align_chain( this.bind_pose, Vec3.DOWN, name_ary );
			return this;			
		}

		set_foot( f, name, spin_fwd=false, find_up=false, align_fwd=false ){
			let o = ( f==0 )? this.foot_l : this.foot_r;
			o.idx = this.bind_pose.get_index( name );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let pt, ct, b, q, v, rot;
			if( spin_fwd || find_up || align_fwd ){
				pt	= new Transform();
				ct	= new Transform();
				b	= this.bind_pose.bones[ o.idx ];
				q 	= new Quat();
				//rot = new Quat();
				v 	= new Vec3();

				Pose.parent_world( this.bind_pose, o.idx, pt, ct );
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Spin forward
			if( spin_fwd ){
				v.from_quat( ct.rot, Vec3.UP );
				v[1] = 0;

				if( Math.abs( Vec3.dot( v, Vec3.LEFT ) ) < 1e2 ){
					q.from_unit_vecs( v, Vec3.FORWARD );
					ct.rot.pmul( q );
				}
				

				/*
				let pt	= new Transform(),
					ct	= new Transform(),
					v	= new Vec3(),
					q	= new Quat(),
					b	= pose.get_bone( foot );

				Pose.parent_world( pose, b.idx, pt, ct );	// Get the Parent and Child Transforms. e.Armature,
				
				ct.transform_vec( [0,b.len,0], v );			// Get the Tails of the Bone
				v.sub( ct.pos );							// Get The direction to the tail
				v[1] = 0;									// Flatten vector to 2D by removing Y Position
				v.norm();									// Make it a unit vector
				q	.from_unit_vecs( v, Vec3.FORWARD )		// Rotation needed to point the foot forward.
					.mul( ct.rot )							// Move WS Foot to point forward
					.pmul( pt.rot.invert() );				// To Local Space
				pose.set_bone( b.idx, q );		// Save to Pose
				*/
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Find Foot's Up direction that will look forward when transformed by the bind rotation.
			if( find_up ){
				v.from_quat( ct.rot, Vec3.UP );			// Get Current Direction
				q.from_unit_vecs( Vec3.FORWARD, v );	// Difference between Forward and Dir
				o.up.from_quat( q, Vec3.UP );			// UP offset to form Forward
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( align_fwd ){
				v.from_quat( ct.rot, o.up );
				ct.rot.pmul( q.from_unit_vecs( v, Vec3.FORWARD ) );

				//App.debug.line( ct.pos, Vec3.add( ct.pos, v ) );
				//App.debug.line( ct.pos, Vec3.add( ct.pos, Vec3.FORWARD ) );

				/*
				let b = gRigB.bind_pose.get_bone("LeftFoot");
				let p = gRigB.bind_pose.bones[ b.p_idx ];
				let v = Vec3.transform_quat( Vec3.UP, b.world.rot );
				let q = Quat.unit_vecs( v, Vec3.FORWARD )
						.mul( b.world.rot )
						.pmul_invert( p.world.rot );

				gRigB.bind_pose.set_bone( b.idx, q );
				b.world
					.copy( p.world )
					.add( q, b.local.pos, b.local.scl );

				gRigB.bind_pose.apply();



				App.debug.point( b.world.pos );
				App.debug.line( b.world.pos, Vec3.add( b.world.pos, v ) );
				App.debug.line( b.world.pos, Vec3.add( b.world.pos, Vec3.FORWARD ), 1 );
				*/
			}


			if( spin_fwd || find_up || align_fwd ){
				q.copy( ct.rot ).pmul_invert( pt.rot );
				this.bind_pose.set_bone( b.idx, q );
			}
			return this;
		}

		set_hand( f, name ){
			if( f == 0 )	this.hand_l.idx	= this.bind_pose.get_index( name );
			else 			this.hand_r.idx	= this.bind_pose.get_index( name );
			return this;
		}

		set_spine( name_ary ){
			this.spine.set_bones( this.bind_pose, name_ary );
			return this;	
		}

		set_head( name, do_axis=false ){
			this.head.idx = this.bind_pose.get_index( name );

			/**/
			if( do_axis ){
				let pt = new Transform();
				let ct = new Transform();
				let v = new Vec3();
				let q = new Quat();

				Pose.parent_world( this.bind_pose, this.head.idx, pt, ct );

				v.from_quat( ct.rot, Vec3.FORWARD );
				q.from_unit_vecs( Vec3.FORWARD, v );
				this.head.fwd.from_quat( q, Vec3.FORWARD );

				v.from_quat( ct.rot, Vec3.UP );
				q.from_unit_vecs( Vec3.UP, v );
				this.head.up.from_quat( q, Vec3.UP );

				this.head.is_mod = true;
			}
			

			return this;
		}

		/*
		set_arm_l(){ this.arm_l.set_bones( this.bind_pose, arguments ); return this; }
		set_arm_r(){ this.arm_r.set_bones( this.bind_pose, arguments ); return this; }
		set_leg_l(){ this.leg_l.set_bones( this.bind_pose, arguments ); return this; }
		set_leg_r(){ this.leg_r.set_bones( this.bind_pose, arguments ); return this; }
		set_feet( fl, fr ){
			this.foot_l = {
				idx				: this.bind_pose.get_index( fl ),
				angle_offset	: 0,
			};

			this.foot_r = {
				idx				: this.bind_pose.get_index( fr ),
				angle_offset	: 0,
			};
			return this;
		}
		*/

		set_chain( name, bone_ary ){
			this.chains[ name ] = new Chain().set_bones( this.bind_pose, bone_ary );
			return this;
		}

		set_bone_pos( b_idx, v ){ this.pose_a.set_bone( b_idx, null, v ); return this; }
		set_bone_rot( b_idx, v ){ this.pose_a.set_bone( b_idx, v ); return this; }

		get_bone( b_idx ){ return this.pose_a.bones[ b_idx ]; }
		get_hip( ){ return this.pose_a.bones[ this.hip.idx ]; }
		get_head(){ return this.pose_a.bones[ this.head.idx ]; }
		get_foot_l(){ return this.pose_a.bones[ this.foot_l.idx ]; }
		get_foot_r(){ return this.pose_a.bones[ this.foot_r.idx ]; }


		//get_foot_l_y(){ return this.pose_a.bones[ this.foot_l.idx].world.pos.y; }


	/////////////////////////////////////////////////////////////////
	// 
	/////////////////////////////////////////////////////////////////		
		gen_tpose(){
			let chary = ( chain )=>{
				let ary = [];
				for( let i of chain.bones ) ary.push( this.bind_pose.bones[ i ].name );
				return ary;
			};

			if( this.leg_l.cnt > 0 ) Pose.align_chain( this.bind_pose, Vec3.DOWN, chary( this.leg_l ) );
			if( this.leg_r.cnt > 0 ) Pose.align_chain( this.bind_pose, Vec3.DOWN, chary( this.leg_r ) );
			if( this.arm_r.cnt > 0 ) Pose.align_chain( this.bind_pose, Vec3.RIGHT, chary( this.arm_r ) );
			if( this.arm_l.cnt > 0 ) Pose.align_chain( this.bind_pose, Vec3.LEFT, chary( this.arm_l ) );
			
			if( this.foot_l != null ){
				Pose.align_foot_forward( this.bind_pose, this.bind_pose.bones[ this.foot_l.idx ].name );
			}
			
			if( this.foot_r != null ){
				Pose.align_foot_forward( this.bind_pose, this.bind_pose.bones[ this.foot_r.idx ].name );
			}

			this.bind_pose.update_world();
			this.bind_pose.apply();
			return this;
		}

		ready(){
			// Calc Offset Angle of the Feet.
			//if( !this.foot_l ) this.foot_l.angle_offset = this.calc_dir_angle( this.foot_l.idx );
			//if( !this.foot_r ) this.foot_r.angle_offset = this.calc_dir_angle( this.foot_r.idx );

			this.bind_pose.update_world();
			this.bind_pose.apply();
			return this;
		}


	/////////////////////////////////////////////////////////////////
	// 
	/////////////////////////////////////////////////////////////////	
		calc_dir_angle( b_idx, main_dir=Vec3.FORWARD, dot_dir=Vec3.UP ){
			let b 		= bind.bones[ b_idx ],
				dir		= Vec3.transform_quat( Vec3.UP, b.world.rot ),	// Get Model Space Direction
				angle	= Vec3.angle( main_dir, dir ),					// Angle between Main Dir
				dot		= Vec3.dot( dir, dot_dir );						// Check if angle is Negative or Positive
			return ( dot < 0 )? -angle : angle;
		}

		calc_bone_world( b_idx ){
			// TODO, NEED TO CHECK PARENT BONE EXISTS
			let b_bind	= this.bind_pose.bones[ b_idx ],		// Bone in Bind Pose
				b_pose	= this.pose_a.bones[ b_idx ],			// Bone in Pose
				pb_pose	= this.pose_a.bones[ b_pose.p_idx ];	// Parent Bone in Pose, SHOULD HAVE CORRECT CURRENT WORLD SPACE DATA. 

			b_pose.world.from_add( pb_pose.world, b_bind.local ); // Get Model Space of foot
			return b_pose.world.pos;
		}

		calc_foot_l(){ return this.calc_bone_world( this.foot_l.idx ); }
		calc_foot_r(){ return this.calc_bone_world( this.foot_r.idx ); }

		update_world_chain( chain ){
			let i, bind, pose, ppose;
			for( i of chain.bones ){
				bind	= this.bind_pose.bones[ i ];
				pose	= this.pose_a.bones[ i ];
				ppose	= this.pose_a.bones[ pose.p_idx ];
				pose.world.from_add( ppose.world, bind.local );
			}
			return this;
		}

		apply_world_quat_chain( q, chain ){
			let i, bind, pose, ppose, rot = new Quat();
			for( i of chain.bones ){
				bind	= this.bind_pose.bones[ i ];
				pose	= this.pose_a.bones[ i ];
				ppose	= this.pose_a.bones[ pose.p_idx ];

				rot	.from_mul( q, pose.world.rot )
					.pmul_invert( ppose.world.rot );

				this.pose_a.set_bone( pose.idx, rot );

				pose.world
					.copy( ppose.world )
					.add( rot, bind.local.pos, bind.local.scl );
			}
			return this;
		}

		get_pose_bone_tail( idx, tf ){
			let bind = this.bind_pose.bones[ idx ],
				pose = this.pose_a.bones[ idx ];

			tf	.copy( pose.world )
				.add( bind.local.rot, [0, bind.len,0], bind.local.scl );
			
			return tf;	
		}
}

//##############################################################################
export default HumanRig;
export { Chain };