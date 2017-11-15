import Renderable	from "../Renderable.js";
import gl, { VAO, ATTR_POSITION_LOC } from "../../gl.js";
import Maths, { Vec3, Mat4 }	from "../../Maths.js";

import Fungi 			from "../../Fungi.js";
import { Ray,AABB }			from "../../util/Raycast.js";

/**/
const MIN_CLICK_DIST = 0.02;
const MOVE_SCALE = 0.01;
const SNAP_MOVE = 0.2;

var vRight		= new Vec3(1,0,0),
	vUp			= new Vec3(0,1,0),
	vForward 	= new Vec3(0,0,1),
	gDirList 	= [vRight,vForward,vUp];


function vec2Len(x0,y0,x1,y1){ var dx = x1-x0, dy = y1-y0; return Math.sqrt(dx*dx + dy*dy); }


class KBMCtrl_Gadget{
	constructor(){ this.gadget = null; }
	onMouseUp(e,ctrl,x,y,dx,dy){ ctrl.unStack(); }
	onMouseMove(e,ctrl,x,y,dx,dy){	this.gadget.onMouseMove(x,y); }
}


class TransformGadget extends Renderable{
	constructor(matName){
		super(null,matName);
		this.drawMode		= gl.ctx.LINES;
		this.useCulling		= false;
		this.useDepthTest	= false;

		//...........................
		this.target			= null;			// Object to move
		this.axisMovement	= [];			// List of axis to move the object
		this.initPosition 	= new Vec3();	// Position on Mouse Down
		this.boundBox		= new AABB(0,0,0,1,1,1).setTarget(this);

		//...........................
		var verts = [
			0,0,0,0,	1,0,0,0,
			0,0,0,2,	0,1,0,2,
			0,0,0,1,	0,0,1,1
		];
		this.vao = VAO.standardRenderable("FungiTransformGadget",4,verts,null,null,null);
	}

	setTarget(o){
		this.target = o;
		this.position.copy(o.position);
		return this;
	}

