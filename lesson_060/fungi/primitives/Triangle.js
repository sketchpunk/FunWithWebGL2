import gl,{ VAO }	from "../gl.js";
import Renderable	from "../entities/Renderable.js";

function Triangle(matName){
	if(gl.res.vao["FungiTriangle"]) return new Renderable(gl.res.vao["FungiTriangle"], matName).setOptions(false,true);

	var aVert	= [ -0.5,-0.5,0, 0.5,-0.5,0, 0,0.5,0 ],
		vao 	= VAO.standardRenderable("FungiTriangle",3,aVert,null,null,null),
		entity	= new Renderable(vao,matName).setOptions(false,true);
	
	entity.name = "Triangle";
	return entity;
}

export default Triangle;