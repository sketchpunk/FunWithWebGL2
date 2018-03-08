import gl, { VAO }		from "../gl.js";
import DynamicBuffer	from "./DynamicBuffer.js";
import Renderable		from "../entities/Renderable.js";
import { Ray }			from "./Raycast.js";
import Vec3				from "../maths/Vec3.js";

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

		for(var i=0; i < this.cells.length; i++) this.cells[i] = 0;
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



//TODO: Need to test if Ray Origin is inside AABB, If it is, need to determine the initial voxel coord instead of doing a Ray-AABB Test
function VoxelRaycast(ray,chunk,aabb,tries=30){
	//..................................................
	//Determine if the voxel chunk has an intersection.
	var tBox = {};
	if(!Ray.inAABB(aabb,ray,tBox)){ return null; }

	//..................................................
	var inPos		= ray.getPos(tBox.min).nearZero(), //entry point for chunk, Clean up vals near zero.
		cellSize	= chunk.scale,

		//--------- Calc Voxel Coord Integer(x,y,z)
		ix			= Math.min( Math.floor(inPos.x / cellSize), chunk.xMax),
		iy			= Math.min( Math.floor(inPos.y / cellSize), chunk.yMax),
		iz			= Math.min( Math.floor(inPos.z / cellSize), chunk.zMax),

		//--------- Simplify direction with -1,0,1
		dir = new Vec3(-1,-1,-1),

		//--------- Index value to exit loop -1,MaxCell
		xOut = -1, yOut = -1, zOut = -1,

		//--------- Position of the closest boundary line for each axis at the ray dir. Depends on direction.
		xBound, yBound, zBound;

		//--------- Original code used 9 shorthand ifs, changed it to use 3 regular ifs for optimization.
		if(ray.dir.x >= 0){
			dir.x	= (ray.dir.x == 0)? 0 : 1;
			xBound	= (ix + 1) * cellSize;

			if(ray.dir.x > 0) xOut = chunk.xLen;
		}else xBound = ix * cellSize;


		if(ray.dir.y >= 0){
			dir.y	= (ray.dir.y == 0)? 0 : 1;
			yBound	= (iy + 1) * cellSize;

			if(ray.dir.y > 0) yOut = chunk.yLen;

		}else yBound = iy * cellSize;


		if(ray.dir.z >= 0){
			dir.z	= (ray.dir.z == 0)? 0 : 1;
			zBound	= (iz + 1) * cellSize;

			if(ray.dir.z > 0) zOut = chunk.zLen;

		}else zBound = iz * cellSize;


		//--------- Time for axis //(xBound - inPos.x) / ray.dir.x,
	var	xt			= (xBound - inPos.x) / ray.dir.x,
		yt 			= (yBound - inPos.y) / ray.dir.y,
		zt			= (zBound - inPos.z) / ray.dir.z,

		//--------- Delta T for each axis as we traverse one voxel at a time
		xDelta		= cellSize * dir.x / ray.dir.x,
		yDelta		= cellSize * dir.y / ray.dir.y,
		zDelta		= cellSize * dir.z / ray.dir.z,

		//--------- 
		nAxis 		= tBox.nAxis,			//Axis Vector Component 0:x, 1:y, 2:z
		iAxis 		= [ix, iy, iz][nAxis],	//Preselect the initial axis voxel coord.
		ii,									//Voxel Index of a specific axis
		isHit		= false;				//Using Check Data, did we hit a voxel that exists.

	//..................................................
	for(var i=0; i < tries; i++){
		//console.log("current voxel", ix,iy,iz);
		//Do something with this voxel
		if(chunk.get(ix,iy,iz) == 1){ isHit = true; break; }

		//-------------------------
		//Figure out the next voxel to move to based on which t axis value is the smallest first
		if(xt < yt && xt < zt){	//--------- X AXIS
			ii = ix + dir.x;
			if(ii == xOut) break;	// When out of bounds of the voxel chunk.
			
			nAxis	= 0;			// Numeric Axis Index (x,y,z // 0,1,2)
			iAxis	= ix;			// Save before modifing it.
			ix		= ii;			// Move to next voxel
			xt		+= xDelta;		// Move T so the next loop has a chance to move in a different axis

		}else if (yt < zt){		//--------- Y AXIS
			ii = iy + dir.y;				
			if(ii == yOut) break;
			
			nAxis 	= 1;
			iAxis 	= iy;
			iy 		= ii;
			yt 		+= yDelta;

		}else{					//--------- Z AXIS
			ii = iz + dir.z;
			if(ii == zOut) break;
			
			nAxis	= 2;
			iAxis	= iz;
			iz		= ii;
			zt		+= zDelta;
		}
	}

	var norm = [0,0,0];
	norm[nAxis] = -dir[nAxis];
	return { hitNorm: norm, voxelCoord: [ix,iy,iz], isHit:isHit };
	//..................................................
	console.log("FINAL",
		"::Axis",nAxis,
		"::Dir",-dir[nAxis],
		"::Voxel",ix,iy,iz,
	);

	//Sample on how to get the intersection point where the voxel was hit.
	var boundPos	= (( dir[nAxis] > 0)? iAxis+1 : iAxis) * cellSize,		// Position of boundary		
		tt			= ( boundPos - ray.origin[nAxis] ) / ray.vecLen[nAxis],	// Time when at axis boundary
		ip			= ray.getPos(tt);	// Intersection point on voxel face
	console.log(ip, tt, boundPos);
}


//------------------------------------------------------
//Export
//------------------------------------------------------
export { Voxel, VoxelChunk, VoxelRender, DynamicVoxel, VoxelRaycast };