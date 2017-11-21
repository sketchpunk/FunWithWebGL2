import Renderable	from "./Renderable.js";
import { Vec3 }		from "../Maths.js";
import gl, {VAO, ATTR_POSITION_LOC} from "../gl.js";

class BoundingCapsule extends Renderable{
	constructor(matName){
		super(null,matName);
		this.drawMode = gl.ctx.LINE_STRIP; //POINTS LINE_STRIP		
		this.vao = this.gen();

		this.radius		= 0.5;
		this.radiusSqr 	= this.radius * this.radius;
		this.vecStart	= new Vec3(0,0.5,0);
		this.vecEnd		= new Vec3(0,-0.5,0);

		/*Precalc values for reuse
			RadiusSqr = raduis * radius;
			VecLen = vecEnd - vecStart;
			vecNorm = Normalize(veclen);
		*/
	}

	gen(){
		if(gl.res.vao["FungiBoundCapsule"]) return gl.res.vao["FungiBoundCapsule"];
		/*.......................................
		Rotate By Y
		ry = y;
		rx = z*sin + x*cos;
		rz = z*cos - x*sin; */
		var vSize = 9,					//How many points from bottom to top.
			hSize = 3,					//How many times to rotate the circle
			vHalf = (vSize-1) * 0.5,	//Halfway point to extend the sphere to make a capsule
			vInc = Math.PI / (vSize-1),	//Increment bottom to top
			hInc = Math.PI / (hSize),	//Increment rotation for each circle created
			half = Math.PI * 0.5,		//Half of PI, will be origin when creating the circle
			x,
			y,
			r,		//rads for circle rotation
			i,		//loop var for circle making
			rad,	//rads for making the cicle
			sin,	//sin of the angle to rotate circle
			cos,	//cos of the angle to rotate circle
			v = [];

		//.......................................
		//Draw half of a 2D capsule by creating half a circle that extends the center
		for(i=0; i < vSize; i++){
			rad = vInc * i - half;
			x = 0.5 * Math.cos(rad);
			y = 0.5 * Math.sin(rad);

			if(i < vHalf) y -= 0.5;
			else if(i > vHalf) y += 0.5;
			else if(i == vHalf){ v.push(x,y-0.5,0,  x,y+0.5,0); continue; }

			v.push(x,y,0); //Since Z is 0, exclude it from Y rotation equation.
		}

		//.......................................
		//Repeat the capsule half in reverse to build one complete 2D capsule.
		for(i=v.length-6; i > 0; i-=3) v.push(-v[i],v[i+1],v[i+2]);
		
		//.......................................
		//Repeat the 2D Capsule a few times to make it 3D-ish
		var vLen = v.length;
		for(var j=1; j < hSize; j++){
			rad = hInc * j;
			cos = Math.cos(rad);
			sin = Math.sin(rad);
			for(i=0; i < vLen; i+=3) v.push(v[i]*cos,v[i+1],-v[i]*sin);
		}

		//.......................................
		//Final Point to finish up capsule
		v.push(v[0],v[1],v[2]);

		return VAO.standardRenderable("FungiBoundCapsule",3,v,null,null,null);
	}
}

export default BoundingCapsule;