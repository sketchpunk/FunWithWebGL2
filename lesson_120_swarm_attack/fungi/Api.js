import Fungi	from "./Fungi.js";
import { Vec3 }	from "./Maths.js";


//Direction can be pulled from a Transform Matrix as long as you know the columns
//Left : 0, 1, 2	Up : 4, 5, 6	Forward : 8, 9, 10
function matrixDirection(mat, xi, yi, zi, d=1, out=null){
	out = out || new Vec3();

	let x = mat[xi], 
		y = mat[yi], 
		z = mat[zi],
		m = 1 / Math.sqrt( x*x + y*y + z*z );

	out[0] = x * m * d;
	out[1] = y * m * d;
	out[2] = z * m * d;
	return out;
}


class Api{
	////////////////////////////////////////////////////////////////////////////////
	// TRANSFORM
	////////////////////////////////////////////////////////////////////////////////

	//Direction based on Tranform.localMatrix
	static getLocalLeft(e, v=null, d=1){	return matrixDirection(e.com.Transform.modelMatrix, 0, 1, 2, d, v); }
	static getLocalUp(e, v=null, d=1){		return matrixDirection(e.com.Transform.modelMatrix, 4, 5, 6, d, v); }
	static getLocalForward(e, v=null, d=1){	return matrixDirection(e.com.Transform.modelMatrix, 8, 9, 10, d, v); }


	////////////////////////////////////////////////////////////////////////////////
	// ENTITIES
	////////////////////////////////////////////////////////////////////////////////
	static newDraw(name, mat = null, vao = null, drawMode=null, cullFace=null){
		let out = Fungi.ecs.newAssemblage("Draw", name);

		out.com.Drawable.vao = vao;

		if(drawMode != null) out.com.Drawable.drawMode = drawMode;
		if(cullFace != null) out.com.Drawable.options.cullFace = cullFace;
		if(mat) out.com.Drawable.material = Fungi.getMaterial(mat);

		return out;
	}

	static cloneDraw(name, e){
		let out = Fungi.ecs.newAssemblage("Draw", name);
		out.com.Drawable.vao 				= e.com.Drawable.vao;
		out.com.Drawable.drawMode 			= e.com.Drawable.drawMode;
		out.com.Drawable.options.cullFace 	= e.com.Drawable.cullFace;
		out.com.Drawable.material 			= e.com.Drawable.material;
		return out;
	}
}


export default Api;