	isHit_Test(ray,mx,my){
		var dir	= [],			// Cache dir that is close to the ray
			tAry	= [0,0],	// Out Var for nearSegmentPoints
			minLen	= 1,		// Smallest Distance an axis has from the Ray
			minT	= 2,		// Smallest T value for the Ray
			iMinLen	= -1,		// Index of the axis with the smallest distance from the Ray
			iMinT	= -1,		// Index of the axis with the smallest T value for the Ray
			len		= 0,		// LengthSqr of the two closest points between the axis
			pnt		= null;		// Array of the two points that represent the closest between two lines.

		console.log("---------------------------");
		for(var i=0; i < gDirList.length; i++){
			pnt = Ray.nearSegmentPoints(ray, this.position, this.position.clone().add(gDirList[i]), tAry);
			
			if(pnt != null){
				len = pnt[0].clone().sub(pnt[1]).sqrMag(); //pnt[0].sub(pnt[1]).sqrMag();
				dir.push(gDirList[i]);

				if(len <= MIN_CLICK_DIST && len < minLen){ iMinLen = i; minLen = len; }
				if(tAry[1] < minT){ minT = tAry[1]; iMinT = i; }

				console.log(i,len,tAry[1]);
				Fungi.debugPoint.addVecPoint(pnt[0],i);
				Fungi.debugPoint.addVecPoint(pnt[1],i);	
			}
		}

		console.log("FINAL",iMinLen,minLen);

		this.axisMovement.length = 0;

		//Check for Single Axis Movement
		if(iMinLen != -1){
			console.log("do single axis movement", gDirList[iMinLen] );
			dir = [ gDirList[iMinLen] ];
		//Check for Plane Movement
		}else if(dir.length == 2){
			console.log("do plane movement");
		}else if(dir.length == 3){
			dir.splice(iMinT,1); //Remove the dir thats closest to ray origin which results in the correct plane being selected
			console.log("Find the plane that is furthest away from ray origin",iMinT);
		}else{
			console.log("NO HIT");
			return false;
		}

		//......................................................
		if(dir.length == 0) return;

		//Figure out the Axis Lines in 3d World Space
		var a, b, lines = [];
		for(var i=0; i < dir.length; i++){
			a = dir[i].clone().scale( 1.5).add(this.position);	//Positive Dir in WorldSpace
			b = dir[i].clone().scale(-1.5).add(this.position);	//Negative Dir in WorldSpace

			lines.push(a,b);
			Fungi.debugLine.addVecLine( a, 4, b, 4 );
		}

		//......................................................
		//Move Points from WorldSpace to -> View Space (View Matrix) -> ClipSpace (ProjMatrix)
		var mat = new Float32Array(16); //Matrix4 Holder
		Mat4.mult(mat,Fungi.mainCamera.projectionMatrix,Fungi.mainCamera.invertedLocalMatrix);

		var p = [0,0,0,0];
		var nx,ny, lines2D = [];
		for(var i=0; i < lines.length; i++){
			Mat4.transformVec3(p, lines[i], mat);

			//Move from Clip Space to NDC Space (Normalized Device Coordinate Space) (-1 to 1 opengl viewport)
			if(p[3] != 0){ //only if W is not zero,
				p[0] = p[0] / p[3];
				p[1] = p[1] / p[3];
			}

			//Then finally move the points to Screen Space
			//Map points from -1 to 1 range into  0 to 1 range, Then multiple by canvas size
			nx = ( p[0] + 1) * 0.5 * gl.width;	// Replaced /2 with *0.5
			ny = (-p[1] + 1) * 0.5 * gl.height;

			lines2D.push(nx,ny);

			/*
			var elm = document.createElement("div");
			document.body.append(elm);
			elm.style.position = "absolute";
			elm.style.background = "orange";
			elm.style.left = nx + "px";
			elm.style.top = ny + "px";
			elm.style.width = "10px";
			elm.style.height = "10px";
			*/
		}

		//......................................................
		//Create a guide line to compare with the mouse location to determine
		var dx,dy,axis,pNear;
		for(var i=0; i < lines2D.length; i+=4){
			dx = ( lines2D[i]	- lines2D[i+2] ) * 10; //[0x,1y,2x,3y]
			dy = ( lines2D[i+1]	- lines2D[i+3] ) * 10;
			
			axis = {
				x0			: mx + dx, // Max Positive Direction
				y0			: my + dy,
				x1			: mx - dx, // Max Negative Direction
				y1			: my - dy,
				dir			: dir[ i/4 ],
			};

			//Find the nearest point on the Guide line, then save the distance from the line origin to this point
			//to save as the inital starting point when comparing the mouse movement.
			pNear 			= Maths.closestPointToLine2D(axis.x0, axis.y0, axis.x1, axis.y1, mx, my);
			axis.initDelta 	= vec2Len(pNear[0], pNear[1], axis.x0, axis.y0);
			axis.xMin		= Math.min(axis.x0, axis.x1);
			axis.xMax		= Math.max(axis.x0, axis.x1);
			axis.yMin		= Math.min(axis.y0, axis.y1);
			axis.yMax		= Math.max(axis.y0, axis.y1);

			this.axisMovement.push(axis);

			/*
			var elm = document.createElement("div");
			document.body.append(elm);
			elm.style.position = "absolute";
			elm.style.background = "yellow";
			elm.style.left = line.x0 + "px";
			elm.style.top = line.y0 + "px";
			elm.style.width = "10px";
			elm.style.height = "10px";

			var elm = document.createElement("div");
			document.body.append(elm);
			elm.style.position = "absolute";
			elm.style.background = "yellow";
			elm.style.left = line.x1 + "px";
			elm.style.top = line.y1 + "px";
			elm.style.width = "10px";
			elm.style.height = "10px";

			var elm = document.createElement("div");
			document.body.append(elm);
			elm.style.position = "absolute";
			elm.style.background = "black";
			elm.style.left = pNear[0] + "px";
			elm.style.top = pNear[1] + "px";
			elm.style.width = "10px";
			elm.style.height = "10px";

			console.log("Delta",dx,dy);
			*/
		}

		this.initPosition.copy(this.position);
		return true;
	}

	
	isHit(ray,mx,my){
		//Do Bounding Box testing first, if there is no intersection
		if(! Ray.inAABB(this.boundBox.update(),ray)) return false;

		//.................................................
		var dir		= [],		// Cache dir that is close to the ray
			tAry	= [0,0],	// Out Var for nearSegmentPoints
			minLen	= 1,		// Smallest Distance an axis has from the Ray
			minT	= 2,		// Smallest T value for the Ray
			iMinLen	= -1,		// Index of the axis with the smallest distance from the Ray
			iMinT	= -1,		// Index of the axis with the smallest T value for the Ray
			len		= 0,		// LengthSqr of the two closest points between the axis
			pnt		= null;		// Array of the two points that represent the closest between two lines.

		//.................................................
		//Find which axis lines the ray is near, if not save whats in range to determine if plane movement
		for(var i=0; i < gDirList.length; i++){
			pnt = Ray.nearSegmentPoints(ray, this.position, this.position.clone().add(gDirList[i]), tAry);
			
			if(pnt != null){
				len = pnt[0].sub(pnt[1]).sqrMag();
				dir.push(gDirList[i]);

				//Check if distance of ray is near axis line
				if(len <= MIN_CLICK_DIST && len < minLen){ iMinLen = i; minLen = len; }

				//is this ray point the closest to ray origin
				if(tAry[1] < minT){ minT = tAry[1]; iMinT = i; }
			}
		}

		this.axisMovement.length = 0; //Clear out array

		if(iMinLen != -1)			dir = [ gDirList[iMinLen] ];	//Ray touched an axis line, single axis movement
		else if(dir.length == 3)	dir.splice(iMinT,1); 			//Remove the dir thats closest to ray origin which results in the correct plane being selected
		else if(dir.length <= 1)	return false;
		//else if(dir.length == 2) console.log("do plane movement");
		//else return false; //With AABB, the ray will intersect an axis

		//......................................................
		// Create the Guide Lines in 3D Worldspace then bring them into Screen Space
		// Do all the points in a batch because of matrix transformations	
		var ssAry,wsAry = [];
		for(var i=0; i < dir.length; i++){
			wsAry.push(
				dir[i].clone().scale( 1.5).add(this.position),	//Positive Dir in WorldSpace
				dir[i].clone().scale(-1.5).add(this.position)	//Negative Dir in WorldSpace
			);
		}

		ssAry = Fungi.mainCamera.worldToScreen(wsAry);	

		//......................................................
		// Create all the data needed to compare screen mouse movement to movement done in 3d space for target
		var dx,dy,axis,pNear;
		for(var i=0; i < ssAry.length; i+=4){
			dx = ( ssAry[i]		- ssAry[i+2] ) * 10; //[0x,1y,2x,3y]
			dy = ( ssAry[i+1]	- ssAry[i+3] ) * 10;
			
			axis = {
				x0			: mx + dx, // Max Positive Direction
				y0			: my + dy,
				x1			: mx - dx, // Max Negative Direction
				y1			: my - dy,
				dir			: dir[ i/4 ],
			};

			//Find the nearest point on the Guide line, then save the distance from the line origin to this point
			//to save as the inital starting point when comparing the mouse movement.
			pNear 			= Maths.closestPointToLine2D(axis.x0, axis.y0, axis.x1, axis.y1, mx, my);
			axis.initDelta 	= vec2Len(pNear[0], pNear[1], axis.x0, axis.y0);
			axis.xMin		= Math.min(axis.x0, axis.x1);
			axis.xMax		= Math.max(axis.x0, axis.x1);
			axis.yMin		= Math.min(axis.y0, axis.y1);
			axis.yMax		= Math.max(axis.y0, axis.y1);

			this.axisMovement.push(axis);
		}

		//......................................................
		//Save Initial Position as a starting point for movement.
		this.initPosition.copy(this.target.position);
		return true;
	}

