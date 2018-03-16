import Renderable	from "./Renderable.js";
import gl, {VAO, ATTR_POSITION_LOC} from "../gl.js";

class BoundingSphere extends Renderable{
	constructor(matName){
		super(null,matName);
		this.drawMode = gl.ctx.LINE_STRIP;		
		this.vao = this.gen();
		this.radius = 0.5;
		this.radiusSqr = this.radius * this.radius;
	}

	gen(){
		if(gl.res.vao["FungiBoundSphere"]) return gl.res.vao["FungiBoundSphere"];

		/*Rotate By Y
		ry = y;
		rx = z*sin + x*cos;
		rz = z*cos - x*sin;
		*/
		var vSize = 7,	//How many points from bottom to top.
			hSize = 3,	//How many times to rotate the circle
			vInc = Math.PI / (vSize-1),	//Increment bottom to top
			hInc = Math.PI / (hSize),	//Increment rotation for each circle created
			vLoopLen = vSize * 2 - 1,	//Loop size for creating a circle
			half = Math.PI * 0.5,		//Half of PI, will be origin when creating the circle
			x,
			y,
			r,		//rads for circle rotation
			i,		//loop var for circle making
			rad,	//rads for making the cicle
			sin,	//sin of the angle to rotate circle
			cos;	//cos of the angle to rotate circle

		var v = [];
		for(var j=0; j < hSize; j++){
			r = hInc * j - half;
			cos = Math.cos(r);
			sin = Math.sin(r);

			for(i=0; i < vLoopLen; i++){
				rad = vInc * i - half;
				x = 0.5 * Math.cos(rad);
				y = 0.5 * Math.sin(rad);
				v.push(x*cos,y,x*sin,4); //Since Z is 0, exclude it from Y rotation equation.
			}
		}

		return VAO.standardRenderable("FungiBoundSphere",4,v,null,null,null);
	}
}

export default BoundingSphere;