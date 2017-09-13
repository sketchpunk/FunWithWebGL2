class SkinnedMesh extends Fungi.Renderable{
	constructor(geo,matName){
		super({},matName);

		
		//Create VAO & Buffers
		Fungi.Shaders.VAO.create(this.vao)
			.floatArrayBuffer(this.vao,"vert",geo.vertices.data,Fungi.ATTR_POSITION_LOC,geo.vertices.compLen,0,0,true,false);

		if(geo.indices.count > 0) Fungi.Shaders.VAO.indexBuffer(this.vao,"index",geo.indices.data,true,false);
		if(geo.joints != undefined && geo.joints.count > 0){
			//var bAry = [], wAry = [];
			//geo.compileBones(bAry,wAry);
			
			Fungi.Shaders.VAO.floatArrayBuffer(this.vao,"boneIdx",geo.joints.data,3,geo.joints.compLen,0,0,true,false)
						.floatArrayBuffer(this.vao,"boneWeight",geo.weights.data,4,geo.weights.compLen,0,0,true,false);
		}

		Fungi.Shaders.VAO.finalize(this.vao);

		//Create VAO & Buffers
		this.drawMode	= (this.vao.isIndexed)? Fungi.gl.TRIANGLES : Fungi.gl.POINTS;
		this.visible	= true;
		this.skeleton 	= null;
	}

	draw(){
		if(this.vao.count > 0){
			var mat = [];
			this.skeleton.getFlatOffset(mat);
			this.material.shader.setUniforms("uBones",mat);

			Fungi.gl.bindVertexArray(this.vao.id);
			if(this.vao.isIndexed)	Fungi.gl.drawElements(this.drawMode, this.vao.count, Fungi.gl.UNSIGNED_SHORT, 0); 
			else 					Fungi.gl.drawArrays(this.drawMode, 0, this.vao.count);
		}
	}
}

class QSkeleton{
	constructor(){
		this.bones = [];
		this.orderedBones = [];
	}

	//Bones must be made in parents first then child
	//Important for updates that parent matrices get calced first before children.
	addBone(name,rot,pos,parentIdx,jointNum){
		var bone = {
			jointNum:	jointNum,
			index:		this.bones.length,
			parent:		(parentIdx == undefined || parentIdx == null)? null : parentIdx,
			name:		name,
			isSkinned:	true,
			position:	new Fungi.Maths.Vec3(),
			rotation:	new Fungi.Maths.Quaternion(),

			localDQ:	new Fungi.Maths.DualQuat(),
			worldDQ:	new Fungi.Maths.DualQuat(),
			bindPoseDQ:	new Fungi.Maths.DualQuat(),
			offsetDQ:	new Fungi.Maths.DualQuat()
		};

		if(rot != undefined && rot != null) bone.rotation.copy(rot);
		if(pos != undefined && pos != null) bone.position.copy(pos);

		this.bones.push(bone);

		//When Bone data comes from external source like GLTF, joint index != joint number applied on vertices
		if(jointNum != undefined && jointNum != null) this.orderedBones[jointNum] = bone;
		return bone;
	}

	setBindPose(){ //only call once when all bones are set where they need to be.
		var b,p;

		for(var i=0; i < this.bones.length; i++){
			b = this.bones[i];										//Bone
			p = (b.parent != null)? this.bones[b.parent] : null;	//Parent Bone

			//Calc Local matrix
			//mat4.fromQuaternionTranslation(b.localMatrix,b.rotation,b.position);
			b.localDQ.set(b.rotation,b.position);
			b.position.isModified = false;
			b.rotation.isModified = false;

			//b.worldPosition.copy(b.position); //Copy Local to World.
			//b.worldRotation.copy(b.rotation);

			//Calculate the World Q & P
			if(p != null){
				//b.worldPosition.add(this.bones[b.parent].position);
				//quat.multi(b.worldRotation,this.bones[b.parent].rotation,b.rotation);

				//mat4.mult(b.worldMatrix, this.bones[b.parent].worldMatrix,b.localMatrix);
				p.worldDQ.mul(b.localDQ,b.worldDQ); //world = p.world * local
			}else{
				//no parent, local is world
				//b.worldRotation.copy(this.bones[b.parent].rotation);
				b.worldDQ.copy(b.localDQ);
			}

			//Now we invert the world matrix which creates our bind pose,
			//a starting point to check for changes in the world matrix
			//mat4.invert(b.bindPoseMatrix,b.worldMatrix);
			b.worldDQ.invert(b.bindPoseDQ);


			//b.worldPosition.multi(-1,b.bindPosePosition);
			//quat.invert(b.bindPoseRotation,b.worldRotation);
		}
	}

