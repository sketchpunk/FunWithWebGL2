import gl			from "../gl.js"
import Fungi	from "../Fungi.js";
import Transform	from "../data/Transform.js";
import { Mat4 }		from "../Maths.js";


class Renderable extends Transform{
	constructor(name, vao, matName = null){
		super();
		this.name 			= name;
		this.vao			= vao;

		//this.drawOrder		= 10;
		this.drawMode		= gl.ctx.TRIANGLES;
		this.material		= null;
		this.normalMatrix	= null;

		this.options = { cullFace : true }

		if(matName) this.setMaterial(matName);
	}

	updateMatrix(){
		var isUpdated = super.updateMatrix();

		//Calcuate the Normal Matrix which doesn't need translate
		//but needs to apply transpose and inverses the mat4 to mat3
		if(isUpdated && this.normalMatrix) Mat4.normalMat3(this.normalMatrix, this.worldMatrix);

		return isUpdated;
	}

	setMaterial(matName){
		this.material = (matName)? Fungi.getMaterial(matName) : null;;
		
		//If the shader reqires normal matrix, set it up to be updated when transformations are calculated.
		if(!this.normalMatrix && this.material && this.material.shader.options.normalMatrix){
			this.normalMatrix = new Float32Array(9);
		}

		return this; 
	}
	//enableNormals(){		this.normalMatrix	= new Float32Array(9);			return this; }

	//clone(){
	//	var o = new Renderable(this.vao,null);
	//	o.useCulling	= this.useCulling;
	//	o.useDepthTest	= this.useDepthTest;
	//	o.useNormals	= this.useNormals;
	//	o.drawMode		= this.drawMode;
	//	o.material		= this.material;
	//	return o;
	//}

	//draw(render){
	//	if(this.vao.elmCount == 0) return;
	//	render.drawRenderable(this);
	//}
}

export default Renderable;