import gl							from "../gl.js";
import fungi						from "../fungi.js";
import Transform					from "../entities/Transform.js";
import {Vec3, Mat4, Quat, DEG2RAD}	from "../Maths.js";

class Orbit extends Transform{
	constructor(fov,near,far){
		super();
		//Setup the projection and invert matrices
		this.projectionMatrix = new Float32Array(16);
		this.invertedProjectionMatrix = new Float32Array(16);
		this.invertedLocalMatrix = new Float32Array(16);

		var ratio = gl.ctx.canvas.width / gl.ctx.canvas.height;
		Mat4.perspective(this.projectionMatrix, fov || 45, ratio, near || 0.1, far || 100.0);
		Mat4.invert(this.invertedProjectionMatrix, this.projectionMatrix); //Save Inverted version for Ray Casting.

		gl.UBOTransform.update(
			"matProjection",this.projectionMatrix,
			"screenRes", new Float32Array( [ gl.width, gl.height ] )
		); //Initialize The Transform UBO.

		//Orbit Camera will control things based on euler, its cheating but not ready for quaternions
		this.euler = new Vec3();
	}

	orthoProjection(zoom=1,near=-10,far=100){
		var w = 1 * zoom,
			h = gl.height / gl.width * zoom;

		Mat4.ortho(this.projectionMatrix, -w, w, -h, h, near, far);
		Mat4.invert(this.invertedProjectionMatrix, this.projectionMatrix); //Save Inverted version for Ray Casting.

		gl.UBOTransform.update(
			"matProjection",this.projectionMatrix,
			"screenRes", new Float32Array( [ gl.width, gl.height ] )
		); //Initialize The Transform UBO.

		return this;
	}

	//Override how this transfer creates the localMatrix : Call Update, not this function in render loop.
	updateMatrix(){
		//Only Update the Matrix if its needed.
		//if(!this.position.isModified && !this.rotation.isModified && !this.euler.isModified) return this.localMatrix;
		
		Quat.setFromEuler(this.rotation,this.euler.x,this.euler.y,this.euler.z,"YXZ");
		Mat4.fromQuaternion(this.localMatrix,this.rotation);
		this.localMatrix.resetTranslation().translate(this.position);

		//Set the modified indicator to false on all the transforms.
		this.position.isModified	= false;
		this.rotation.isModified	= false;
		this.euler.isModified		= false;
		return this.localMatrix;
	}

	//Update the Matrices and UBO.
	update(){
		if(this.position.isModified || this.scale.isModified || this.euler.isModified){
			this.updateMatrix();
			Mat4.invert(this.invertedLocalMatrix,this.localMatrix);
		}
	}

	setEulerDegrees(x,y,z){ this.euler.set(x * DEG2RAD,y * DEG2RAD,z * DEG2RAD); return this; }

	getWorldPosition(){
		//Because of how orbit works, position isn't in worldspace.
		//Need to apply rotation to bring it into world splace
		var ary = new Float32Array(3);
		Quat.rotateVec3(this.rotation,this.position,ary); 
		return ary;
	}

	worldToScreen(vAry){
		var mat	= new Float32Array(16), // Matrix4 Holder
			p	= [0,0,0,0],			// Vec4
			rtn	= [];					// List of vec2 results

		//Move Points from WorldSpace to -> View Space (View Matrix) -> ClipSpace (ProjMatrix)
		Mat4.mult(mat,this.projectionMatrix,this.invertedLocalMatrix);

		for(var i=0; i < vAry.length; i++){
			Mat4.transformVec3(p, vAry[i], mat);

			//Move from Clip Space to NDC Space (Normalized Device Coordinate Space) (-1 to 1 opengl viewport)
			if(p[3] != 0){ //only if W is not zero,
				p[0] = p[0] / p[3];
				p[1] = p[1] / p[3];
			}

			//Then finally move the points to Screen Space
			//Map points from -1 to 1 range into  0 to 1 range, Then multiple by canvas size
			rtn.push( // Replaced /2 with *0.5
				( p[0] + 1) * 0.5 * gl.width,
				(-p[1] + 1) * 0.5 * gl.height
			);
		}

		if(vAry.length == 1) return rtn[0]; //Just return the one point
		return rtn;	//Return all the points
	}
}

export default Orbit;