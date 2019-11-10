import App	from "../engine/App.js";
import Vao	from "../core/Vao.js";

const NAME = "GridFloor";

function GridFloor( name=NAME, matName="MatGridFloor" ){
	let e = App.$Draw( name );

	e.Draw.add( GridFloor.vao( NAME ), App.cache.getMaterial( matName ), 1 ); // GL.LINES
	e.Draw.priority = 100; 
	return e;
}

GridFloor.vao = function(){
	if( App.cache.hasVAO( NAME ) ) return App.cache.getVAO( NAME );

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
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

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	return Vao.buildStandard( NAME, 4, v );
}

export default GridFloor;