import App					from "../fungi/engine/App.js";
import Maths, {Vec3,Quat}	from "../fungi/maths/Maths.js";
import Transform 			from "../fungi/maths/Transform.js";

class TPose{
	static human_rig( rig ){
		this.align_chain( rig.arm_l, Vec3.LEFT );
		this.align_chain( rig.arm_r, Vec3.RIGHT );
		//this.single_bone( rig.getEBone( rig.hand_l ), Vec3.LEFT );
		//this.single_bone( rig.getEBone( rig.hand_r ), Vec3.RIGHT );

		//this.align_chain( rig.leg_l, Vec3.DOWN );
		//this.align_chain( rig.leg_r, Vec3.DOWN );
	}

	static align_chain( chain, upDir ){
		let b, lt,
			rot	= new Quat(),
			pt	= new Transform(),
			bt	= new Transform();

		//chain.bindt = new Array();
		//chain.bindw = new Array();

		b = chain.getBone( 0 );						// Start with the chain root bone.
		App.node.getWorldTransform( b, pt, false );	// Get the starting parent world transform

		let i, iEnd = chain.cnt - 1;
		for(i=0; i <= iEnd; i++){
			lt	= b.Bone.bind;						// Original Bind Transform
			Transform.add( pt, lt, bt );			// Create World Transform for Bone

			this.align_bone( pt, bt, upDir, rot );	// Align Bone to Line
			b.Node.setRot( rot );					// Set Rotation

			//chain.bindt.push( new Transform().set( rot, lt.pos, lt.scl ) );
			chain.bind[i].set( rot, lt.pos, lt.scl );
			//chain.bindw.push( new Transform( pt ).add( rot, lt.pos, lt.scl ) );

			if( i != iEnd ){
				pt.add( rot, lt.pos, lt.scl );		// Add bone transform to parent for next loop
				b = chain.getBone( i+1 );			// Get Bone Reference for next loop
			}
		}
	}

	static align_bone( pWorld, bWorld, u, out ){
		// Create the final Quaternion
		// The UP direction is passed in, The final Axis Must match the up
		// Then we take the bone's forward to calculate a new LEFT direction
		// With the proper left, we reset the forward using UP and LEFT to make
		// a usable set of axises to create a rotation from.	
		let f = Vec3.transformQuat( Vec3.FORWARD, bWorld.rot ),
			l = Vec3.cross( u, f ).normalize();
		Vec3.cross( l, u, f ).normalize();

		// With the rotation created, we need the Difference,
		// to do it we need to subtract the parent rotation 
		// by PreMul by its inverse.
		Quat.fromAxis( l, u, f , out )
			.pmul( Quat.invert( pWorld.rot ) );

		/* 
		App.debug
			.line( bWorld.pos, Vec3.add( bWorld.pos, u ), 2 )
			.line( bWorld.pos, Vec3.add( bWorld.pos, f ), 1 )
			.line( bWorld.pos, Vec3.add( bWorld.pos, l ), 0 ); */
	}

	static single_bone( b, upDir ){
		let rot	= new Quat(),
			pt	= new Transform(),
			bt	= new Transform();

		App.node.getWorldTransform( b, pt, false );
		Transform.add( pt, b.Bone.bind, bt );
		this.align_bone( pt, bt, upDir, rot );
		b.Node.setRot( rot );
	}
}

export default TPose;