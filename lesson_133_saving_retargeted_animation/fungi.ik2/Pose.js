import { Quat, Vec3 }	from "../fungi/maths/Maths.js";
import Transform		from "../fungi/maths/Transform.js";


//##################################################################################
class Pose{
	constructor( arm ){
		this.arm			= arm;				// Reference Back to Armature, Make Apply work Easily
		this.bones			= [];				// Recreation of Bone Hierarchy
		this.root_offset	= new Transform();	// Parent Transform for Root Bone ( Mixamo Skeletons need this to render right )

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Create Bone Transform Hierarchy to do transformations
		// without changing the actual armature.
		let b, pi;
		for( let i=0; i < arm.bones.length; i++ ){
			b	= arm.bones[i];
			pi	= ( b.Node.parent && b.Node.parent.Bone )? b.Node.parent.Bone.order : null;

			this.bones[ i ] = {
				chg_state	: 0,								// If Local Has Been Updated
				idx 		: i,								// Bone Index in Armature
				p_idx 		: pi,								// Parent Bone Index in Armature
				len 		: b.Bone.length,					// Length of Bone
				name 		: b.info.name,
				local		: new Transform( b.Bone.bind ),		// Local Transform, use Bind pose as default
				world		: new Transform(),					// Model Space Transform
			};
		}
	}

	/////////////////////////////////////////////////////////////////
	// Setters / Getters
	/////////////////////////////////////////////////////////////////
		
		set_offset( rot=null, pos=null, scl=null ){ this.root_offset.set( rot, pos, scl ); return this; }
		
		set_bone( idx, rot=null, pos=null, scl=null ){
			let b = this.bones[ idx ];
			b.local.set( rot, pos, scl );

			if( rot ) b.chg_state |= Pose.ROT;
			if( pos ) b.chg_state |= Pose.POS;
			if( scl ) b.chg_state |= Pose.SCL;

			return this;
		}

		get_index( bname ){ return this.arm.names[ bname ]; }
		get_bone( bname ){ return this.bones[ this.arm.names[ bname ] ]; }

		get_local_rot( idx ){ return this.bones[ idx ].local.rot; }

		static set_change_state( b, rot=false, pos=false, scl=false ){
			if( rot ) b.chg_state |= Pose.ROT;
			if( pos ) b.chg_state |= Pose.POS;
			if( scl ) b.chg_state |= Pose.SCL;
			return this;
		}


	/////////////////////////////////////////////////////////////////
	// Methods
	/////////////////////////////////////////////////////////////////

		update_world(){
			for( let b of this.bones ){
				if( b.p_idx != null )	b.world.from_add( this.bones[ b.p_idx ].world, b.local ); // Parent.World + Child.Local
				else					b.world.from_add( this.root_offset, b.local );
			}
			return this;
		}
		
		apply(){
			let i, 
				pb, // Pose Bone
				ab;	// Armature Bone

			for( i=0; i < this.bones.length; i++ ){
				pb = this.bones[ i ];
				
				if( pb.chg_state == 0 ) continue;
				ab = this.arm.bones[ i ];

				if( pb.chg_state & Pose.ROT ) ab.Node.local.rot.copy( pb.local.rot );
				if( pb.chg_state & Pose.POS ) ab.Node.local.pos.copy( pb.local.pos );
				if( pb.chg_state & Pose.SCL ) ab.Node.local.scl.copy( pb.local.scl );
				
				ab.Node.isModified	= true;
				pb.changeState		= 0;
			}

			this.arm.isModified = true;
			return this;
		}


	/////////////////////////////////////////////////////////////////
	// T Pose Helpers
	/////////////////////////////////////////////////////////////////
		static align_chain( pose, dir, ary ){
			let pt		= new Transform(),			// Parent Transform ( Current Bone's Parent );
				ct		= new Transform(),			// Child Transform ( Current Bone )
				aEnd	= ary.length - 1,			// End Index
				f		= new Vec3(),				// Forward
				u		= new Vec3( dir ),			// Up
				l		= new Vec3(),				// Left
				r		= new Quat(),				// Final Rotation
				q		= new Quat(),				// Temp Rotation
				b_idx 	= pose.get_index( ary[0] ),
				b 		= pose.bones[ b_idx ];		// Bone Entity Reference
			
			// Parent Bone's Transform
			Pose.parent_world( pose, b_idx, pt );

			for( let i=0; i <= aEnd; i++ ){
				ct.from_add( pt, b.local );			// Calc current bones world transform
				//App.debug
				//	.point( ct.pos, 2 )
				//	.line( ct.pos, Vec3.add( ct.pos, dir), 0 );
				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				// Up direction is where we need the bone to point to.
				// We then get the bone's current forward direction, use it
				// to get its left, then finish it off by recalculating
				// fwd to make it orthogonal. Want to try to keep the orientation
				// while ( fwd, lft ) realigning the up direction.
				f.from_quat( ct.rot, Vec3.FORWARD ); 		// Find Bone's Forward World Direction
				l.from_cross( u, f ).norm();				// Get World Left
				f.from_cross( l, u ).norm();				// Realign Forward
				r.from_axis( l, u, f );						// Create Rotation from 3x3 rot Matrix
				
				if( Quat.dot( r, ct.rot ) < 0 ) r.negate();	// Do a Inverted rotation check, negate it if under zero.
				
				r.pmul( q.from_invert( pt.rot ) );			// Move rotation to local space
				pose.set_bone( b.idx, r );		// Update Pose with new ls rotation
				
				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				// If not the last bone, take then the new rotation to calc the next parents
				// world space transform for the next bone on the list.
				if( i != aEnd){
					pt.add( r, b.local.pos, b.local.scl );
					b = pose.get_bone( ary[i+1] );
				}
			}
		}

		static align_foot_forward( pose, foot ){
			let pt	= new Transform(),
				ct	= new Transform(),
				v	= new Vec3(),
				q	= new Quat(),
				b	= pose.get_bone( foot );

			this.parent_world( pose, b.idx, pt, ct );	// Get the Parent and Child Transforms. e.Armature,
			
			ct.transform_vec( [0,b.len,0], v );			// Get the Tails of the Bone
			v.sub( ct.pos );							// Get The direction to the tail
			v[1] = 0;									// Flatten vector to 2D by removing Y Position
			v.norm();									// Make it a unit vector
			q	.from_unit_vecs( v, Vec3.FORWARD )		// Rotation needed to point the foot forward.
				.mul( ct.rot )							// Move WS Foot to point forward
				.pmul( pt.rot.invert() );				// To Local Space
			pose.set_bone( b.idx, q );		// Save to Pose
		}

		static parent_world( pose, b_idx, pt, ct=null, t_offset=null ){
			let b	= pose.bones[ b_idx ],
				ary	= [];

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Move up the Bone Tree
			while( b.p_idx != null ){
				ary.push( b.p_idx );
				b = pose.bones[ b.p_idx ];
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let i 	= ary.length - 1,
				pb	= pose.bones;

			// Figure out what the starting transform.
			if( !t_offset ) pt.copy( pose.root_offset );
			else			pt.copy( t_offset ).add( pose.root_offset );
			
			// Then add all the children bones
			for( i; i > -1; i-- ) pt.add( pose.bones[ ary[i] ].local );	
			
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( ct ) ct.from_add( pt, pose.bones[ b_idx ].local );		// Then add child current local transform to the parent's
		}
}


//##################################################################################
Pose.ROT = 1;
Pose.POS = 2;
Pose.SCL = 4;


//##################################################################################
export default Pose;