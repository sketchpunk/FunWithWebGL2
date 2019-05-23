import Transform from "../fungi/maths/Transform.js";


//#####################################################################
class Pose{
	constructor( arm, doInit=false ){
		let bLen = arm.bones.length;
		this.bones	= new Array( bLen );
		this.arm	= arm;

		// Create a Transform for each bone.
		for( let i=0; i < bLen; i++ ){
			this.bones[ i ] = { changeState:0, local : new Transform };
			if( doInit ) this.bones[ i ].local.copy( arm.bones[ i ].Node.local );
		}
	}

	/////////////////////////////////////////////////////////////////////
	// SETTERS
	/////////////////////////////////////////////////////////////////////
		updateBone( idx, rot=null, pos=null, scl=null ){
			let b = this.bones[ idx ];

			b.local.set( rot, pos, scl );
			if( rot ) b.changeState |= Pose.ROT;
			if( pos ) b.changeState |= Pose.POS;
			if( scl ) b.changeState |= Pose.SCL;

			return this;
		}

	/////////////////////////////////////////////////////////////////////
	// ARMATURE
	/////////////////////////////////////////////////////////////////////
		// Update pose data with whats currently in armature.
		refresh(){
			let i, pb, ab;
			for( i=0; i < this.bones.length; i++ ){
				pb = this.bones[ i ];
				ab = this.arm.bones[ i ];
				pb.local.rot.copy( ab.Node.local.rot );
				pb.local.pos.copy( ab.Node.local.pos );
				pb.local.scl.copy( ab.Node.local.scl );
			}

			return this;
		}

		apply(){
			let i, pb, ab;

			for( i=0; i < this.bones.length; i++ ){
				pb = this.bones[ i ];
				if( pb.changeState == 0 ) continue;

				ab = this.arm.bones[ i ];
				if( pb.changeState & Pose.ROT ) ab.Node.local.rot.copy( pb.local.rot );
				if( pb.changeState & Pose.POS ) ab.Node.local.pos.copy( pb.local.pos );
				if( pb.changeState & Pose.SCL ) ab.Node.local.scl.copy( pb.local.scl );

				ab.Node.isModified	= true;
				pb.changeState		= 0;
			}

			this.arm.isModified = true;
			return this;
		}
}

/////////////////////////////////////////////////////////////////////
// CONSTANTS
/////////////////////////////////////////////////////////////////////
	Pose.ROT = 1;
	Pose.POS = 2;
	Pose.SCL = 4;


//#####################################################################
export default Pose;