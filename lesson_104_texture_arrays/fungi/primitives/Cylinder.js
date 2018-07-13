import gl 			from "../gl.js";
import Vao 			from "../Vao.js";
import Geometry		from "../data/Geometry.js";
import Renderable	from "../rendering/Renderable.js";

function Cylinder(mat, sides=6, tRadius=0.5, bRadius=0.5, h=1, botBuild=true){
	var data	= Cylinder.vertData(sides, tRadius, bRadius, h, botBuild),
		vao		= Vao.standardRenderable("Cylinder", 3, data.vertices, null, null, data.index),
		model 	= new Renderable("Cylinder", vao, mat);
	//model.drawMode	= gl.ctx.TRIANGLES;
	return model;
}

Cylinder.vertData = function(sides=6, tRadius=0.5, bRadius=0.5, h=1, botBuild=true){
	var geo		= new Geometry(),
		PIH		= Math.PI * 0.5,
		inc		= Math.PI * 2 / sides,
		tYPos	= h,
		bYPos	= 0,
		bFace	= [], 
		tFace	= [],
		i, a, b, rad;

	if(!botBuild){
		tYPos = h * 0.5;
		bYPos = -tYPos;
	}

	//Bottom Face
	geo.addVert(0,bYPos,0);
	for(i=0; i < sides; i++){
		rad	= PIH + inc * i;
		a	= bRadius * Math.cos(rad);
		b	= bRadius * Math.sin(rad);
		geo.addVert(a, bYPos, b);
		bFace.push(i+1);
	}

	//Top Face
	var tcIdx = geo.verts.length;
	geo.addVert(0,tYPos,0);
	for(i=0; i < sides; i++){
		rad	= PIH + inc * i;
		a	= tRadius * Math.cos(rad);
		b	= tRadius * Math.sin(rad);
		geo.addVert(a, tYPos, b);
		tFace.push(tcIdx+i+1);
	}

	//Build Faces
	geo.triangleWallLoop( tFace, bFace );
	geo.triangleCircle( tcIdx, tFace );
	geo.triangleCircle( 0, bFace.reverse() );
	return { vertices:geo.vertexArray(), index:geo.faceArray() };
}

export default Cylinder;