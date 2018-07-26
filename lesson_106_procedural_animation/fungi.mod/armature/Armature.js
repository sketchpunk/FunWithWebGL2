import { Components }	from "../../fungi/Ecs.js";
import {Vec3, Quat}		from "../../fungi/Maths.js";
import DualQuat			from "../../fungi/maths/DualQuat.js";

class Armature{
	constructor(){
		this.joints			= null;	// Main Joints Array : Ordered Hierarchy level
		this.orderedJoints	= null;	// Second list of joints : Ordered by an order number
		this.flatOffset		= null;

		this.isModified		= true;	//Mark if any joint was updated, so we can update Skinning or Previews
	}


	////////////////////////////////////////////////////////////////////
	// INITIALIZERS
	////////////////////////////////////////////////////////////////////
		static init(e){
			let arm;
			if(e instanceof Armature)	arm = e;						//Is Component
			else if(!e.com.Armature)	arm = e.addByName("Armature");	//Component missing, add it
			else 						arm = e.com.Armature;			//Get Component Reference

			arm.joints	= new Array();
			return e;
		}

		static finalize(e){
			let arm = (e instanceof Armature)? e : e.com.Armature;
			Armature.sortJoints(arm).bindPose(arm);
			return e;
		}


	////////////////////////////////////////////////////////////////////
	// JOINT FUNCTIONS
	////////////////////////////////////////////////////////////////////
		static getJoint(e, name){
			let j, arm = (e instanceof Armature)? e : e.com.Armature;
			for(j of arm.joints) if(j.name == name) return j;
			return null;
		}

		static addJoint(arm, name, len = 1, pRef = null, order = null){
			var j 	= new Joint(name, len);
			j.order	= (order == null)? arm.joints.length : order;

			if(pRef){
				j.parent		= pRef;
				j.level			= pRef.level + 1;	// Add Level
				j.position.y	= pRef.length;		// Move Joint to the end of the parent joint
			}

			arm.joints.push( j );
			return j;
		}

		static sortJoints(e){ 
			let arm = (e instanceof Armature)? e : e.com.Armature;
			//Copy array and sort it by ORDER
			arm.orderedJoints = arm.joints.slice(0).sort( fSort_joint_order );

			//Sort main array by level for transform hierarchy processing.
			arm.joints.sort( fSort_joint_lvl );
			return this;
		}


	////////////////////////////////////////////////////////////////////
	// POSE DATA
	////////////////////////////////////////////////////////////////////
		static bindPose(e){ //only call once when all bones are set where they need to be.
			let j, arm = (e instanceof Armature)? e : e.com.Armature;

			for(j of arm.joints){
				//................................
				// Calc our local Pos/Rotation
				j.dqLocal.set( j.rotation, j.position );

				j.bindPosition.copy( j.position ); //Save to use as a starting value Or to reset joint
				j.bindRotation.copy( j.rotation );

				//................................
				// Calculate the World Pos/Rotation
				if(j.parent) 	DualQuat.mul(j.parent.dqWorld, j.dqLocal, j.dqWorld);	// parent.world * child.local = child.world
				else 			j.dqWorld.copy( j.dqLocal );							// no parent, world == local

				//................................
				//Invert the World Dual-Quaternion which create our Bind Pos
				//  This creates a way to "subtract" one DQ from another (You really can't subtract)
				//  So by inverting one, you can use multiplication to achieve the idea of "subtraction"
				j.dqWorld.invert( j.dqBindPose );

				//................................
				j.isModified = false;
			}

			//Create cache for final flat data.
			if(!arm.flatOffset) arm.flatOffset = new Float32Array( arm.joints.length * 8 );
			return this;
		}

