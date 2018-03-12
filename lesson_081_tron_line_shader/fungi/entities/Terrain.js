import Renderable		from "./Renderable.js";
import { Vec3,Mat4,Quat } from "../Maths.js";
import gl, {VAO, ATTR_POSITION_LOC} from "../gl.js";
import Noise from "../../extra/Noise.js";


// tSpec = { size:2, cells:5, maxHeight:-3, freq:13, seed:1 };
class Terrain extends Renderable{
	constructor(mat,tSpec,xOffset,zOffset){
		super(null,mat);
		this.drawMode = gl.ctx.TRIANGLE_STRIP;
		this.aryHeights = []; //Cache all the heights of the vertices to use for intersection testing.

		//...........................................
		//Setup Variables to generate
		var n,x,z,zPos,xPos,yPos,
			yRange		= tSpec.maxHeight - tSpec.minHeight,
			freq		= 1 / tSpec.freq,				// Invert freq to do mul instead of division.
			cellSize	= tSpec.size / tSpec.cells,		// Increment for each point in the grid
			xOrigin 	= freq * xOffset * tSpec.cells,	// X Chunk Starting point
			zOrigin 	= freq * zOffset * tSpec.cells,	// Z Chunk Starting point
			aryVert		= [],							// Vertex Array
			aryIdx		= [],							// Index Array
			yMin		= tSpec.maxHeight+1,			// Lowest Y Value
			yMax		= tSpec.minHeight-1;			// Greatest Y Value
		
		//...........................................
		// Create Grid
		Noise.seed(tSpec.seed);
		for(var z = 0; z <= tSpec.cells; z++){
			zPos = z * cellSize; //Increment Row

			for(x=0; x <= tSpec.cells; x++){
				n		= Noise.perlin2( xOrigin + (x*freq),  zOrigin + (z*freq) ); //Perlin -1:1
				xPos 	= x * cellSize;			//Increment Column
				yPos 	= (n * 0.5 + 0.5) * yRange + tSpec.minHeight;

				if(yPos < yMin) yMin = yPos;	//Keep track of max/min y value
				if(yPos > yMax) yMax = yPos;

				aryVert.push(xPos,yPos,zPos);	//Save verts to raw array
				this.aryHeights.push(yPos);		//Caching Height value, can calc x,z position on demand.
			}
		}

		//...........................................
		//Create Index Array for Triangle Strip Pattern
		triangleStrip(tSpec.cells+1, tSpec.cells+1, aryIdx, false, false);

		//...........................................
		//Setup final class properties
		this.vao			= VAO.standardRenderable( "FungiTerrain", 3, aryVert, null, null, aryIdx );
		this.bounds			= [ new Vec3( 0, yMin, 0 ), new Vec3( tSpec.size, yMax, tSpec.size ) ];

		this.cellSize		= cellSize;			//Save the size of each cell.
		this.cellSizeInv	= 1 / cellSize;		//Inverted to do mul over division
		this.cellDiv		= tSpec.cells + 1;	//For cell count there is always an extra line to complete the grid

		//Cached data for getPos and getPosHeight used for intersection  testing.
		this.hOffset		= [ 0, 1, this.cellDiv,		this.cellDiv+1, this.cellDiv, 1 ], //Height offset for Quad Triangles
		this.uvOffset		= [ 0,0,	1,0,	0,1,	//Left Triangle in Quad
								1,1,	0,1,	1,0];	//Right Triangle in Quad
	}

