import Vec3			from "../../fungi/maths/Vec3.js";
import Ray			from "../raycast/Ray.js";
import VoxelChunk	from "./VoxelChunk.js";

//TODO: Need to test if Ray Origin is inside AABB, If it is, need to determine the initial voxel coord instead of doing a Ray-AABB Test
function VoxelRaycastOLD(ray, chunk, bbox, tries=30){
	//..................................................
	//Determine if the voxel chunk has an intersection.
	var tBox = {};
	if(!Ray.inAABB(ray, bbox, tBox)) return null;

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
		if(VoxelChunk.get(chunk, ix, iy, iz) != 0){ isHit = true; break; }

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
	//console.log("FINAL",
	//	"::Axis",nAxis,
	//	"::Dir",-dir[nAxis],
	//	"::Voxel",ix,iy,iz,
	//);
	//Sample on how to get the intersection point where the voxel was hit.
	//var boundPos	= (( dir[nAxis] > 0)? iAxis+1 : iAxis) * cellSize,		// Position of boundary		
	//	tt			= ( boundPos - ray.origin[nAxis] ) / ray.vecLen[nAxis],	// Time when at axis boundary
	//	ip			= ray.getPos(tt);	// Intersection point on voxel face
	//console.log(ip, tt, boundPos);
}



function VoxelRaycast( ray, eChunk, bbox, tries=30 ){
	//..................................................
	//Determine if the voxel chunk has an intersection.
	var tBox = {};
	if(!Ray.inAABB(ray, bbox, tBox)){ console.log("Not in AABB"); return null; }

	//..................................................
	var chunk 		= eChunk.com.VoxelChunk,
		// Entry point for chunk, Clean up vals near zero. If Min < 0, origin is in AABB
		// Move inPos which is world space, to local space to work with the algorithum which only works in that space
			//inPos		= ray.getPos( Math.max(tBox.min, 0) ).nearZero(),
		inPosLoc	= ray.getPos( Math.max(tBox.min, 0) ).nearZero().sub( eChunk.com.Transform._position ),		
		cellSize	= chunk.scale,

		//--------- Calc Voxel Coord Integer(x,y,z), Clamp between 0 and Max
		ix			= Math.max( Math.min( Math.floor( inPosLoc.x / cellSize), chunk.xMax), 0),
		iy			= Math.max( Math.min( Math.floor( inPosLoc.y / cellSize), chunk.yMax), 0),
		iz			= Math.max( Math.min( Math.floor( inPosLoc.z / cellSize), chunk.zMax), 0),

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
	var	xt			= (xBound - inPosLoc.x ) / ray.dir.x,
		yt 			= (yBound - inPosLoc.y ) / ray.dir.y,
		zt			= (zBound - inPosLoc.z ) / ray.dir.z,

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
	var norm		= [0, 0, 0],
		boundPos	= null;
	norm[tBox.nAxis] = tBox.nDir * 0.1; //Set the starting voxel

	for(var i=0; i < tries; i++){
		//Do something with this voxel
		if(VoxelChunk.get(chunk, ix, iy, iz) != 0){ isHit = true; break; }

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
	/*
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
	*/
}

export default VoxelRaycast;
