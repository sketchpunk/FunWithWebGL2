import gl 	from "../gl.js";
import Mat4	from "../maths/Mat4.js";

import { Components } from "../Ecs.js";

class Camera{
	constructor(){
		this.projectionMetaData			= null; //Store specific info about Projection Matrix
		this.projectionMatrix			= new Float32Array(16);
		this.invertedProjectionMatrix	= new Float32Array(16);	// For Ray Casting
		this.invertedWorldMatrix		= new Float32Array(16); // For Shaders (ViewMatrix)
	}

	static setOrthographic(com, left, right, bottom, top, near, far){
		com.projectionMetaData = { left, right, bottom, top, near, far };
		Mat4.ortho(com.projectionMatrix, left, right, bottom, top, near, far);
		Mat4.invert(com.invertedProjectionMatrix, com.projectionMatrix); //Save Inverted version for Ray Casting.
	}

	static setProjection(com, fov=45, near=0.1, far=100.0){
		let ratio	= gl.width / gl.height;
		fov			= fov * Math.PI/180;

		com.projectionMetaData = { fov, ratio, near, far };

		Mat4.perspective(com.projectionMatrix, fov, ratio, near, far);
		Mat4.invert(com.invertedProjectionMatrix, com.projectionMatrix); //Save Inverted version for Ray Casting.
	}

	static getProjectionViewMatrix(c){
		return Mat4.mult( new Float32Array(16), c.projectionMatrix, c.invertedWorldMatrix );
	}

} Components(Camera);

export default Camera;