		static updatePose(e){
			let i, j, arm = (e instanceof Armature)? e : e.com.Armature;

			//==========================================
			for(i=0; i < arm.joints.length; i++){
				j = arm.joints[i];

				//................................
				if(j.isModified){ //console.log(j.name);
					j.dqLocal.set( j.rotation, j.position );

					if(!j.parent) j.dqWorld.copy( j.dqLocal );
				}

				if(j.parent && (j.parent.isModified || j.isModified)){
					DualQuat.mul(j.parent.dqWorld, j.dqLocal, j.dqWorld); // parent.world * child.local = child.world
					j.isModified = true;	// Set as modifed, so children know parent has an updated world dq
				}

				//................................
				// offset = world * bindPose;
				if(j.isModified) DualQuat.mul(j.dqWorld, j.dqBindPose, j.dqOffset);
			}

			//==========================================
			// Reset all the modified states
			for(j of arm.joints) j.isModified = false;

			arm.isModified	= false;
		}


	////////////////////////////////////////////////////////////////////
	// FLATTEN DATA
	////////////////////////////////////////////////////////////////////
		//Used by a renderable to get the offset joint values
		//for deforming the mesh to simulate movement (animations)
		static flatOffset(e, out = null){
			let i, ii, dq,
				arm = (e instanceof Armature)? e : e.com.Armature;
				out = out || new Float32Array( arm.orderedJoints.length * 8 );

			for(i=0; i < arm.orderedJoints.length; i++){
				dq = arm.orderedJoints[i].dqOffset;
				ii = i * 8;
				out[ii+0] = dq[0];
				out[ii+1] = dq[1];
				out[ii+2] = dq[2];
				out[ii+3] = dq[3];
				out[ii+4] = dq[4];
				out[ii+5] = dq[5];
				out[ii+6] = dq[6];
				out[ii+7] = dq[7];
			}
			return out;
		}

		//Used by ArmaturePreview
		static flatWorldSpace(e, out = null){ // Used for visualizing bones
			let i, ii, dq, 
				arm = (e instanceof Armature)? e : e.com.Armature;
				out = out || new Float32Array( arm.joints.length * 8 );

			for(i=0; i < arm.joints.length; i++){
				dq = arm.joints[i].dqWorld;
				ii = i * 8;
				out[ii+0] = dq[0];
				out[ii+1] = dq[1];
				out[ii+2] = dq[2];
				out[ii+3] = dq[3];
				out[ii+4] = dq[4];
				out[ii+5] = dq[5];
				out[ii+6] = dq[6];
				out[ii+7] = dq[7];
			}
			return out;
		}
} Components(Armature);



class Joint{
	constructor(n,len=1){
		this.name		= n;
		this.level		= 0;
		this.order		= 0;
		this.parent		= null;
		this.length		= len;

		//...................................
		this.position	= new Vec3();
		this.rotation	= new Quat();

		this.bindPosition = new Vec3();
		this.bindRotation = new Quat();

		//...................................
		//Dual Quaternions to Hold Rotation/Position data instead of using Matrices.
		this.dqLocal	= new DualQuat(); // Local Pos/Rot
		this.dqWorld	= new DualQuat(); // Local plus all parents up the tree
		this.dqBindPose	= new DualQuat(); // Initial Pos/Rot of joint in World Space
		this.dqOffset	= new DualQuat(); // World Pos minus BindPose = How much to move the joint actually.

		//...................................
		this.isModified	= true;
	}

	setPos(x,y,z){
		this.position.set(x,y,z);
		this.isModified = true;
		return this;
	}

	setRot(q){
		this.rotation.copy(q);
		this.isModified = true;
		return this;
	}

	mulRot(q){
		this.rotation.mul(q);
		this.isModified = true;
		return this;
	}
}



//Compare function to sort entities based on the level of the hierarchy.
function fSort_joint_lvl(a,b){
	if(a.level == b.level)		return  0;	// A = B
	else if(a.level < b.level)	return -1;	// A < B
	else						return  1;	// A > B
}

function fSort_joint_order(a,b){
	if(a.order == b.order)		return  0;	// A = B
	else if(a.order < b.order)	return -1;	// A < B
	else						return  1;	// A > B
}

export default Armature;