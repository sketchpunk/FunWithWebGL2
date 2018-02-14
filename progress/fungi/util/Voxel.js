import gl, { VAO }		from "../gl.js";
import DynamicBuffer	from "./DynamicBuffer.js";
import Renderable		from "../entities/Renderable.js";

//------------------------------------------------------
//Voxel Data
//------------------------------------------------------
class VoxelChunk{
	constructor(x=2,y=2,z=2){
		this.scale = 0.2;

		//Overall size of the Chunk
		this.xLen	= x;
		this.yLen	= y;
		this.zLen	= z;

		//Cache max coord values to save repeating the math
		this.xMax	= (x != 0)? x-1 : 0;
		this.yMax	= (y != 0)? y-1 : 0;
		this.zMax	= (z != 0)? z-1 : 0;

		this.xzLen 	= x * z;	//Cache value, since this is used to help calc index
		this.xyzLen = x * y * z;

		this.cells	= new Array(this.xyzLen); //Create flat array to hold Voxel Data.

		for(var i=0; i < this.cells.length; i++) this.cells[i] = 1;
	}

	coordToIndex(x,y,z){ return x + z * this.xLen + y * this.xzLen; }
	indexToCoord(i,out){
		return [
			i % this.xLen,							//x
			Math.floor(i / this.xzLen),				//y
			Math.floor(i / this.xLen) % this.zLen	//z
		];
	}


	set(x,y,z, v){ this.cells[ this.coordToIndex(x,y,z) ] = v; }
	
	setColHeight(x,y,z){
		var idx = this.coordToIndex(x,0,z);

		//Find the starting position, then loop
		for(var i=0; i < this.yLen; i++){
			this.cells[ idx + i * this.xzLen ] = (i <= y && y != -1)? 1 : 0;
		}
	}

	setColHeightMirror(x,y,z){
		var idx = this.coordToIndex(x,0,z);
		var mid = this.yMax * 0.5;
		var dist;
			
		//Find the starting position, then loop
		for(var i=0; i < this.yLen; i++){
			dist = Math.floor(Math.abs(i-mid));
			//console.log(i,mid,i-mid, dist);
			this.cells[ idx + i * this.xzLen ] = (dist <= y && y != -1)? 1 : 0;
		}
	}

	get(x, y, z, dir = -1){
		//Apply Direction to get a cell next to the requested cell
		if(dir != -1){
			var n = Voxel.FACES[dir].n;
			x += n[0];
			y += n[1];
			z += n[2];
		}

		//Validate that coords are within the bounds of the chunk
		if( x < 0 || x > this.xMax ||
			y < 0 || y > this.yMax ||
			z < 0 || z > this.zMax ) return null;

		//Return the cell data
		return this.cells[ x + z * this.xLen + y * this.xzLen ];
	}

	getMaxBound(){ return [ this.xLen*this.scale, this.yLen*this.scale, this.zLen*this.scale ]; }
	getCellBound(x,y,z){
		if( x > this.xMax || y > this.yMax || z > this.zMax ) return null;

		var xpos = x * this.scale,
			ypos = y * this.scale,
			zpos = z * this.scale;

		return {
			min:[xpos, ypos, zpos],
			max:[xpos+this.scale, ypos+this.scale, zpos+this.scale]
		};
	}
}


//------------------------------------------------------
//Voxel Rendering
//------------------------------------------------------
class VoxelRender extends Renderable{
	constructor(vc,matName){
		super(null,matName);
		this.drawMode = gl.ctx.TRIANGLES;

		var vAry = [], iAry = [];
		Voxel.buildMesh(vc,vAry,iAry);

		this.vao = VAO.standardRenderable("voxel",Voxel.COMPLEN,vAry,null,null,iAry);//
	}
}

class DynamicVoxel extends Renderable{
	constructor(vc,matName){
		super(null,matName);
		this.drawMode = gl.ctx.TRIANGLES;
		this.chunk = vc;

		this.vao 			= VAO.standardEmpty("dynamicVoxel",4,1,0,0,1);
		this.bufVertices 	= DynamicBuffer.newFloat(this.vao.bVertices.ptr,Voxel.COMPLEN,1);
		this.bufIndex 		= DynamicBuffer.newElement(this.vao.bIndex.ptr,1);
	}

	chunkUpdate(){
		var vAry = [], iAry = [];
		Voxel.buildMesh(this.chunk,vAry,iAry);

		this.bufVertices.pushToGPU(vAry)
		this.bufIndex.pushToGPU(iAry);

		this.vao.count = this.bufIndex.getComponentCnt();

		return this;
	}
}


//------------------------------------------------------
//Support
//------------------------------------------------------

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

Voxel.NORTH	= 0; //BACK
Voxel.EAST	= 1; //RIGHT
Voxel.SOUTH	= 2; //FORWARD
Voxel.WEST	= 3; //LEFT
Voxel.UP	= 4; //TOP
Voxel.DOWN	= 5; //BOTTOM

Voxel.COMPLEN = 4; 

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

//------------------------------------------------------
//Export
//------------------------------------------------------
export { Voxel, VoxelChunk, VoxelRender, DynamicVoxel };