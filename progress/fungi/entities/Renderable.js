import gl			from "../gl.js"
import Transform	from "./Transform.js";
import { Mat4 }		from "../Maths.js";

class Renderable extends Transform{
	constructor(vao,matName){
		super();
		this.vao			= vao;
		this.useCulling		= true;
		this.useDepthTest	= true;
		this.useNormals		= false;

		this.drawMode		= gl.ctx.TRIANGLES;
		this.material		= gl.res.getMaterial(matName);

		this.normalMatrix	= new Float32Array(9);
	}

	updateMatrix(forceWorldUpdate=false){
		var isNew = super.updateMatrix(forceWorldUpdate);

		//Calcuate the Normal Matrix which doesn't need translate, then transpose and inverses the mat4 to mat3
		if(isNew && this.useNormals) Mat4.normalMat3(this.normalMatrix,this.worldMatrix);
	}

	setMaterial(matName){ this.material = gl.res.getMaterial(matName); }

	setOptions(culling,depthTest=true){
		this.useCulling		= culling;
		this.useDepthTest	= depthTest;
		return this;
	}

	draw(){
		if(this.vao.count == 0) return;

		gl.ctx.bindVertexArray(this.vao.ptr);
		if(this.vao.isIndexed)	gl.ctx.drawElements(this.drawMode, this.vao.count, gl.ctx.UNSIGNED_SHORT, 0); 
		else					gl.ctx.drawArrays(this.drawMode, 0, this.vao.count);
	}
}

export default Renderable;