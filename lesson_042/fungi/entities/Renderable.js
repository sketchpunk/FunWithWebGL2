import Transform from "./transform.js";
import gl from "../gl.js"

class Renderable extends Transform{
	constructor(vao,matName){
		super();
		this.vao			= vao;
		this.useCulling		= true;
		this.useDepthTest	= true;
		this.drawMode		= gl.ctx.TRIANGLES;
		this.material		= (matName != null && matName !== undefined)? gl.res.materials[matName] : null;
	}

	setMaterial(matName){ this.material = gl.res.materials[matName]; }

	draw(){
		if(this.vao.count == 0) return;

		gl.ctx.bindVertexArray(this.vao.id);
		if(this.vao.isIndexed)	gl.ctx.drawElements(this.drawMode, this.vao.count, gl.ctx.UNSIGNED_SHORT, 0); 
		else					gl.ctx.drawArrays(this.drawMode, 0, this.vao.count);
	}
}

export default Renderable;