	getPosHeight_Test(x,z,debug){		
		//..................................................
		var xLocal = x - this.position.x,					//Move from world space to object local to easily calc grid position
			zLocal = z - this.position.z,
			xGrid = Math.floor(xLocal / this.cellSize),	//Calc Grid Cell X,Z locations
			zGrid = Math.floor(zLocal / this.cellSize),
			tX = (xLocal % this.cellSize) / this.cellSize,	//Calc the Norm Pos on the Quad, its like UV with top-left 0,0, bot-right 1,1
			tZ = (zLocal % this.cellSize) / this.cellSize,
			u = (xLocal % this.cellSize) / this.cellSize,	//Calc the Norm Pos on the Quad, its like UV with top-left 0,0, bot-right 1,1
			v = (zLocal % this.cellSize) / this.cellSize,
			w = 1 - (u + v);	
		console.log(x,z,u,v,w);
		console.log("Grid Coord",xGrid,zGrid, "Local", xLocal, zLocal, "Time", tX,tZ, "test", tX, 1-tZ);

		/*
		00       10
		-----------
		|	     /|
		|	  /	  |
		|  /	  |
		/		  |
		-----------
		01       11        
		*/

		//..................................................
		/* Calc the 4 points that shows the location of the xGrid,zGrid. */
		var chg = [ 1,0,1,
					0,0,0,
					0,1,this.cellDiv,
					1,1,this.cellDiv+1,
					1,0,1
				]; //Move Pattern by X, Z and Idx to get quad points

		var idx = ((zGrid * this.cellDiv) + xGrid); //Calc Index for Height
		var p = new Vec3();
		
		for(var i=0; i < chg.length; i+=3){
			p.set(	( xGrid + chg[i] ) * this.cellSize,
					this.aryHeights[idx + chg[i+2]],
					( zGrid + chg[i+1] ) * this.cellSize,
			).add(this.position);
			debug.addVecPoint(p ,1);
		}

		return 0;
		


		//..................................................
		/*	Using the diagnal between the two triangles in a quad*/
		var xx,zz,yy,
			tri = [],		//Store the points
			bcc = [],		//Arry of baryCentric coords to pass to function to get the triangle weights
			triStart = 0,
			vert,			//Temp Vec3

			idx = ((zGrid * this.cellDiv) + xGrid), 					//Calc Index for Height

			chg = [ 0,0,0,		1,0,1,	0,1,this.cellDiv,	//Left Triangle in Quad
					1,1,this.cellDiv+1,	 0,1,this.cellDiv, 1,0,1 ]; //Right Triangle in Quad

		//Narrow down which triangle in the quad we need to check.
		if(tX <= (1 - tZ)){ console.log("left tri 0 1 2"); }
		else{ triStart = 9; console.log("right tri 1 2 3"); }
		
		var q= 0;

		//Build x,y,z coords for the triangle plus barycentric ones to determine position on the triangle.
		for(var i = triStart; i < triStart + 9; i+=3){
			//calc x, y, z of the 3 points of the triangle
			xx		= (xGrid + chg[i]) * this.cellSize;
			zz		= (zGrid + chg[i+1]) * this.cellSize;
			yy		= this.aryHeights[ idx + chg[i+2] ];
			vert	= new Vec3(xx,yy,zz);
			
			tri.push(vert);
			debug.addVecPoint(vert, q++); //See Vertex that forms a triangle

			//Create BaryCentric Coord
			bcc.push( new Vec3( chg[i], yy, chg[i+1] ) );
		}

		//Calc barycentric weights to determine the intersection point within the triangle.
		var bc = baryCentricLambda(bcc[0],bcc[1],bcc[2],tX,tZ),
			xxx = bc[0] * tri[0].x + bc[1] * tri[1].x + bc[2] * tri[2].x,
			yyy = bc[0] * tri[0].y + bc[1] * tri[1].y + bc[2] * tri[2].y,
			zzz = bc[0] * tri[0].z + bc[1] * tri[1].z + bc[2] * tri[2].z;

		var xxx1 = w * tri[0].x + u * tri[1].x + v * tri[2].x,
			yyy1 = w * tri[0].y + u * tri[1].y + v * tri[2].y,
			zzz1 = w * tri[0].z + u * tri[1].z + v * tri[2].z;

		//debug.addRawPoint(xxx1,yyy1,zzz1,6);
		debug.addRawPoint(xxx,yyy,zzz,5);
		console.log("BL", w,u,v); 	//LEFT Triangle
		console.log("BR", -w,1-u,1-v); 	//Right Triangle
		console.log("BC", bc[0],bc[1],bc[2]);
		//console.log("BC", xxx,yyy,zzz,bc);
		return 0;
		//return yyy;
	}


