import Voxel			from "./Voxel.js";
import { Components }	from "../../fungi/Ecs.js";

class VoxelChunk{
	constructor(){
		this.isModified = false;

		//Overall size of the Chunk
		this.scale	= 1;
		this.xLen	= 0;
		this.yLen	= 0;
		this.zLen	= 0;

		//Cache max coord values to save repeating the math
		this.xMax	= 0;
		this.yMax	= 0;
		this.zMax	= 0;

		this.xzLen 	= 0;	// Cache value, since this is used to help calc index
		this.xyzLen = 0;	// Total amount of voxels

		this.cells	= null; // Create flat array to hold Voxel Data.
	}


	////////////////////////////////////////////////////////////////////
	// INITIALIZERS
	////////////////////////////////////////////////////////////////////
		static init(e, x=2, y=2, z=2, scale=0.2, initVal=0){
			let vc = (e instanceof VoxelChunk)? e : e.com.VoxelChunk;
			if(!vc) vc = e.addByName("VoxelChunk");

			// Overall size of the Chunk
			vc.scale	= scale;
			vc.xLen		= x;
			vc.yLen		= y;
			vc.zLen		= z;

			// Cache max coord values to save repeating the math
			vc.xMax		= (x != 0)? x-1 : 0;
			vc.yMax		= (y != 0)? y-1 : 0;
			vc.zMax		= (z != 0)? z-1 : 0;

			vc.xzLen	= x * z;		// Cache value, since this is used to help calc index
			vc.xyzLen	= x * y * z;	// Total amount of voxels

			vc.cells	= new Array(vc.xyzLen); //Create flat array to hold Voxel Data.

			for(var i=0; i < vc.cells.length; i++) vc.cells[i] = initVal;

			return e;
		}

	////////////////////////////////////////////////////////////////////
	// CELL COORD
	////////////////////////////////////////////////////////////////////
		static coordToIndex(vc, x, y, z){
			if( x < 0 || x > vc.xMax ||
				y < 0 || y > vc.yMax ||
				z < 0 || z > vc.zMax ) return -1;
			return x + z * vc.xLen + y * vc.xzLen;
		}
		static indexToCoord(vc, i, out){
			return [
				i % vc.xLen,						//x
				Math.floor(i / vc.xzLen),			//y
				Math.floor(i / vc.xLen) % vc.zLen	//z
			];
		}

	////////////////////////////////////////////////////////////////////
	// SETTERS / GETTERS
	////////////////////////////////////////////////////////////////////
		static set(vc, x, y, z, v){
			let a = arguments,
				i, p;

			for(i=1; i < a.length; i+=4){
				p = VoxelChunk.coordToIndex( vc, a[i], a[i+1], a[i+2] ); //p = this.coordToIndex(x,y,z);
				if(p != -1) vc.cells[ p ] = a[i+3];
			}

			vc.isModified = true;
			return this;
		}
		
		static setColHeight(e, x, y, z){
			let vc	= e.com.VoxelChunk,
				idx	= VoxelChunk.coordToIndex(vc,x,0,z);

			//Find the starting position, then loop
			for(var i=0; i < vc.yLen; i++){
				vc.cells[ idx + i * vc.xzLen ] = (i <= y && y != -1)? 1 : 0;
			}

			vc.isModified = true;
		}

		static setColHeightMirror(e, x, y, z){
			let vc	= e.com.VoxelChunk,
				idx	= VoxelChunk.coordToIndex(vc,x,0,z),
				mid	= vc.yMax * 0.5,
				dist;
				
			//Find the starting position, then loop
			for(var i=0; i < vc.yLen; i++){
				dist = Math.floor(Math.abs(i-mid));
				vc.cells[ idx + i * vc.xzLen ] = (dist <= y && y != -1)? 1 : 0;
			}

			vc.isModified = true;
		}

		static get(vc, x, y, z, dir = -1){
			//Apply Direction to get a cell next to the requested cell
			if(dir != -1){
				var n = Voxel.FACES[dir].n;
				x += n[0];
				y += n[1];
				z += n[2];
			}

			//Validate that coords are within the bounds of the chunk
			if( x < 0 || x > vc.xMax ||
				y < 0 || y > vc.yMax ||
				z < 0 || z > vc.zMax ) return null;

			//Return the cell data
			return vc.cells[ x + z * vc.xLen + y * vc.xzLen ];
		}

		static getMaxBound(vc){ //let vc = e.com.VoxelChunk;
			return [ vc.xLen*vc.scale, vc.yLen*vc.scale, vc.zLen*vc.scale ];
		}

		static getCellBound(e, x, y, z){
			let vc = (e instanceof VoxelChunk)? e : e.com.VoxelChunk;
			if( x > vc.xMax || y > vc.yMax || z > vc.zMax ) return null;

			let xpos = x * vc.scale,
				ypos = y * vc.scale,
				zpos = z * vc.scale;

			return {
				min:[xpos, ypos, zpos],
				max:[xpos+vc.scale, ypos+vc.scale, zpos+vc.scale]
			};
		}
} Components(VoxelChunk);

export default VoxelChunk;