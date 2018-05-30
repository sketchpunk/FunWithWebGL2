import gl			from "../gl.js";
import Transform	from "./Transform.js";
import Mat4			from "../maths/Mat4.js";

class DirectionLight extends Transform{
	constructor(){
		super();

		this.projectionMatrix			= new Float32Array(16);	// Only Needed For Shadow Mapping
		//this.invertedProjectionMatrix	= new Float32Array(16);	// Can be used
		this.invertedWorldMatrix		= new Float32Array(16); // Used like a View Matrix, needed for Shadow Mapping
		this.lightProjViewMatrix 		= new Float32Array(16); // For Shadow Mapping
	}

	setPerspective(fov=45, near=0.1, far=100.0){
		var ratio = gl.width / gl.height;
		Mat4.perspective(this.projectionMatrix, fov, ratio, near, far);
		//Mat4.invert(this.invertedProjectionMatrix, this.projectionMatrix); //Save Inverted version for Ray Casting.
		return this;
	}

	setOrthographic(zoom=1, near=-10, far=100, ww=null, hh=null){
		ww = ww || gl.width;
		hh = hh || gl.height;

		var w = 1 * zoom,
			h = hh / ww * zoom;

		Mat4.ortho(this.projectionMatrix, -w, w, -h, h, near, far);
		//Mat4.invert(this.invertedProjectionMatrix, this.projectionMatrix); //Save Inverted version for Ray Casting.
		return this;
	}

	updateMatrix(){
		var isUpdated = super.updateMatrix();

		if(isUpdated){
			Mat4.invert(this.invertedWorldMatrix, this.worldMatrix); //Invert World Matrix.
			
			Mat4.mult(this.lightProjViewMatrix, this.projectionMatrix, this.invertedWorldMatrix); //Create Matrix for Shadow Mapping
		}
		return isUpdated;
	}
}

export default Camera;