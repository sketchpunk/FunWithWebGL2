import gl, { VAO }	from "../gl.js";
import Renderable	from "../entities/Renderable.js";

	/*
	function triangulateTriStrip(aVert,aIndex,out){
		//console.log(aIndex);
		var j,bi,qi,skip,
			ind = [0,0,0,0];
		for(var i=0; i < aIndex.length-2; i+=2){
			if(aIndex[i+1] == aIndex[i+2]) continue; //Skip degenerate triangles
			
			//console.log("xxxx",aIndex[i],aIndex[i+1],aIndex[i+2],aIndex[i+3]);

			//Tri-Strip has a upside down N like shape, swop 2 & 3 to make it a square shape
			ind[0] = aIndex[i];
			ind[1] = aIndex[i+1];
			ind[3] = aIndex[i+2];
			ind[2] = aIndex[i+3];
			skip = false;			//Reset skip var
			bi = 0;					//Reset barycentric index

			//loop quat pattern 0,1,2 - 2,3,0
			for(j=0; j <= 4; j++){		//Loop quad path
				if(j == 3 && !skip){	//Begin Second Triangle
					skip = true;
					bi = 0;
					j--;
				}

				qi = (j!=4)?j:0;		//What quad index are we on.
				p = ind[qi]*3;			//Get starting index of float vertice.

				//console.log(qi,p);
				//console.log(aVert[p],aVert[p+1],aVert[p+2]);
				out.push(aVert[p],aVert[p+1],aVert[p+2],bi);
				//var p = (i + j) * 3
				bi++;
			}
			//console.log(aIndex[i],aIndex[i+1],aIndex[i+3],aIndex[i+2]);
		}

	}
	*/

class WireFrame{
	static fromTriangles(vAry,iAry,compLen = 3){
		var ii, ary = [];

		for(var i=0; i < iAry.length; i++){
			ii = iAry[i] * compLen;
			ary.push(
				vAry[ii], 	//x
				vAry[ii+1],	//y
				vAry[ii+2], //z
				i % 3 );	//Barycentric
		}

		var vao		= VAO.standardRenderable("wire",4,ary,null,null,null),
			model	= new Renderable(vao,"MatWireFrame");

		model.drawMode		= gl.ctx.TRIANGLES;
		model.useCulling	= false;
		return model;
	}
}

export default WireFrame;