import Transform from "./Transform.js";
import gl from "../gl.js"

class Renderable extends Transform{
	constructor(vao,matName){
		super();
		this.vao			= vao;
		this.useCulling		= true;
		this.useDepthTest	= true;
		this.drawMode		= gl.ctx.TRIANGLES;
		this.material		= gl.res.getMaterial(matName);
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