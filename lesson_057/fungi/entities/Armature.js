import Renderable					from "./Renderable.js";
import gl, {VAO, ATTR_POSITION_LOC}	from "../gl.js";
import { Vec3, Quat, DualQuat } from "../Maths.js";

class Armature{
	constructor(){
		this.joints = [];
		this.orderedJoints = [];
	}

	//Joints must be made in parents first then child
	//Important for updates that parent matrices get calced first before children.
	addJoint(name,rot,pos,parentIdx,jointNum){
		var joint = {
			jointNum:	jointNum,
			index:		this.joints.length,
			parent:		(parentIdx == undefined || parentIdx == null)? null : parentIdx,
			name:		name,
			isSkinned:	true,
			position:	new Vec3(),
			rotation:	new Quat(),

			localDQ:	new DualQuat(),
			worldDQ:	new DualQuat(),
			bindPoseDQ:	new DualQuat(),
			offsetDQ:	new DualQuat()
		};

		if(rot != undefined && rot != null) joint.rotation.copy(rot);
		if(pos != undefined && pos != null) joint.position.copy(pos);

		this.joints.push(joint);

		//When Bone data comes from external source like GLTF, joint index != joint number applied on vertices
		if(jointNum != undefined && jointNum != null) this.orderedJoints[jointNum] = joint;
		return joint;
	}

	setBindPose(){ //only call once when all bones are set where they need to be.
		var b,p;

		for(var i=0; i < this.joints.length; i++){
			b = this.joints[i];										//Bone
			p = (b.parent != null)? this.joints[b.parent] : null;	//Parent Bone

			//Calc Local matrix
			//mat4.fromQuaternionTranslation(b.localMatrix,b.rotation,b.position);
			b.localDQ.set(b.rotation,b.position);
			b.position.isModified = false;
			b.rotation.isModified = false;

			//Calculate the World Q & P
			if(p != null)	p.worldDQ.mul(b.localDQ,b.worldDQ);	//world = p.world * local
			else			b.worldDQ.copy(b.localDQ);			//no parent, local is world

			//Now we invert the world matrix which creates our bind pose,
			//a starting point to check for changes in the world matrix
			//mat4.invert(b.bindPoseMatrix,b.worldMatrix);
			b.worldDQ.invert(b.bindPoseDQ);
		}
	}

	update(){ //calc all the bone positions
		var b, p, forceUpdate = false;
		for(var i=0; i < this.joints.length; i++){
			b = this.joints[i];			//Bone
			p = (b.parent != null)? this.joints[b.parent] : null;	//Parent Joint

			if(b.position.isModified || b.rotation.isModified){ 
				forceUpdate = true;

				b.localDQ.set(b.rotation,b.position);
				b.position.isModified = false;
				b.rotation.isModified = false;
			}

			if(forceUpdate){ //console.log(i,b.name,b.parent);
				if(p != null) 	p.worldDQ.mul(b.localDQ,b.worldDQ);	//world = p.world * local
				else 			b.worldDQ.copy(b.localDQ);			//No parent, Local == World

				//Calc the difference from the bindPose
				b.worldDQ.mul(b.bindPoseDQ, b.offsetDQ); // offset = world * bindPose;
			}
		}
	}

	getFlatOffset(out){ //Used for Vertices to move
		var b, j,
			bAry = (this.orderedJoints.length > 0)? this.orderedJoints : this.joints;

		for(var i=0; i < bAry.length; i++){
			b = bAry[i].offsetDQ;
			out.push(b[0],b[1],b[2],b[3],b[4],b[5],b[6],b[7]);
		}
	}

	getFlatWorldSpace(out){ //Used for visualizing bones
		var b;
		for(var i=0; i < this.joints.length; i++){
			b = this.joints[i].worldDQ;
			out.push(b[0],b[1],b[2],b[3],b[4],b[5],b[6],b[7]);
		}
	}
}


class ArmatureRenderer extends Renderable{
	constructor(arm,matName,jointLen){
		super(null,matName);
		if(!jointLen) jointLen = 3.0;

		this.armature = arm;
		this.drawMode = gl.ctx.LINES;


		var verts = [0,0,0,0, 0,jointLen,0,1];
		var offset = [];
		this.armature.getFlatWorldSpace(offset);
		//console.log(offset);

		this.vao = VAO.create();
		VAO.floatArrayBuffer(this.vao,"bVertices",verts,ATTR_POSITION_LOC,4,0,0,true)
			.floatArrayBuffer(this.vao,"bOffset",offset,8,4,32,0,true,true)	//QR (Rotation)
			.partitionFloatBuffer(9,4,32,16,true) 									//QD (Translation)
			.finalize(this.vao);

		this.instanceSize = offset.length/8; //How many bones are we rendering
		//console.log(this.instanceSize);
		//console.log(this.vao);
	}

	updateOffset(){
		var offset = [];
		this.armature.getFlatWorldSpace(offset);
		//console.log("x",offset);
		//TODO Only Update if dirty;

		gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER,this.vao.bOffset.ptr);
		gl.ctx.bufferSubData(gl.ctx.ARRAY_BUFFER, 0, new Float32Array(offset), 0, null);
		gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER,null);
	}

	draw(){
		if(this.vao.count > 0){
			this.updateOffset();
			//console.log(this.vao.buffers["offset"].buf);

			gl.ctx.bindVertexArray(this.vao.ptr);
			gl.ctx.drawArraysInstanced(this.drawMode, 0, this.vao.count, this.instanceSize);

			//if(this.vao.isIndexed)	gl.ctx.drawElements(this.drawMode, this.vao.count, Fungi.gl.UNSIGNED_SHORT, 0); 
			//else 					gl.ctx.drawArrays(this.drawMode, 0, this.vao.count);
		}
	}
}

export { Armature, ArmatureRenderer };