import gl			from "../gl.js";
import Transform	from "./Transform.js";
import Mat4			from "../maths/Mat4.js";
import Quat			from "../maths/Quat.js";
import Vec3			from "../maths/Vec3.js";

class Camera extends Transform{
	constructor(){
		super();

		this.oleft		= 0;
		this.oright		= 0;
		this.obottom	= 0;
		this.otop		= 0;
		this.onear		= 0;
		this.ofar		= 0;

		//Setup the projection and invert matrices
		this.projectionMatrix			= new Float32Array(16);
		this.invertedProjectionMatrix	= new Float32Array(16);	// For Ray Casting
		this.invertedWorldMatrix		= new Float32Array(16); // For Shaders (ViewMatrix)
	}

	setOrthographic(left, right, bottom, top, near, far){
		this.oleft		= left;
		this.oright		= right;
		this.obottom	= bottom;
		this.otop		= top;
		this.onear		= near;
		this.ofar		= far;

		Mat4.ortho(this.projectionMatrix, left, right, bottom, top, near, far);
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