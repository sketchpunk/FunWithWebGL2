class Terrain{
	static createModel(gl,keepRawData){ return new Modal(Terrain.createMesh(gl,10,10,20,20,keepRawData)); }
	static createMesh(gl,w,h,rLen,cLen,keepRawData){
		var rStart = w / -2,		//Starting position for rows when calculating Z position
			cStart = h / -2,		//Starting position of column when calcuating X position
			vLen = rLen * cLen,		//Total Vertices needed to create plane
			iLen = (rLen-1)*cLen,	//Total Index values needed to create the Triangle Strip (Not counting Degenerating Triangle positions)
			cInc = w / (cLen-1),	//Increment value for columns when calcuting X position
			rInc = h / (rLen-1),	//Increment value for rows when calcuating Z position
			cRow = 0,				//Current Row
			cCol = 0,				//Current Column
			aVert = [],				//Vertice Array
			aIndex = [],			//Index Array
			aUV = [],				//UV Map Array
			uvxInc = 1 / (cLen-1),	//Increment value for columns when calcuting X UV position of UV
			uvyInc = 1 / (rLen-1);	//Increment value for rows when calcuating Z UV position

		//Perlin Noise
		noise.seed(1);
		var h = 0,					//temporary height
			freq = 13,				//Frequency on how to step through perlin noise
			maxHeight = -3;			//Max Height

		//..................................
		//Generate the vertices and the index array.
		for(var i=0; i < vLen; i++){
			cRow = Math.floor(i / cLen);	//Current Row
			cCol = i % cLen;				//Current Column
			h = noise.perlin2((cRow+1)/freq, (cCol+1)/freq) * maxHeight;

			//Create Vertices,x,y,z
			aVert.push(cStart+cCol*cInc, 0.2 + h, rStart+cRow*rInc);

			//Create UV s,t. Spread the 0,0 to 1,1 throughout the whole plane
			aUV.push( (cCol == cLen-1)? 1 : cCol * uvxInc,
				(cRow == rLen-1)? 1 : cRow * uvyInc );

			//Create the index, We stop creating the index before the loop ends creating the vertices.
			if(i < iLen){
				//Column index of row R and R+1
				aIndex.push(cRow * cLen + cCol, (cRow+1) * cLen + cCol);

				//Create Degenerate Triangle, Last AND first index of the R+1 (next row that becomes the top row )
				if(cCol == cLen-1 && i < iLen-1) aIndex.push( (cRow+1) * cLen + cCol, (cRow+1) * cLen);
			}
		}

		//..................................
		//Generate the Normals using finite difference method
		var x,					//X Position in grid
			y,					//Y Position in grid
			p,					//Temp Array Index when calcating neighboring vertices
			pos,				//Using X,Y, determine current vertex index position in array
			xMax = cLen-1,		//Max X Position in Grid
			yMax = rLen -1,		//Max Y Position in Grid
			nX = 0,				//Normal X value
			nY = 0,				//Normal Y value
			nZ = 0,				//Normal Z value
			nL = 0,				//Normal Vector Length
			hL,					//Left Vector height
			hR,					//Right Vector Height
			hD,					//Down Vector height
			hU,					//Up Vector Height
			aNorm = [];			//Normal Vector Array

		for(var i=0; i < vLen; i++){
			y = Math.floor(i / cLen);	//Current Row
			x = i % cLen;				//Current Column
			pos = y*3*cLen + x*3;		//X,Y position to Array index conversion

			//-----------------
			//Get the height value of 4 neighboring vectors: Left,Right,Top Left
			
			if(x > 0){ //LEFT
				p = y*3*cLen + (x-1)*3;	//Calc Neighbor Vector
				hL = aVert[p+1];		//Grab only the Y position which is the height.
			}else hL = aVert[pos+1];	//Out of bounds, use current 

			if(x < xMax){ //RIGHT
				p = y*3*cLen + (x+1)*3;
				hR = aVert[p+1];
			}else hR = aVert[pos+1];	

			if(y > 0){ //UP
				p = (y-1)*3*cLen + x*3;
				hU = aVert[p+1];
			}else hU = aVert[pos+1];

			if(y < yMax){ //DOWN
				p = (y+1)*3*cLen + x*3;
				hD = aVert[p+1];
			}else hD = aVert[pos+1];

			//-----------------
			//Calculate the final normal vector
			nX = hL - hR;
			nY = 2.0;
			nZ = hD - hU;
			nL = Math.sqrt( nX*nX + nY*nY + nZ*nZ);	//Length of vector						
			aNorm.push(nX/nL,nY/nL,nZ/nL);			//Normalize the final normal vector data before saving to array.
		}

		//..................................
		var mesh = gl.fCreateMeshVAO("Terrain",aIndex,aVert,aNorm,aUV,3);
		mesh.drawMode = gl.TRIANGLE_STRIP;

		if(keepRawData){ //Have the option to save the data to use for normal debugging or modifying.
			mesh.aVert = aVert;
			mesh.aNorm = aNorm;
			mesh.aIndex = aIndex;
		}

		return mesh;
	}
}