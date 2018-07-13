class Voxel{
	//This is Static so we can build build voxels without needing a render, need to wireframing
	static buildMesh(vc, vcGet, vAry, iAry, uAry){
		let x, y, z, node;
		/* Single Loop on the whole floor, calc x,z from index, access cell directly */
		for(var i=0; i < vc.xyzLen; i++){
			if(vc.cells[i] != 0){
				//Convert Index to Voxel Coord
				x = i % vc.xLen;						
				z = Math.floor(i / vc.xLen) % vc.zLen;
				y = Math.floor(i / vc.xzLen);

				//Check all 6 Neighboring cells to see if they're being drawn
				for(var f=0; f < 6; f++){
					//node = vc.get(x, y, z, f);
					node = vcGet(vc, x, y, z, f);
					if(!node) Voxel.appendQuad(vc, f, x, y, z, vAry, iAry, uAry); //Not Null and Not 0
				}
			}
		}
	}


	//Take quad template and append it to the Vertex and Index Arrays
	static appendQuad(vc, fIdx, x, y, z, vAry, iAry, uAry){
		var i,ii,
			xx=0, yy=0, zz=0, 					//Translate Vertices if needed
			idx = vAry.length / Voxel.COMPLEN,	//Get vertex count, use that as a starting index value
			v 	= Voxel.FACES[fIdx].v;

		//.............................................
		//Should this face be moved from its original local position.
		if(Voxel.FACES[fIdx].nOffset){
			xx = Voxel.FACES[fIdx].n[0] * vc.scale;
			yy = Voxel.FACES[fIdx].n[1] * vc.scale;
			zz = Voxel.FACES[fIdx].n[2] * vc.scale;
		}

		//.............................................
		//Generate Vertices
		for(i=0; i < 4; i++){ //4 Verts per Quad
			ii = i * Voxel.COMPLEN;

			vAry.push(
				v[ii+0] * vc.scale + x * vc.scale + xx,
				v[ii+1] * vc.scale + y * vc.scale + yy,
				v[ii+2] * vc.scale + z * vc.scale + zz,
				v[ii+3] //Stores Face Index
			);

		}

		//.............................................
		//Generate Triangle Indexes
		for(i=0; i < Voxel.INDEX.length; i++) iAry.push( Voxel.INDEX[i] + idx );

		//.............................................
		//Add UV Values
		for(i=0; i < Voxel.UV.length; i++) uAry.push( Voxel.UV[i] );
	}
}

Voxel.COMPLEN = 4; //4th comp stores face

//..............................
//Direction of Quads to build a Voxel
Voxel.NORTH	= 0; //BACK
Voxel.EAST	= 1; //RIGHT
Voxel.SOUTH	= 2; //FORWARD
Voxel.WEST	= 3; //LEFT
Voxel.UP	= 4; //TOP
Voxel.DOWN	= 5; //BOTTOM

//..............................
//Information needed for each quad that is created.
Voxel.UV	= [0.0,0.0, 1.0,0.0, 1.0,1.0, 0.0,1.0];
Voxel.INDEX	= [0,1,2,2,3,0];
Voxel.FACES	= [
	{ 	n:[0.0,0.0,-1.0], nOffset:false,
		v:[1.0,0.0,0.0,0.0,
		   0.0,0.0,0.0,0.0,
		   0.0,1.0,0.0,0.0,
		   1.0,1.0,0.0,0.0] }, //Back

	{ 	n:[-1.0,0.0,0.0], nOffset:false,
		v:[0.0,0.0,0.0,1.0,
		   0.0,0.0,1.0,1.0,
		   0.0,1.0,1.0,1.0,
		   0.0,1.0,0.0,1.0] }, //Right

	{ 	n:[0.0,0.0,1.0], nOffset:true,
		v:[0.0,0.0,0.0,2.0,
		   1.0,0.0,0.0,2.0,
		   1.0,1.0,0.0,2.0,
		   0.0,1.0,0.0,2.0] }, //Front

	{ 	n:[1.0,0.0,0.0], nOffset:true,
		v:[0.0,0.0,1.0,3.0,
		   0.0,0.0,0.0,3.0,
		   0.0,1.0,0.0,3.0,
		   0.0,1.0,1.0,3.0] }, //Left

	{ 	n:[0.0,1.0,0.0], nOffset:true,
		v:[0.0,0.0,1.0,4.0,
		   1.0,0.0,1.0,4.0,
		   1.0,0.0,0.0,4.0,
		   0.0,0.0,0.0,4.0] }, //Top

	{ 	n:[0.0,-1.0,0.0], nOffset:false,
		v:[0.0,0.0,0.0,5.0,
		   1.0,0.0,0.0,5.0,
		   1.0,0.0,1.0,5.0,
		   0.0,0.0,1.0,5.0] } //Bottom
];

export default Voxel;