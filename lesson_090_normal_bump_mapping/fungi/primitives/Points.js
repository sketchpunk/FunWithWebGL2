import gl 				from "../gl.js";
import Vao 				from "../Vao.js";
import Renderable		from "../rendering/Renderable.js";
import DynamicBuffer	from "../data/DynamicBuffer.js";

class Points extends Renderable{
	constructor(name, startSize = 1, matName = "VecWColor"){
		super(name, null, matName);
		this.drawMode		= gl.ctx.POINTS;
		this.vao			= Vao.standardEmpty(name, 4, startSize);
		this.vertBuffer 	= DynamicBuffer.newFloat(this.vao.bVertices.id, 4, startSize);	
		this._hasChanged	= false;
	}

	addRaw(x, y, z, w=0){
		this.vertBuffer.data.push(x, y, z, w);
		this._hasChanged = true;
		return this;
	}

	addVec(v, w=0){
		this.vertBuffer.data.push(v[0], v[1], v[2], w);
		this._hasChanged = true;
		return this;
	}

	reset(){
		this.vertBuffer.data.splice(0);
		this.vao.elmCount	= 0;
		this._hasChanged 	= true;
		return this;
	}

	update(){
		if(this._hasChanged){
			this.vertBuffer.pushToGPU();
			this.vao.elmCount	= this.vertBuffer.getComponentCnt();
			this._hasChanged	= false;
		}
		return this;
	}
}

export default Points;