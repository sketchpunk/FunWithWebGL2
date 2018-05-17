import Vao 			from "../Vao.js";
import Renderable	from "../rendering/Renderable.js";

//Define quad with a Min Bound and Max Bound X,Y
function Quad(matName, name="Quad", bx0=-1, by0=-1, bz0=0, bx1=1, by1=1, bz1=0){
	var d = Quad.vertData(bx0, by0, bz0, bx1, by1, bz1);
	
	var vao 	= Vao.standardRenderable(name, 3, d.vertices, null, d.uv, d.index),
		entity	= new Renderable(name, vao, matName);
	
	entity.name = name;
	entity.options.cullFace = false;
	return entity;
}

Quad.vertData = function(bx0=-1, by0=-1, bz0=0, bx1=1, by1=1, bz1=0){
	return {
		vertices	:[ bx0,by0,bz0,   bx1,by0,bz1,   bx1,by1,bz0,   bx0,by1,bz0 ],
		uv			:[ 0.0,0.0,   1.0,0.0,   1.0,1.0,   0.0,1.0 ],
		index 		:[ 0,1,2, 2,3,0 ]
	};
}

export default Quad;