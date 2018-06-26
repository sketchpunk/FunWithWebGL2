import gl 				from "../../fungi/gl.js";
import Vao 				from "../../fungi/Vao.js";
import Renderable		from "../../fungi/rendering/Renderable.js";
import DynamicBuffer	from "../../fungi/data/DynamicBuffer.js";

class DynamicChunk extends Renderable{
	constructor(name, vertCnt = 1, idxCnt = 1, matName = "VecWColor"){
		super(name, null, matName);
		this.vao			= Vao.standardEmpty(name, 3, vertCnt, null, null, idxCnt);
		this.vertBuffer 	= DynamicBuffer.newFloat(this.vao.bVertices.id, 3, vertCnt);
		this.indexBuffer	= DynamicBuffer.newElement(this.vao.bIndex.id, idxCnt);
		this.drawMode 		= gl.ctx.TRIANGLE_STRIP;
	}


	updateBuffers(vData = null, iData = null){
		if(vData) this.vertBuffer.pushToGPU(vData);
		if(iData){
			this.indexBuffer.pushToGPU(iData);
			this.vao.elmCount = iData.length;
		}
		return this;
	}
}

export default DynamicChunk;