	getPosHeight_Test2(x,z,debug){
		//..................................................
		var xLocal = x - this.position.x,					//Move from world space to object local to easily calc grid position
			zLocal = z - this.position.z,
			xGrid = Math.floor(xLocal * this.cellSizeInv),	//Calc Grid Cell X,Z locations
			zGrid = Math.floor(zLocal * this.cellSizeInv),
			u = (xLocal % this.cellSize) * this.cellSizeInv,//Calc the Norm Pos on the Quad, its like UV with top-left 0,0, bot-right 1,1
			v = (zLocal % this.cellSize) * this.cellSizeInv,
			w = 1 - (u + v);	
		//console.log(x,z,u,v,w);
		//console.log("Grid Coord",xGrid,zGrid, "Local", xLocal, zLocal);

		/*
		00       10
		-----------
		|	     /|
		|	  /	  |
		|  /	  |
		/		  |
		-----------
		01       11        
		*/


		//..................................................
		/*	Using the diagnal between the two triangles in a quad, */
		var xx,zz,yy,
			cache = [],		//Store data points
			loop = 0,
			vert,			//Temp Vec3
			
			hIdx = ((zGrid * this.cellDiv) + xGrid), 		//Calc Index for Height

			hOffset = [ 0, 1, this.cellDiv,		this.cellDiv+1, this.cellDiv, 1 ], //Height offset for Quad Points
			uvOffset = [ 	0,0,	1,0,	0,1,	//Left Triangle in Quad
							1,1,	0,1,	1,0];	//Right Triangle in Quad

		//Narrow down which triangle in the quad we need to check.

		// U = 1-V (Diagonal line between BLeft and TRight) :: So U <= 1-V is Left else Right
		if(u <= (1 - v)){	console.log("left tri 0 1 2"); }
		else{ loop = 3;	console.log("right tri 1 2 3"); }
		
		var q = 0;

		//Build x,y,z coords for the triangle plus barycentric ones to determine position on the triangle.
		for(var i = loop; i < loop + 3; i++){
			//calc x, y, z of the 3 points of the triangle
			xx		= (xGrid + uvOffset[i*2+0]) * this.cellSize;
			zz		= (zGrid + uvOffset[i*2+1]) * this.cellSize;
			yy		= this.aryHeights[ hIdx + hOffset[i] ];
			vert	= new Vec3(xx,yy,zz);

			cache.push(vert);
			debug.addVecPoint(vert.clone().add(this.position), q++); //See Vertex that forms a triangle
		}

		if(loop == 3){ //Right Triangle needs w,u,v inverted in a way.
			w = -w;
			u = 1-u;
			v = 1-v;
		}

		var xxx = w * cache[0].x + u * cache[1].x + v * cache[2].x,
			yyy = w * cache[0].y + u * cache[1].y + v * cache[2].y,
			zzz = w * cache[0].z + u * cache[1].z + v * cache[2].z;

		debug.addVecPoint(new Vec3(xxx,yyy,zzz).add(this.position),6);
		return yyy + this.position.y;
	}

	getPos(x,z){
		//..................................................
		var xLocal	= x - this.position.x,							//Move from world space to object local to easily calc grid position
			zLocal	= z - this.position.z,
			xGrid	= Math.floor(xLocal * this.cellSizeInv),		//Calc Grid Cell X,Z locations
			zGrid	= Math.floor(zLocal * this.cellSizeInv),
			u		= (xLocal % this.cellSize) * this.cellSizeInv,	//Calc BaryCentric Weight, its like UV with top-left 0,0, bot-right 1,1
			v		= (zLocal % this.cellSize) * this.cellSizeInv,
			w		= 1 - (u + v);	

		//..................................................
		/*	Using the diagnal between the two triangles in a quad, */
		var xx,zz,yy,
			cache	= [], //Store data points
			loop	= 0,
			hIdx	= ((zGrid * this.cellDiv) + xGrid); //Calc Index for Height

		//Narrow down which triangle in the quad we need to check.
		// U = 1-V (Diagonal line between BLeft and TRight) :: So U <= 1-V is Left else Right
		if(u > (1 - v)) loop = 3;

		//Build x,y,z coords for the triangle
		for(var i = loop; i < loop + 3; i++){
			//calc x, y, z of the 3 points of the triangle
			xx		= (xGrid + this.uvOffset[i*2+0]) * this.cellSize;
			zz		= (zGrid + this.uvOffset[i*2+1]) * this.cellSize;
			yy		= this.aryHeights[ hIdx + this.hOffset[i] ];
			cache.push(new Vec3(xx,yy,zz));
		}

		//..................................................
		//Right Triangle needs w,u,v inverted in a way.
		if(loop == 3){ 
			w = -w;
			u = 1-u;
			v = 1-v;
		}

		//Using BaryCentric Weight to calculate the X,Y,Z position
		//TODO : Dont really need to calc X and Z, can just reuse localX and Z in its place
		var xxx = w * cache[0].x + u * cache[1].x + v * cache[2].x,
			yyy = w * cache[0].y + u * cache[1].y + v * cache[2].y,
			zzz = w * cache[0].z + u * cache[1].z + v * cache[2].z;
		return new Vec3(xxx,yyy,zzz).add(this.position);
		//return new Vec3(xLocal,yyy,zLocal).add(this.position); //this will work just fine, can skip the x,z calcs to optimize
	}

