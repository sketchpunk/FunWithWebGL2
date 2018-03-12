import gl,{ VAO }	from "../gl.js";
import Renderable	from "../entities/Renderable.js";

function Quad1U(matName){
	if(gl.res.vao["FungiQuad1U"]) return new Renderable(gl.res.vao["FungiQuad1U"], matName).setOptions(false,true);

	var aVert = [ -0.5,0.5,0, -0.5,-0.5,0, 0.5,-0.5,0, 0.5,0.5,0 ],
		aUV = [ 0,0, 0,1, 1,1, 1,0 ],
		aIndex = [ 0,1,2, 2,3,0 ];
	
	var vao 	= VAO.standardRenderable("FungiQuad1U",3,aVert,null,aUV,aIndex),
		entity	= new Renderable(vao,matName).setOptions(false,true);
	
	entity.name = "Quad1U";
	return entity;
}

export default Quad1U;