	update(){ //calc all the bone positions
		var b, p, forceUpdate = false;
		for(var i=0; i < this.bones.length; i++){
			b = this.bones[i];			//Bone
			p = (b.parent != null)? this.bones[b.parent] : null;	//Parent Bone

			if(b.position.isModified || b.rotation.isModified){ 
				forceUpdate = true;

				b.localDQ.set(b.rotation,b.position);
				b.position.isModified = false;
				b.rotation.isModified = false;
			}

			if(forceUpdate){ //console.log(i,b.name,b.parent);
				if(p != null) 	p.worldDQ.mul(b.localDQ,b.worldDQ); //world = p.world * local
				else 			b.worldDQ.copy(b.localDQ); //No parent, Local == World

				//Calc the difference from the bindPose
				b.worldDQ.mul(b.bindPoseDQ, b.offsetDQ); // offset = world * bindPose;
			}
		}
	}

	getFlatOffset(out){ //Used for Vertices to move
		var b,
			j,
			bAry = (this.orderedBones.length > 0)? this.orderedBones : this.bones;

		for(var i=0; i < bAry.length; i++){
			b = bAry[i].offsetDQ;
			out.push(b[0],b[1],b[2],b[3],b[4],b[5],b[6],b[7]);
			//for(j=0; j < 16; j++) out[ (i*16) + j ] = b.offsetMatrix[j];
		}
	}

	getFlatWorldSpace(out){ //Used for visualizing bones
		var b;
		for(var i=0; i < this.bones.length; i++){
			b = this.bones[i].worldDQ;
			out.push(b[0],b[1],b[2],b[3],b[4],b[5],b[6],b[7]);
		}
	}
}

class QSkeletonMesh extends Fungi.Renderable{
	constructor(skel,matName,boneLen){
		super({},matName);
		if(!boneLen) boneLen = 3.0;

		this.skeleton = skel;
		this.drawMode = Fungi.gl.LINES;

		var verts = [0,0,0,0, 0,boneLen,0,1];
		var offset = [];
		skel.getFlatWorldSpace(offset);
		
		Fungi.Shaders.VAO.create(this.vao)
			.floatArrayBuffer(this.vao,"vert",verts,Fungi.ATTR_POSITION_LOC,4,0,0,true,false)
			.floatArrayBuffer(this.vao,"offset",offset,8,4,32,0,true,false,true)
			.partitionBuffer(9,4,32,16,true)
			.finalize(this.vao);

		this.instanceSize = offset.length/8; //How many bones are we rendering
		console.log(this.instanceSize);
	}

	updateOffset(){
		var offset = [];
		this.skeleton.getFlatWorldSpace(offset);

		Fungi.gl.bindBuffer(Fungi.gl.ARRAY_BUFFER,this.vao.buffers["offset"].buf);
		Fungi.gl.bufferSubData(Fungi.gl.ARRAY_BUFFER, 0, new Float32Array(offset), 0, null);
		Fungi.gl.bindBuffer(Fungi.gl.ARRAY_BUFFER,null);
	}

	draw(){
		if(this.vao.count > 0){
			this.updateOffset();
			//console.log(this.vao.buffers["offset"].buf);

			Fungi.gl.bindVertexArray(this.vao.id);
			Fungi.gl.drawArraysInstanced(this.drawMode, 0, this.vao.count, this.instanceSize);

			//if(this.vao.isIndexed)	Fungi.gl.drawElements(this.drawMode, this.vao.count, Fungi.gl.UNSIGNED_SHORT, 0); 
			//else 					Fungi.gl.drawArrays(this.drawMode, 0, this.vao.count);
		}
	}
}




class Skeleton{
	constructor(){
		this.bones = [];
		this.orderedBones = [];
	}

	//Bones must be made in parents first then child
	//Important for updates that parent matrices get calced first before children.
	addBone(name,rot,pos,parentIdx,jointNum){
		var bone = {
			jointNum:	jointNum,
			index: this.bones.length,
			parent: (parentIdx == undefined || parentIdx == null)? null : parentIdx,
			name:name,
			isSkinned:true,
			position:new Fungi.Maths.Vec3(),
			rotation:new Fungi.Maths.Quaternion(),

			localMatrix: new Fungi.Maths.Matrix4(),
			worldMatrix: new Fungi.Maths.Matrix4(),
			bindPoseMatrix: new Fungi.Maths.Matrix4(),	//Invert of Initial World Matrix
			offsetMatrix: new Fungi.Maths.Matrix4(),	//Change from current WorldMatrix compared to BindPoseMatrix
		};

		if(rot != undefined && rot != null) bone.rotation.copy(rot);
		if(pos != undefined && pos != null) bone.position.copy(pos);

		this.bones.push(bone);
		if(jointNum != undefined && jointNum != null) this.orderedBones[jointNum] = bone;

		return bone;
	}

