import gl,{ VAO }	from "../gl.js";
import Renderable	from "../entities/Renderable.js";

function GridFloor(){
	var GridSize	= 0.2,				//Distance between lines
		len			= 70,				//How many lines to generate
		t			= len * GridSize,	//Total Size of grid
		p			= 0,				//Position
		v			= [ ];				//Vertex Array

	for(var i=1; i <= len; i++){		//build grid
		p = i * GridSize;
		v.push(	p,0,t,0, p,0,-t,0,
				-p,0,t,0, -p,0,-t,0,
				-t,0,p,0, t,0,p,0,
				-t,0,-p,0, t,0,-p,0
		);
	}
	v.push(-t,0.007,0,1, t,0.007,0,1, 0,0.007,t,2, 0,0.007,-t,2); //origin x,z lines

	var vao 	= VAO.standardRenderable("GridFloor",4,v), //VAO.standardMesh("GridFloor",4,v,null,null,null,false),
		model 	= new Renderable(vao,"MatGridFloor");
	model.name = "GridFloor";
	model.drawMode = gl.ctx.LINES;
	return model;
}

export default GridFloor;