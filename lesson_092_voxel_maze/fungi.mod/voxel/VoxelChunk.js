import Voxel from "./Voxel.js";

class VoxelChunk{
	constructor(x=2, y=2, z=2, initVal=0){
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

		for(var i=0; i < this.cells.length; i++) this.cells[i] = initVal;
	}

	coordToIndex(x,y,z){ 
		if( x < 0 || x > this.xMax ||
			y < 0 || y > this.yMax ||
			z < 0 || z > this.zMax ) return -1;
		return x + z * this.xLen + y * this.xzLen;
	}
	indexToCoord(i,out){
		return [
			i % this.xLen,							//x
			Math.floor(i / this.xzLen),				//y
			Math.floor(i / this.xLen) % this.zLen	//z
		];
	}

	set(x,y,z, v){ 
		var i, p, a = arguments;
		for(i=0; i < a.length; i+=4){
			p = this.coordToIndex(a[i],a[i+1],a[i+2]); //p = this.coordToIndex(x,y,z);
			if(p != -1) this.cells[ p ] = a[i+3];
		}
		return this;
	}
	
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

export default VoxelChunk;