	setBindPose(){ //only call once when all bones are set where they need to be.
		var b, mat4 = Fungi.Maths.Matrix4;
		for(var i=0; i < this.bones.length; i++){
			b = this.bones[i];

			//Calc Local matrix
			mat4.fromQuaternionTranslation(b.localMatrix,b.rotation,b.position);
			b.position.isModified = false;
			b.rotation.isModified = false;

			//Calculate the World Matrix
			if(b.parent != null)	mat4.mult(b.worldMatrix, this.bones[b.parent].worldMatrix,b.localMatrix);
			else 					b.worldMatrix.copy(b.localMatrix); //no parent, localMatrix is worldMatrix

			//Now we invert the world matrix which creates our bind pose,
			//a starting point to check for changes in the world matrix
			mat4.invert(b.bindPoseMatrix,b.worldMatrix);
		}
	}

	update(){ //calc all the bone positions
		var b, mat4 = Fungi.Maths.Matrix4;
		var forceUpdate = false;
		for(var i=0; i < this.bones.length; i++){
			b = this.bones[i];

			if(b.position.isModified || b.rotation.isModified){
				forceUpdate = true;

				mat4.fromQuaternionTranslation(b.localMatrix,b.rotation,b.position);
				b.position.isModified = false;
				b.rotation.isModified = false;
			}

			if(forceUpdate){
				//Calculate the World Matrix
				if(b.parent != null)	mat4.mult(b.worldMatrix, this.bones[b.parent].worldMatrix,b.localMatrix);
				else 					b.worldMatrix.copy(b.localMatrix); //no parent, localMatrix is worldMatrix

				//Calc the difference from the bindPose
				mat4.mult(b.offsetMatrix, b.worldMatrix, b.bindPoseMatrix);
			}
		}
	}

	getFlatOffset(out){ //Used for Vertices to move
		var b,j;
		var bAry = (this.orderedBones.length > 0)? this.orderedBones : this.bones;

		for(var i=0; i < bAry.length; i++){
			b = bAry[i];
			for(j=0; j < 16; j++) out[ (i*16) + j ] = b.offsetMatrix[j];
		}
	}

	getFlatWorldSpace(out){ //Used for visualizing bones
		var b,j;
		for(var i=0; i < this.bones.length; i++){
			b = this.bones[i];
			for(j=0; j < 16; j++) out[ (i*16) + j ] = b.worldMatrix[j];
		}
	}
}

//http://veeenu.github.io/2014/05/09/implementing-skeletal-animation.html
//http://veeenu.github.io/data/2014-05-09-implementing-skeletal-animation/veeenu-skeletal-animation/test08.js
//http://blog.tojicode.com/2011/10/building-game-part-3-skinning-animation.html
//https://stackoverflow.com/questions/36921337/how-do-you-do-skinning-in-webgl
//http://webglsamples.org/WebGL2Samples/#draw_instanced
class SkeletonMesh extends Fungi.Renderable{
	constructor(skel,matName,boneLen){
		super({},matName);
		if(!boneLen) boneLen = 3.0;


		this.skeleton = skel;
		this.drawMode = Fungi.gl.LINES;

		var verts = [0,0,0,0, 0,boneLen,0,1];
		var offset = [];

		var b;
		for(var i=0; i < skel.bones.length; i++){
			b = skel.bones[i].worldMatrix;
			for(var j=0; j < b.length; j++) offset.push(b[j]);
		}
		
		Fungi.Shaders.VAO.create(this.vao)
			.floatArrayBuffer(this.vao,"vert",verts,Fungi.ATTR_POSITION_LOC,4,0,0,true,false)
			.mat4ArrayBuffer(this.vao,"offset",offset,10,true,false,true);
			

		Fungi.Shaders.VAO.finalize(this.vao);
		this.instanceSize = offset.length/16; //How many bones are we rendering
	}

	updateOffset(){
		var offset = [];
		this.skeleton.getFlatWorldSpace(offset);

		//Push Matrices to GPU
		Fungi.gl.bindBuffer(Fungi.gl.ARRAY_BUFFER,this.vao.buffers["offset"].buf);
		Fungi.gl.bufferSubData(Fungi.gl.ARRAY_BUFFER, 0, new Float32Array(offset), 0, null);
		Fungi.gl.bindBuffer(Fungi.gl.ARRAY_BUFFER,null);
	}

	draw(){
		if(this.vao.count > 0){
			this.updateOffset();
			//console.log(this.vao.buffers["offset"].buf);

			Fungi.gl.bindVertexArray(this.vao.id);
			Fungi.gl.drawArraysInstanced(this.drawMode, 0, this.vao.count, this.instanceSize);

			//if(this.vao.isIndexed)	Fungi.gl.drawElements(this.drawMode, this.vao.count, Fungi.gl.UNSIGNED_SHORT, 0); 
			//else 					Fungi.gl.drawArrays(this.drawMode, 0, this.vao.count);
		}
	}
}