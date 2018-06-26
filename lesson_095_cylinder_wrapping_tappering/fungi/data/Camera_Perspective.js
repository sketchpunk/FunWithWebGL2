import gl			from "../gl.js";
import Transform	from "./Transform.js";
import Mat4			from "../maths/Mat4.js";
import Quat			from "../maths/Quat.js";
import Vec3			from "../maths/Vec3.js";

class Camera extends Transform{
	constructor(){
		super();
		this.near	= 0;
		this.far	= 0;
		this.fov	= 0;
		this.ratio	= 0;

		//Setup the projection and invert matrices
		this.projectionMatrix			= new Float32Array(16);
		this.invertedProjectionMatrix	= new Float32Array(16);	// For Ray Casting
		this.invertedWorldMatrix		= new Float32Array(16); // For Shaders (ViewMatrix)

		this.setProjection();
	}

	setProjection(fov=45, near=0.1, far=100.0){
		this.near	= near;
		this.far	= far;
		this.fov	= fov * Math.PI/180;
		this.ratio	= gl.width / gl.height;

		Mat4.perspective(this.projectionMatrix, this.fov, this.ratio, near, far);
		Mat4.invert(this.invertedProjectionMatrix, this.projectionMatrix); //Save Inverted version for Ray Casting.
		return this;
	}

	getProjectionViewMatrix(){
		this.updateMatrix();
		return Mat4.mult( new Float32Array(16), this.projectionMatrix, this.invertedWorldMatrix );
	}

	//Set camera to look at a specific Direction
	lookDir(dir = null, up = null){
		this.rotation = Quat.lookRotation(dir || Vec3.invert(this._position), up || Vec3.UP );
		return this;
	}

	//Set camera to look at a target, then create the direction based on current camera pos.
	lookAt(point, up = null){
		let dir = Vec3.sub(point, this._position);
		this.rotation = Quat.lookRotation( dir, up || Vec3.UP );
		return this;
	}

	updateMatrix(){
		var isUpdated = super.updateMatrix();
		if(isUpdated) Mat4.invert(this.invertedWorldMatrix, this.worldMatrix); //Creates ViewMatrix for Shaders
		return isUpdated;
	}
}

export default Camera;