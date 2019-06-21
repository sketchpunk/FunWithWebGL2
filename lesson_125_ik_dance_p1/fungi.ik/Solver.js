import Maths, { Vec3, Quat } from "../fungi/maths/Maths.js";

import App			from "../fungi/engine/App.js"; //TODO Delete
import Axis			from "../fungi/maths/Axis.js";
import Transform	from "../fungi/maths/Transform.js";


const QUAT_FWD2UP = [0.7071067690849304, 0, 0, 0.7071067690849304]; //new Quat().setAxisAngle(Vec3.LEFT, Maths.toRad(90));

//#####################################################################
class IKTarget{
	constructor(){
		this.startPos		= new Vec3();	// World Position start of an IK Chain
		this.endPos			= new Vec3();	// The End Effector ( Target Position )
		this.axis 			= new Axis();	// Target Axis, Defines Forward and Up mainly.

		this.distanceSqr	= 0;			// Distance Squared from Start to End, Faster to check lengths by Squared  to avoid using Sqrt to get real lengths.
	}

	/////////////////////////////////////////////////////////////////////
	// GETTERS - SETTERS
	/////////////////////////////////////////////////////////////////////	
		/** Define the target based on a Start and End Position along with
			Up direction or the direction of the bend. */
		byPos( pA, pB, upDir ){
			this.startPos.copy( pA );
			this.endPos.copy( pB );

			this.distanceSqr = Vec3.sub( pB, pA, this.axis.z ).lengthSqr();
			this.axis.fromDir( this.axis.z, upDir );

			return this;
		}

		getRot( out ){ return Quat.fromAxis( this.axis.x, this.axis.y, this.axis.z ); }

	/////////////////////////////////////////////////////////////////////
	// STATIC
	/////////////////////////////////////////////////////////////////////
		/** Visually see the Target information */
		static debug( d, t, scl=1.0 ){ 
			Axis.debug( d, t.axis, t.startPos, scl );
			d.point( t.startPos, 6 ).point( t.endPos, 0 );
			return this;
		}
}


//#####################################################################
class Solver{
	///////////////////////////////////////////////////////////////////
	// Single Bone Solvers
	///////////////////////////////////////////////////////////////////

		static _aim_bone( chain, target, wt, out ){
			/*
			The idea is to Aim the root bone in the direction of the target. Originally used a lookAt rotation 
			then correcting it to take in account the bone's points up, not forward.

			Instead, Build a rotation based on axis direction. Start by using target's fwd dir as the bone's up dir.
			To Help keep orientation, use the bone's Bind( or TPose ) world space fwd as a starting point to help get
			the left dir. With UP and Left, do another cross product for fwd to keep the axis orthogonal.

			This aims the limb pretty well at the target. The final step is to twist the limb so its joint (elbow, knee)
			is pointing at the UP dir of the target axis. This helps define how much twisting we need to apply to the bone.
			Arm and Knees tend to have different natural pose. The leg's fwd is fwd but the arm's fwd may be point down or back,
			all depends on how the rigging was setup.

			Since he bone is now aligned to the target, it shares the same Direction axis that we can then easily apply a twist
			rotation. The target's UP is final dir, so we take the lumb's aligning axis's world space dire and simply use 
			Quat.rotateTo( v1, v2 ). This function creates a rotation needed to get from One Vector dir to the other.
			*/
			
			let rot = Quat.mul( wt.rot, chain.bind[ 0 ].rot ),	// Get World Space Rotation for Bone
				up	= target.axis.z,							// Main Direction, Point Bone up toward axis forward.
				fwd	= Vec3.transformQuat( Vec3.FORWARD, rot ),	// Get Bone's World Space Forward Direction.
				lft	= Vec3.cross( up, fwd ).normalize();		// Figure out World Space Left Direction
			
			Vec3.cross( lft, up, fwd ).normalize();				// Realign forward to keep axis orthogonal for proper rotation

			Quat.fromAxis( lft, up, fwd, out );					// Final World Space Rotation

			if( Quat.dot( out, rot ) < 0 ) out.negate();		// If axis is point in the opposite direction of the bind rot, flip the signs : Thx @gszauer

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Need to apply a twist rotation to aim the bending joint 
			// (elbow,knee) in the direction of the IK Target UP Axis.

			let alignDir;
			switch( chain.ikAlignAxis ){ // Arm/Legs have different Axis to align to Twisting.
				case "x": alignDir = lft.clone(); break;
				case "z": alignDir = fwd.clone(); break;
			}

			// Shortest Twisting Direction
			if( Vec3.dot( alignDir, target.axis.y ) < 0 ) alignDir.invert();

			// Create and apply twist rotation.
			let q = Quat.rotationTo( alignDir, target.axis.y ); 
			//rad = Vec3.angle( alignDir, target.axis.y ),		// Angle between
			out.pmul( q );

			return out;
		}

		static aim( chain, target, pose, wt ){
			let rot = new Quat();

			this._aim_bone( chain, target, wt, rot );		

			rot.pmul( Quat.invert( wt.rot ) );	// Convert to Bone's Local Space by mul invert of parent bone rotation

			if( pose )	pose.updateBone( chain.idx[ 0 ], rot );
			else		chain.updateBone( 0, rot );
		}


	///////////////////////////////////////////////////////////////////
	// Multi Bone Solvers
	///////////////////////////////////////////////////////////////////

		static limb( chain, target, pose, wt ){
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Using law of cos SSS, so need the length of all sides of the triangle
			let aLen	= chain.lens[ 0 ],
				bLen	= chain.lens[ 1 ],
				cLen	= Math.sqrt( target.distanceSqr ),
				wq 		= new Quat(),
				rot 	= new Quat(),	
				tmp		= new Quat(),
				rad;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// FIRST BONE - Aim then rotate by the angle.
			this._aim_bone( chain, target, wt, rot );				// Aim the first bone toward the target oriented with the bend direction.
			
			rad	= Maths.lawcos_sss( aLen, cLen, bLen );				// Get the Angle between First Bone and Target.
			tmp.setAxisAngle( target.axis.x, -rad );				// Use the Target's X axis for rotation
			rot.pmul( tmp );										// Rotate the the aimed bone by the angle from SSS
			wq.copy( rot );											// Save a Copy as World Rotation before converting to local space

			rot.pmul( wt.rot.invert( tmp ) );						// Convert to Bone's Local Space by mul invert of parent bone rotation

			if( pose )	pose.updateBone( chain.idx[ 0 ], rot );		// Save result to bone.
			else		chain.updateBone( 0, rot );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// SECOND BONE
			// Need to rotate from Right to Left, So take the angle and subtract it from 180 to rotate from 
			// the other direction. Ex. L->R 70 degrees == R->L 110 degrees
			rad	= Math.PI - Maths.lawcos_sss( aLen, bLen, cLen );

			Quat.mul( wq, chain.bind[ 1 ].rot, rot ) 				// Add Bone 2's Local Bind Rotation to Bone 1's new World Rotation.
				.pmul( tmp.setAxisAngle( target.axis.x, rad ) )		// Rotate it by the target's x-axis
				.pmul( wq.invert( tmp ) );							// Convert to Bone's Local Space

			if( pose )	pose.updateBone( chain.idx[ 1 ], rot );
			else		chain.updateBone( 1, rot );
		}

}


//#####################################################################
export { Solver, IKTarget };