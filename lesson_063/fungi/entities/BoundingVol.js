import Renderable	from "./Renderable.js";
import gl, { VAO, ATTR_POSITION_LOC } from "../gl.js";
import { Vec3 }	from "../Maths.js";

class BoundingBox extends Renderable{
	constructor(box,matName){
		super(null,matName);
		this.bounds = [ new Vec3(box.worldBounds[0]), new Vec3(box.worldBounds[1]) ];
		this.drawMode = gl.ctx.LINES;
		this.vao = this.genBox();
	}

	genBox(){
		//build 8 points of the cube, Create the floor, then its the same thing but with Y Max instead of YMin.
		var aryVert	= [],
			aryIdx	= [],
			c		= 4,
			b = [	this.bounds[0][0], this.bounds[0][1], this.bounds[0][2],
					this.bounds[1][0], this.bounds[1][1], this.bounds[1][2] ];

		for(var i=1; i < 5; i+=3){ 
			aryVert.push(	b[0], b[i], b[2], c,	//Floor Top Left Corner
							b[3], b[i], b[2], c,	//Floor Top Right
							b[3], b[i], b[5], c,	//Floor Bottom Right
							b[0], b[i], b[5], c);	//Floor Bottom left
		}

		//Build up the indexes to connect the dots.
		var ii,iu;
		for(var i=0; i < 4; i++){
			ii = (i+1)%4;
			iu = i+4;
			aryIdx.push(i,ii, iu,ii+4, i,iu); //Draw bottom, Top, Then Side
		}

		return VAO.standardRenderable("FungiBoundBox",4,aryVert,null,null,aryIdx);
	}
}

export { BoundingBox };