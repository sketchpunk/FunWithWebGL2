import gl from "../gl.js";
import Transform from "../entities/transform.js";
import { Vec3,Mat4,Quat,DEG2RAD } from "../maths.js";

class Orbit extends Transform{
	constructor(fov,near,far){
		super();
		//Setup the projection and invert matrices
		this.ubo = gl.UBOTransform;
		this.projectionMatrix = new Float32Array(16);
		this.invertedLocalMatrix = new Float32Array(16);

		var ratio = gl.ctx.canvas.width / gl.ctx.canvas.height;
		Mat4.perspective(this.projectionMatrix, fov || 45, ratio, near || 0.1, far || 100.0);
		this.ubo.update("matProjection",this.projectionMatrix); //Initialize The Transform UBO.

		//Orbit Camera will control things based on euler, its cheating but not ready for quaternions
		this.euler = new Vec3();
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
		this.ubo.update("matCameraView",this.invertedLocalMatrix,"posCamera",this.position);
	}

	setEulerDegrees(x,y,z){ this.euler.set(x * DEG2RAD,y * DEG2RAD,z * DEG2RAD); return this; }
}

export default Orbit;