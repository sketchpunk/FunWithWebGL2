import Geometry 	from "../../fungi/data/Geometry.js";
import Vao			from "../../fungi/Vao.js";
import Renderable	from "../../fungi/rendering/Renderable.js";

//http://codeflow.org/entries/2011/nov/10/webgl-gpu-landscaping-and-erosion/#terrain
//http://graphics.cs.brown.edu/games/IsoHeightfield/mcguiresibley04iso.pdf

class Terrain{
	// Create a Renderable from a Terrain Geometry Data
	static geoRenderable(geo, name, mat){
		let vAry	= geo.vertexArray(),
			iAry	= geo.faceArray(),
			uvAry	= geo.uvArray(),
			vao		= Vao.standardRenderable(name, 3, vAry, null, uvAry, iAry);
		return new Renderable(name, vao, mat);
	}


	//Apply noise height to the terrain geo object
	//https://cmaher.github.io/posts/working-with-simplex-noise/
	static addNoiseHeight(geo, aptitude, freq, offsetX, offsetY, n2D){
		let v;
		for(v of geo.verts) v[1] = aptitude * n2D(v.uv[0] * freq + offsetX, v.uv[1] * freq + offsetY);
	}

	
	//Create a flat plane terrain geo object. Height is added letter.
	static createFlatGeo(size, div){
		let geo			= new Geometry(),
			colALen		= div+1,						// How many verts in the even rows
			colBLen		= div+2,						// How many verts in the odd rows
			evenRows	= Math.ceil( colALen / 2 ),		// How many even rows
			oddRows		= evenRows - ( colALen % 2 ),	// How many odd rows
			halfCol		= 1 / div * size * 0.5,		
			totalCols	= colALen + colBLen,
			totalVerts	= colALen * evenRows + colBLen * oddRows,

			vRows = [ new Array(colALen).fill(0), new Array(colBLen).fill(0) ],	// Row Verts
			uRows = [ new Array(colALen).fill(0), new Array(colBLen).fill(0) ],	// Row UVs
			
			i, c, r, x, v, ii;

		//....................................
		// Figure out the initial data
		for(i=1; i < colALen; i++){
			vRows[0][i] = size * (uRows[0][i] = i / div);	//Row A	- Vert and UV	
			vRows[1][i] = vRows[0][i] - halfCol;			//Row B - Vert
			uRows[1][i] = vRows[1][i] / size;				//Row B - UV
		}
		vRows[1][colALen]	= size;	// last column of row B
		uRows[1][colALen]	= 1;	// last column of uv for row b


		//....................................
		// Create Verts and UV Values
		for(i=0; i < totalVerts; i++){
			c = i % totalCols;									// Column
			r = Math.floor(i / totalCols) * 2;					// Row
			x = 0;												// Even/Odd Row Index
			if(c >= colALen){ r += 1; c -= colALen; x = 1; }	// Change values for odd rows

			v = geo.addVert(vRows[x][c], 0, vRows[0][r]);		// Create Vertex
			v.uv.set(uRows[x][c], 1- uRows[0][r]);				// Add UV to Vertex
		}

		//....................................
		// Create Index
		/*
		0, 1, 2
		3,4,5,6
		7, 8, 9
		Even Row 0,3,4 - 0,4,1 - 1,4,5 - 1,5,2 - 2,5,6 
		Odd Row 4,3,7 - 7,8,4 - 5,4,8 - 8,9,5 - 6,5,9 
		*/
		var startA = 0, startB = 0, endA = 0, endB = 0;
		for(r=0; r < div; r++){
			i		= r % 2;							// Current Row Index
			ii		= (r+1) % 2;						// Next Row Index
			startB	= startA + vRows[i].length;			// Start index for the second row
			endA	= startB - 1;						// End Index for the First row
			endB	= startB + vRows[ii].length - 1;	// End index for the second row

			for(c=0; c <= div; c++){
				//EVEN ROWS
				if(i == 0){
					geo.addFace(c + startA, c + startB, c + startB+1);
					if( c + startA+1 <= endA) geo.addFace( c + startA, c + startB+1, c + startA+1 );
				
				//ODD ROWS
				}else{  
					geo.addFace( c + startA+1, c + startA, c + startB );
					if( c + startB + 1 <= endB) geo.addFace( c + startB, c + startB + 1, c + startA + 1);
				}
			}
			startA += vRows[i].length; //Shift to the next starting index
		}
		
		return geo;
	}
}

export default Terrain;
