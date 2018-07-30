import Maths, { Vec3, Quat }	from "../../fungi/Maths.js";
import DualQuat					from "../../fungi/maths/DualQuat.js";
import Armature					from "./Armature.js";


//Find a child bone in an armature BUT only if one exists, if more then one child found, return as it no next bone.
function findSingleNextJoint(ary, j){
	let i, itm = -1;
	for(i=0; i < ary.length; i++){
		if(ary[i].parent === j){
			if(itm != -1) return -1; //If another child joint found, exit with -1
			itm = i;
		}
	}
	return itm;
}


class Weights{
	//Two Weight Conditions.
	// 1 - If there is a next bone, Share weight with it.
	// 2 - if there is no next bone, then weight is 1.
	static geoWeights(geo, e, range = 1){
		let arm		= (e instanceof Armature)? e : e.com.Armature,
			bones	= Weights.getBoneInfoFromJoints(arm),
			bCnt	= bones.length,
			maxLen	= range * range; //Square it to get lengthSqr for comparison
//console.log(bones);
		let i, 						// Index 
			b,						// Bone Ref
			t,						// Projection Value
			lenVec	= new Vec3(),	// Length Vector
			lenSqr,					// Length Square
			nextIdx,				// Index of Next Bone
			nextWeight,				// Weight for next Bone
			thisWeight,				// Weight for this bone being checked
			tPos	= new Vec3(),	// Position of Projection
			bvLen	= new Vec3();	// Vector Length of Bone Origin to Vertex

		for(let v of geo.verts){
			for(i=0; i < bCnt; i++){
				b = bones[i];

				//....................................
				Vec3.sub(v, b.vStart, bvLen);						// get b for projection
				t = Vec3.dot( b.vLength, bvLen ) * b.fLenSqrInv;	// proj = dot(a,b) / dot(a,a);
				//console.log("T", b.fLenSqrInv);

				// if out of bounds, then not parallel to bone.
				// If by chance its 1 BUT there is a next bone, exit too.
				if(	t < 0 || 
					t > 1 || 
					(t == 1 && b.nextIdx != -1)
				) continue; 

				
				//....................................
				//Check of the vertex is within range of the bone
				b.vLength.scale(t, tPos).add( b.vStart );			// BoneVecLen * t + BoneOriginPos
				lenSqr = Vec3.sub( v, tPos, lenVec).lengthSqr();	// dot(VertexPos - BoneTPos)
				if(lenSqr > maxLen) continue;

				//....................................
				//Calc Weight
				if(b.nextIdx == -1){	// No next bone to share weight
					nextIdx		= 0;
					nextWeight	= 0;
					thisWeight	= 1;
				}else{					// Share Weight with next Bone
					nextIdx		= b.nextIdx;
					nextWeight	= t;
					thisWeight	= 1 - t;
				}

				v	.initJoints( i, nextIdx, 0, 0 )
					.initJointWeights( thisWeight, nextWeight, 0, 0 );

				//console.log(i, nextIdx, thisWeight, nextWeight);
			}
		}
	}


	////////////////////////////////////////////////////////////////
	// 
	////////////////////////////////////////////////////////////////
	static getBoneInfoFromJoints(e){
		let arm	= (e instanceof Armature)? e : e.com.Armature,
			v	= new Vec3(),
			b0	= new Vec3(),
			b1	= new Vec3(),
			lenSqr;

		//Precalculate all the bones from Joint Data
		let bones = new Array();
		for(let j of arm.orderedJoints){
			//..................................
			// Calc the 2 points of a bone.
			DualQuat.getTranslation(j.dqWorld, b0);	// Get World Space Position of Joint from DQ
			v.copy(Vec3.UP).scale(j.length);		// Vector Length of the Bone

													// Rotate the direction based on World Rotation from DQ	
			if(j.parent)	Quat.rotateVec3(j.parent.dqWorld, v, v);
			else 			Quat.rotateVec3(j.dqWorld, v, v);

			b0.add(v, b1);							// Add Vector Length to Joint Position

			//..................................
			// Create Bone Information that may be needed for calculating Weights
			lenSqr = v.lengthSqr();
			bones.push({
				joint		: j,
				vStart		: new Vec3(b0),
				vEnd		: new Vec3(b1),
				vLength		: new Vec3(v),
				fLenSqr		: lenSqr,
				fLenSqrInv	: 1 / lenSqr,
				nextIdx		: findSingleNextJoint( arm.orderedJoints, j)
			});
		}
		return bones;
	}
}

export default Weights;