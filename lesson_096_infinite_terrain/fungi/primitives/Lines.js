import gl 				from "../gl.js";
import Vao 				from "../Vao.js";
import Renderable		from "../rendering/Renderable.js";
import DynamicBuffer	from "../data/DynamicBuffer.js";

class Lines extends Renderable{
	constructor(name, startSize, matName = "VecWColor"){
		super(name, null, matName);
		this.drawMode		= gl.ctx.LINES;
		this.vao			= Vao.standardEmpty(name, 4, startSize);
		this.vertBuffer 	= DynamicBuffer.newFloat(this.vao.bVertices.id, 4, startSize);	
		this._hasChanged	= false;
	}

	lineStrip(){ this.drawMode = gl.ctx.LINE_STRIP; return this; }

	addRaw(x0,y0,z0,x1,y1,z1,w0=0,w1){
		this.vertBuffer.data.push(
			x0, y0, z0, w0,
			x1, y1, z1, w1 || w0
		);
		this._hasChanged = true;
		return this;
	}

	addPoint(v0, w0=0){
		this.vertBuffer.data.push(v0[0], v0[1], v0[2], w0);
		this._hasChanged = true;
		return this;
	}

	addVec(v0,v1,w0=0,w1){
		this.vertBuffer.data.push(
			v0[0], v0[1], v0[2], w0,
			v1[0], v1[1], v1[2], w1 || w0
		);
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

export default Lines;