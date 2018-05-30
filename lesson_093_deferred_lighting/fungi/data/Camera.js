import gl			from "../gl.js";
import Transform	from "./Transform.js";
import Mat4			from "../maths/Mat4.js";

class Camera extends Transform{
	constructor(){
		super();

		//Setup the projection and invert matrices
		this.projectionMatrix			= new Float32Array(16);
		this.invertedProjectionMatrix	= new Float32Array(16);	// For Ray Casting
		this.invertedWorldMatrix		= new Float32Array(16); // For Shaders (ViewMatrix)
	}

	setPerspective(fov=45, near=0.1, far=100.0){
		var ratio = gl.width / gl.height;
		Mat4.perspective(this.projectionMatrix, fov, ratio, near, far);
		Mat4.invert(this.invertedProjectionMatrix, this.projectionMatrix); //Save Inverted version for Ray Casting.
		return this;
	}

	setOrthographic(zoom=1, near=-10, far=100, ww=null, hh=null){
		ww = ww || gl.width;
		hh = hh || gl.height;

		var w = 1 * zoom,
			h = hh / ww * zoom;

		console.log("ortho", w, h);
		//ortho(out, left, right, bottom, top, near, far)
		Mat4.ortho(this.projectionMatrix, -w, w, -h, h, near, far);
		Mat4.invert(this.invertedProjectionMatrix, this.projectionMatrix); //Save Inverted version for Ray Casting.
		return this;
	}

	getProjectionViewMatrix(){
		this.updateMatrix();
		return Mat4.mult(
			new Float32Array(16), 
			this.projectionMatrix, 
			this.invertedWorldMatrix
		);
	}

	updateMatrix(){
		var isUpdated = super.updateMatrix();
		if(isUpdated) Mat4.invert(this.invertedWorldMatrix, this.worldMatrix); //Creates ViewMatrix for Shaders
		return isUpdated;
	}
}

export default Camera;