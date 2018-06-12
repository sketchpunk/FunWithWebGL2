import gl 			from "../gl.js";
import Vao 			from "../Vao.js";
import Geometry		from "../data/Geometry.js";
import Renderable	from "../rendering/Renderable.js";

function Wedge(mat, w=1, h=1, d=1, depthCenter=false){
	var data	= Wedge.vertData(w, h, d, depthCenter),
		vao		= Vao.standardRenderable("Wedge", 3, data.vertices, null, null, data.index),
		model 	= new Renderable("Wedge", vao, mat);
	//model.drawMode	= gl.ctx.TRIANGLES;
	return model;
}

Wedge.vertData = function(w=1, h=1, d=1, depthCenter=false, rtnGeo=false){
	var geo		= new Geometry(),
		pListA	= [ 0 , 1 , 2 ],
		pListB	= null,
		z		= 0;

	if(depthCenter) z = d * -0.5;

	geo.addVert(0,0,z);
	geo.addVert(w,0,z);
	geo.addVert(0,h,z);

	pListB = geo.extrude( pListA, [0,0,d] );
	geo.triangleWallLoop( pListA, pListB );
	geo.addFace(2, 1, 0); //Back Face
	geo.addFace(3, 4, 5); //Front Face

	if(rtnGeo) return geo;

	return { vertices:geo.vertexArray(), index:geo.faceArray() };
}

export default Wedge;