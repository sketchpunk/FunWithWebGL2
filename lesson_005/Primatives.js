var Primatives = {};
Primatives.GridAxis = class {
	static createMesh(gl){
		//Dynamiclly create a grid
		var verts = [],
			size = 1.8,			// W/H of the outer box of the grid, from origin we can only go 1 unit in each direction, so from left to right is 2 units max
			div = 10.0,			// How to divide up the grid
			step = size / div,	// Steps between each line, just a number we increment by for each line in the grid.
			half = size / 2;	// From origin the starting position is half the size.

		var p;	//Temp variable for position value.
		for(var i=0; i <= div; i++){
			//Vertical line
			p = -half + (i * step);
			verts.push(p);		//x1
			verts.push(half);	//y1
			verts.push(0);		//z1
			verts.push(0);		//c2

			verts.push(p);		//x2
			verts.push(-half);	//y2
			verts.push(0);		//z2
			verts.push(1);		//c2

			//Horizontal line
			p = half - (i * step);
			verts.push(-half);	//x1
			verts.push(p);		//y1
			verts.push(0);		//z1
			verts.push(0);		//c1

			verts.push(half);	//x2
			verts.push(p);		//y2
			verts.push(0);		//z2
			verts.push(1);		//c2
		}

		//TODO : Remove the following, its only to demo extra lines can be thrown in.
		verts.push(-half);	//x1
		verts.push(-half);	//y1
		verts.push(0);		//z1
		verts.push(2);		//c2

		verts.push(half);	//x2
		verts.push(half);	//y2
		verts.push(0);		//z2
		verts.push(2);		//c2

		verts.push(-half);	//x1
		verts.push(half);	//y1
		verts.push(0);		//z1
		verts.push(3);		//c2

		verts.push(half);	//x2
		verts.push(-half);	//y2
		verts.push(0);		//z2
		verts.push(3);		//c2


		//Setup
		var attrColorLoc = 4,
			strideLen,
			mesh = { drawMode:gl.LINES, vao:gl.createVertexArray() };

		//Do some math
		mesh.vertexComponentLen = 4;
		mesh.vertexCount = verts.length / mesh.vertexComponentLen;
		strideLen = Float32Array.BYTES_PER_ELEMENT * mesh.vertexComponentLen; //Stride Length is the Vertex Size for the buffer in Bytes

		//Setup our Buffer
		mesh.bufVertices = gl.createBuffer();
		gl.bindVertexArray(mesh.vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.bufVertices);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(ATTR_POSITION_LOC);
		gl.enableVertexAttribArray(attrColorLoc);
		
		gl.vertexAttribPointer(
			ATTR_POSITION_LOC						//Attribute Location
			,3										//How big is the vector by number count
			,gl.FLOAT 								//What type of number we passing in
			,false									//Does it need to be normalized?
			,strideLen								//How big is a vertex chunk of data.
			,0										//Offset by how much
		);

		gl.vertexAttribPointer(
			attrColorLoc							//new shader has "in float a_color" as the second attrib
			,1										//This atttrib is just a single float
			,gl.FLOAT
			,false
			,strideLen								//Each vertex chunk is 4 floats long
			,Float32Array.BYTES_PER_ELEMENT * 3		//skip first 3 floats in our vertex chunk, its like str.substr(3,1) in theory.
		);

		//Cleanup and Finalize
		gl.bindVertexArray(null);
		gl.bindBuffer(gl.ARRAY_BUFFER,null);
		gl.mMeshCache["grid"] = mesh;
		return mesh;
	}
}