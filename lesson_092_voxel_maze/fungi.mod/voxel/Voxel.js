class Voxel{
	//This is Static so we can build build voxels without needing a render, need to wireframing
	static buildMesh(vc, vAry, iAry){
		var x,y,z,node;
		/* Single Loop on the whole floor, calc x,z from index, access cell directly */
		for(var i=0; i < vc.xyzLen; i++){
			if(vc.cells[i] == 1){
				x = i % vc.xLen;						//Convert Index to Voxel Coord
				z = Math.floor(i / vc.xLen) % vc.zLen;
				y = Math.floor(i / vc.xzLen);

				//Check all 6 Neighboring cells to see if they're being drawn
				for(var f=0; f < 6; f++){
					var node = vc.get(x,y,z,f);

					if(node != 1) Voxel.appendQuad(vc,f,x,y,z,vAry,iAry);
				}
			}
		}
	}


	//Take quad template and append it to the Vertex and Index Arrays
	static appendQuad(vc,fIdx,x,y,z,vAry,iAry){
		var i,ii,
			xx=0, yy=0, zz=0, 						//Translate Vertices if needed
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
				v[ii+3] //Just color Index, TODO get rid of down the line
			);
		}

		//.............................................
		//Generate Triangle Indexes
		for(i=0; i < Voxel.INDEX.length; i++) iAry.push( Voxel.INDEX[i] + idx );
	}
}

Voxel.COMPLEN = 4; //Remove when no longer need 4th comp

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
Voxel.FACES	= [ //TODO, REMOVE 4th component when no longer in need.
	{ 	n:[0.0,0.0,-1.0], nOffset:false,
		v:[1.0,0.0,0.0,0.0,
		   0.0,0.0,0.0,1.0,
		   0.0,1.0,0.0,2.0,
		   1.0,1.0,0.0,3.0] }, //Back

	{ 	n:[-1.0,0.0,0.0], nOffset:false,
		v:[0.0,0.0,0.0,0.0,
		   0.0,0.0,1.0,1.0,
		   0.0,1.0,1.0,2.0,
		   0.0,1.0,0.0,3.0] }, //Right

	{ 	n:[0.0,0.0,1.0], nOffset:true,
		v:[0.0,0.0,0.0,0.0,
		   1.0,0.0,0.0,1.0,
		   1.0,1.0,0.0,2.0,
		   0.0,1.0,0.0,3.0] }, //Front

	{ 	n:[1.0,0.0,0.0], nOffset:true,
		v:[0.0,0.0,1.0,0.0,
		   0.0,0.0,0.0,1.0,
		   0.0,1.0,0.0,2.0,
		   0.0,1.0,1.0,3.0] }, //Left

	{ 	n:[0.0,1.0,0.0], nOffset:true,
		v:[0.0,0.0,1.0,0.0,
		   1.0,0.0,1.0,1.0,
		   1.0,0.0,0.0,2.0,
		   0.0,0.0,0.0,3.0] }, //Top

	{ 	n:[0.0,-1.0,0.0], nOffset:false,
		v:[0.0,0.0,0.0,0.0,
		   1.0,0.0,0.0,1.0,
		   1.0,0.0,1.0,2.0,
		   0.0,0.0,1.0,3.0] } //Bottom
];

export default Voxel;