	getPosHeight(x,z){
		//..................................................
		var xLocal	= x - this.position.x,							//Move from world space to object local to easily calc grid position
			zLocal	= z - this.position.z,
			xGrid	= Math.floor(xLocal * this.cellSizeInv),		//Calc Grid Cell X,Z locations
			zGrid	= Math.floor(zLocal * this.cellSizeInv),
			u		= (xLocal % this.cellSize) * this.cellSizeInv,	//Calc BaryCentric Weight, its like UV with top-left 0,0, bot-right 1,1
			v		= (zLocal % this.cellSize) * this.cellSizeInv,
			w		= 1 - (u + v);	

		//..................................................
		/*	Using the diagnal between the two triangles in a quad, */
		var cache	= [],		//Store data points
			loop	= 0,
			hIdx	= ((zGrid * this.cellDiv) + xGrid); //Calc Index for Height

		//Narrow down which triangle in the quad we need to check.
		//U = 1-V (Diagonal line between BLeft and TRight) :: So U <= 1-V is Left else Right
		if(u > (1 - v)) loop = 3;

		//Build list if Height based on which triangle in the quat we're searching
		for(var i = loop; i < loop + 3; i++) cache.push( this.aryHeights[ hIdx + this.hOffset[i] ] );

		//..................................................
		//Right Triangle needs w,u,v inverted in a way.
		if(loop == 3){  w = -w; u = 1-u; v = 1-v; }

		//Using BaryCentric Weight to calculate the X,Y,Z position
		return w * cache[0] + u * cache[1] + v * cache[2] + this.position.y; //Move to world space by padding y Position
	}
}

/*
Useful to get vec3 on a quad based on UV, but need to pick the right triange
and put it in the right order for the math to work.
ABC Tri1 [0,y,0] [1,y,0] [0,y,1] then UV 0->1, 0->1  :: ORDER (00 10 01)
or  Tri2 [1,y,0] [1,y,1] [0,y,1] then UV 0->1, 0->1  :: ORDER (10 11 01)

NOTE : A,B,C are vec3 with U,V are floats
https://gamedev.stackexchange.com/questions/23743/whats-the-most-efficient-way-to-find-barycentric-coordinates */
function baryCentricLambda(a, b, c, u, v){
	
	var invDet	= 1 / ((b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z)),
		l1		= ((b.z - c.z) * (u - c.x) + (c.x - b.x) * (v - c.z)) * invDet,
		l2		= ((c.z - a.z) * (u - c.x) + (a.x - c.x) * (v - c.z)) * invDet,
		l3		= 1.0 - l1 - l2;
	
/*
	var invDet = 1.0 / ((b.y-c.y) * (a.x-c.x) + (c.x-b.x) * (a.y-c.y)),
		l1 = ((b.y-c.y) * (u-c.x) + (c.x-b.x) * (v-c.y)) * invDet,
		l2 = ((c.y-a.y) * (u-c.x) + (a.x-c.x) * (v-c.y)) * invDet, 
		l3 = 1.0 - l1 - l2;
*/
	return [l1,l2,l3];
}

function triangleStrip(rLen,cLen,indAry,isLoop,doClose){ //isLoop ties the left to the right, doClose is for paths that are closed shapes like a square
	var iLen = (rLen-1) * cLen,		//How many indexes do we need
		iEnd = (cLen*(rLen-1))-1,	//What the final index for triangle strip
		iCol = cLen - 1,			//Index of Last col
		posA = 0,					//Top Index
		posB = posA + cLen,			//Bottom Index
		c = 0;						//Current Column : 0 to iCol

	for(var i=0; i < iLen; i++){
		c = i % cLen;
		indAry.push(posA+c,posB+c);

		//Create degenerate triangles, The last then the first index of the current bottom row.
		if(c == iCol){
			if(i == iEnd && isLoop == true){
				if(doClose == true) indAry.push(posA,posB);
				indAry.push(posB+cLen-1,posB);
				iLen += cLen; //Make loop go overtime for one more row that connects the final row to the first.
				posA += cLen;
				posB = 0;
			}else if(i >= iEnd && doClose == true){
				indAry.push(posA,posB);
			}else if(i < iEnd){ //if not the end, then skip to next row
				if(doClose == true) indAry.push(posA,posB);
				indAry.push(posB+cLen-1, posB);
				posA += cLen;
				posB += cLen;
			}
		}
	}
}


//https://www.youtube.com/watch?v=6E2zjfzMs7c&list=PLRIWtICgwaX0u7Rf9zkZhLoLuZVfUksDP&index=22
export default Terrain;