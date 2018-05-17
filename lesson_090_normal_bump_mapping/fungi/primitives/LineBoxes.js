import gl 				from "../gl.js";
import Vao 				from "../Vao.js";
import Renderable		from "../rendering/Renderable.js";
import DynamicBuffer	from "../data/DynamicBuffer.js";

class LineBoxes extends Renderable{
	constructor(name, startSize, matName = "VecWColor"){
		super(name, null, matName);
		this.drawMode		= gl.ctx.LINES;
		this.vao			= Vao.standardEmpty(name, 4, startSize);
		this.vertBuffer 	= DynamicBuffer.newFloat(this.vao.bVertices.id, 4, startSize);	
		this._hasChanged	= false;
	}

	addVec(v1, v2, c=0){ return this.addRaw(v1[0],v1[1],v1[2], v2[0],v2[1],v2[2], c); }
	addRaw(x1,y1,z1, x2,y2,z2, c=0){//Min -> Max to creating a bounding box.		
		//TopLeft,TopRight,BotRight,BotLeft
		var b = [	[x1,y1,z1], [x2,y1,z1],
					[x2,y1,z2], [x1,y1,z2] ],
			t = [	[x1,y2,z1], [x2,y2,z1],
					[x2,y2,z2], [x1,y2,z2] ],
			ii;

		for(var i=0; i < 4; i++){
			ii = (i+1) % 4;
			this.vertBuffer.data.push(
				b[i][0],	b[i][1],	b[i][2],	c,	//Draw Bottom
				b[ii][0],	b[ii][1],	b[ii][2],	c,
				t[i][0],	t[i][1],	t[i][2],	c,	//Draw Top
				t[ii][0],	t[ii][1],	t[ii][2],	c,
				b[i][0],	b[i][1],	b[i][2],	c,	//Draw Sides
				t[i][0],	t[i][1],	t[i][2],	c
			);
		}

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

export default LineBoxes;