	onMouseMove(mx,my){
		var cx,cy,		// Clamped X,Y
			axis,		// Ref to axis data
			pNear,		// Closests point on a line from the mouse x,y
			d,delta,	// Distance and Delta Distance
			dir		= new Vec3(),					//Direction Unit Vector
			final	= new Vec3(this.initPosition);	//Final Movement

		for(var i=0; i < this.axisMovement.length; i++){
			axis	= this.axisMovement[i];

			//Clamp Mouse Coord to the range of the guide line then find nearest point on line
			cx		= Maths.clamp(mx, axis.xMin, axis.xMax);
			cy		= Maths.clamp(my, axis.yMin, axis.yMax);
			pNear	= Maths.closestPointToLine2D(axis.x0, axis.y0, axis.x1, axis.y1, mx, my);
			
			//Calc the distance traveled
			d		= vec2Len(pNear[0], pNear[1], axis.x0, axis.y0);
			delta	= (axis.initDelta - d) * MOVE_SCALE;

			//Snap movement
			delta 	= Math.round(delta / SNAP_MOVE) * SNAP_MOVE;

			final.add( dir.copy(axis.dir).scale(delta) ); //TODO, better way to marry pixel movement to 3d unit movement.
		}

		this.position.copy(final);
		//this.target.position.copy(final);
	}

}

export default TransformGadget;
export { KBMCtrl_Gadget };