import Geometry 	from "../../fungi/data/Geometry.js";
//import Vao			from "../../fungi/Vao.js";
//import Renderable	from "../../fungi/rendering/Renderable.js";

class Terrain{

	static createGrid(size, divide){
		var geo	= new Geometry(),
			inc = new Array(divide+1),
			x,y;

		//Calc the over all increment
		for(x=0; x <= divide; x++) inc[x] = x / divide * size;

		//Generate Grid
		for(y=0; y <= divide; y++)
			for(x=0; x <= divide; x++) 
				geo.addVert( inc[x], 0, inc[y] );

		return geo;
	}

}

export default Terrain;
