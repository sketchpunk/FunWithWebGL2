import { Vec3, Quat }	from "../fungi/maths/Maths.js";
import Transform 				from "../fungi/maths/Transform.js";


/*
	let e = MeshLoader.entity( dl[0], dl[1] );
	let pose = new Pose( e.Armature, true );

	TPose.align_chain( e, [ "LeftArm", "LeftForeArm" ], Vec3.LEFT, pose );
	TPose.align_chain( e, [ "RightArm", "RightForeArm" ], Vec3.RIGHT, pose );

	TPose.align_chain( e, [ "LeftUpLeg", "LeftLeg" ], Vec3.DOWN, pose );
	TPose.align_chain( e, [ "RightUpLeg", "RightLeg" ], Vec3.DOWN, pose );

	TPose.align_foot_forward( e, "LeftFoot", pose );
	TPose.align_foot_forward( e, "RightFoot", pose );

	pose.apply();
*/

class TPose{
	constructor( arm ){
		this.bones = [];
		//{ pidx, len, local : new Transform(), world: new Transform() };

		// Create a Transform for each bone.
		//for( let i=0; i < bLen; i++ ){
		//	this.bones[ i ] = { changeState:0, local : new Transform() };
		//	if( doInit ) this.bones[ i ].local.copy( arm.bones[ i ].Node.local );
		//}
	}


	static align_chain( e, ary, dir, pose ){
		let pt		= new Transform(),			// Parent Transform ( Current Bone's Parent );
			ct		= new Transform(),			// Child Transform ( Current Bone)
			aEnd	= ary.length - 1,			// End Index
			f		= new Vec3(),				// Forward
			u		= new Vec3( dir ),			// Up
			l		= new Vec3(),				// Left
			r		= new Quat(),				// Final Rotation
			q		= new Quat(),				// Temp Rotation
			b 		= e.Armature.get_bone( ary[0] );	// Bone Entity Reference

		// Parent Bone's Transform
		b.Node.get_world_transform( pt, false );

		for( let i=0; i <= aEnd; i++ ){

			ct.from_add( pt, b.Bone.bind );		// Calc current bones world transform
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

			pose.updateBone( b.Bone.order, r );			// Update Pose with new ls rotation

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// If not the last bone, take then the new rotation to calc the next paren't
			// world space transform for the next bone on the list.
			if( i != aEnd){
				pt.add( r, b.Bone.bind.pos, b.Bone.bind.scl );
				b = e.Armature.get_bone( ary[i+1] );
			}
		}
	}

	static align_foot_forward( e, foot, pose ){
		let pt	= new Transform(),
			ct	= new Transform(),
			v	= new Vec3(),
			q	= new Quat(),
			b	= e.Armature.get_bone( foot );
		
		this.pose_bone_world_parent( e.Armature, pose, b, pt, ct ); // Get the Parent and Child Transforms.
		
		ct.transformVec( [0,b.Bone.length,0], v );	// Get the Tails of the Bone
		v.sub( ct.pos );							// Get The direction to the tail
		v[1] = 0;									// Flatten vector to 2D by removing Y Position
		v.norm();									// Make it a unit vector

		q	.from_unit_vecs( v, Vec3.FORWARD )		// Rotation needed to point the foot forward.
			.mul( ct.rot )							// Move WS Foot to point forward
			.pmul( pt.rot.invert() );				// To Local Space

		pose.updateBone( b.Bone.order, q );			// Save to Pose
	}

	static pose_bone_world_parent( arm, pose, b, pt, ct ){
		let n	= b.Node,
			ary	= [];

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Move up the Node Tree
		while( n.parent != null ){
			if( !n.parent.Bone ) break; //Armature root is an entity, can skip it to only get Model Space Transform for pose
			ary.push( n.parent.Bone.order );
			n = n.parent.Node;
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		let i 	= ary.length - 1,
			pb	= pose.bones;

		pt.copy( pb[ ary[i] ].local );							// Start the parent Transfrom by coping the first bone
		
		for( i--; i > -1; i-- ) pt.add( pb[ ary[i] ].local );	// Then add all the children bones

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		ct.from_add( pt, pb[ b.Bone.order ].local );			// Then add child current local transform to the parent's
	}
}

export default TPose;