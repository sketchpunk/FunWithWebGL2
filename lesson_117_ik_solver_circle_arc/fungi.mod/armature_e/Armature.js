import Fungi			from "../../fungi/Fungi.js";
import {Quat, Vec3 }	from "../../fungi/Maths.js";
import DualQuat			from "../../fungi/maths/DualQuat.js";
import { Components }	from "../../fungi/Ecs.js";

import Transform		from "../../fungi/components/Transform.js";
import TransformNode	from "../../fungi/components/TransformNode.js";

const ENTITY_COMPONENTS = ["Transform", "TransformNode", "Bone"];

class Bone{
	constructor(n,len=1){
		this.order			= 0;
		this.length			= len;

		this.initScale		= new Vec3();	// Initial Value used to create bind pose
		this.initPosition	= new Vec3();
		this.initRotation	= new Quat();

		this.dqBindPose		= new DualQuat();
		this.dqOffset		= new DualQuat();
	}
} Components(Bone);


class Armature{
	constructor(){
		this.bones			= new Array();	// Main Joints Array : Ordered Hierarchy level
		this.orderedBones	= null;			// Second list of joints : Ordered by an order number
		this.isModified		= true;
		this.isActive		= true;

		this.flatOffset	= null;
		this.flatScale	= null;
	}


	////////////////////////////////////////////////////////////////////
	// INITIALIZERS
	////////////////////////////////////////////////////////////////////
		static init(e){
			let arm;
			if(e instanceof Armature)	arm = e;						//Is Component
			else if(!e.com.Armature)	arm = e.addByName("Armature");	//Component missing, add it
			else 						arm = e.com.Armature;			//Get Component Reference

			return e;
		}


		static finalize(e){
			let arm = (e instanceof Armature)? e : e.com.Armature;

			Armature.sortBones(arm).bindPose( e );

			arm.flatOffset	= new Float32Array( arm.bones.length * 8 );
			arm.flatScale	= new Float32Array( arm.bones.length * 4 ); //WARNING, Must be 4, not 3, UBO Arrays require 16 byte blocks, So a Vec3 is treated as a Vec4

			return Armature;
		}


	////////////////////////////////////////////////////////////////////
	// BONES
	////////////////////////////////////////////////////////////////////
		static newBone(arm, name, len = 1, pRef = null, order = null){
			let e = Fungi.ecs.newEntity(name, ENTITY_COMPONENTS);
			e.com.Bone.order	= (order == null)? arm.bones.length : order;
			e.com.Bone.length	= len;

			if(pRef){
				TransformNode.addChild(pRef, e);
				e.com.Transform.position.y = pRef.com.Bone.length; //Move Start of bone to the end of parent's end position.
			}

			arm.bones.push( e );
			return e;
		}

		static getBone(arm, name){
			let b;
			for(b of arm.bones){
				if(b.name == name) return b;
			}
			return null;
		}


		static sortBones(arm){ 
			//Copy array and sort it by ORDER
			arm.orderedBones = arm.bones.slice(0).sort( fSort_bone_order );

			//Sort main array by level for transform hierarchy processing.
			arm.bones.sort( fSort_bone_lvl );

			return Armature;
		}


	////////////////////////////////////////////////////////////////////
	// POSE DATA
	////////////////////////////////////////////////////////////////////
		static bindPose(e){ //only call once when all bones are set where they need to be.
			let t, n, b, arm = (e instanceof Armature)? e : e.com.Armature;
			let dqWorld = new DualQuat();

			for(e of arm.bones){
				t = e.com.Transform;
				n = e.com.TransformNode;
				b = e.com.Bone;

				//................................
				TransformNode.updateNode( e );			// Update Transform Node, Need Heirachy Values
				b.initPosition	.copy( t.position );	// Save original values, to use to reset or whatever
				b.initRotation	.copy( t.rotation );
				b.initScale		.copy( t.scale );		// TODO, is this even needed?

				//................................
				dqWorld.set( n.rotation, n.position );	// Create a Dual Quaternion of the World Space Value
				dqWorld.invert( b.dqBindPose );			// BindPose is the inverse, used to "Subtract" DQs

				//e.com.Transform.isModified = false;
			}
			return Armature;
		}


		static updateOffsets(e){
			let i, be, b, n, arm = (e instanceof Armature)? e : e.com.Armature;
			let dqWorld = new DualQuat();

			//==========================================
			for(i=0; i < arm.bones.length; i++){
				be = arm.bones[i]; //Bone Entity
				if(! be.com.Transform.isModified) continue;

				n	= be.com.TransformNode;
				b	= be.com.Bone;

				dqWorld.set( n.rotation, n.position );	// Create a Dual Quaternion of the World Space
				DualQuat.mul(dqWorld, b.dqBindPose, b.dqOffset); // offset = world * bindPose;
			}

			return this;
		}


		static flattenData( e ){
			let i, ii, iii, b, n, 
				arm = e.com.Armature,
				off = arm.flatOffset,
				sca = arm.flatScale;

			for(i=0; i < arm.orderedBones.length; i++){
				b	= arm.orderedBones[i].com.Bone;
				ii	= i * 8;
				iii	= i * 4;

				off[ii+0]	= b.dqOffset[0];
				off[ii+1]	= b.dqOffset[1];
				off[ii+2]	= b.dqOffset[2];
				off[ii+3]	= b.dqOffset[3];
				off[ii+4]	= b.dqOffset[4];
				off[ii+5]	= b.dqOffset[5];
				off[ii+6]	= b.dqOffset[6];
				off[ii+7]	= b.dqOffset[7];

				n = arm.orderedBones[i].com.TransformNode;
				sca[iii+0]	= n.scale[0];
				sca[iii+1]	= n.scale[1];
				sca[iii+2]	= n.scale[2];
				sca[iii+3]	= 0; //WARNING, This is because of UBO Array Requirements, Vec3 is treated as Vec4
			}
			return this;
		}
} Components(Armature);


/////////////////////////////////////////////////////////////////////////
// Compare function to sort entities based on the level of the hierarchy.
/////////////////////////////////////////////////////////////////////////

function fSort_bone_lvl(a,b){
	let aa = a.com.TransformNode,
		bb = b.com.TransformNode;

	if(aa.level == bb.level)		return  0;	// A = B
	else if(aa.level < bb.level)	return -1;	// A < B
	else							return  1;	// A > B
}

function fSort_bone_order(a,b){
	let aa = a.com.Bone,
		bb = b.com.Bone;

	if(aa.order == bb.order)		return  0;	// A = B
	else if(aa.order < bb.order)	return -1;	// A < B
	else						return  1;	// A > B
}


export default Armature;
export { Bone };