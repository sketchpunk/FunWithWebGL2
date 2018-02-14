import gl, {VAO, ATTR_POSITION_LOC}			from "../gl.js";
import Fungi		from "../Fungi.js";
import {Vec3, Mat4}	from "../Maths.js";

/////////////////////////////////////////////////////////////////////
// Ray
/////////////////////////////////////////////////////////////////////
class Ray{
	constructor(aPos = null,bPos = null){
		this.origin		= new Vec3(); // Starting position of the ray
		this.end		= new Vec3(); // Ending position of the ray
		this.vecLen		= new Vec3(); // Vector Length of Origin to End
		this.dir		= new Vec3(); // Unit Direction Vector

		if(aPos != null && bPos != null){
			this.origin.copy(aPos);					// Save Origin of the Ray
			this.end.copy(bPos);					// Save End Position of the ray
			this.end.sub(this.origin,this.vecLen);	// Vector Length of the ray :: end - origin = vLen
			this.vecLen.normalize(this.dir);		// Unit Direction Vector of ray
		}
	}

	getPos(t,out){
		if(out === undefined) out = new Vec3();
		out.copy(this.vecLen).scale(t).add(this.origin);
		return out;
	}

	prepareAABB(){
		//Optimization trick from ScratchAPixel
		this.vecLenInv = this.vecLen.clone().divInvScale(1); //Do inverse of distance, to use mul instead of div for speed.

		//Determine which bound will result in tMin so there will be no need to test if tMax < tMin to swop.
		this.aabb = [ (this.vecLenInv.x < 0)? 1 : 0, (this.vecLenInv.y < 0)? 1 : 0, (this.vecLenInv.z < 0)? 1 : 0 ];

		return this;
	}

	//Create actual point in 3d space the mouse clicked plus the furthest point the ray can travel.
	static MouseSegment(ix,iy){
		//http://antongerdelan.net/opengl/raycasting.html
		//Normalize Device Coordinate
		var nx = ix / gl.width * 2 - 1,
			ny = 1 - iy / gl.height * 2;

		//Clip Cords would be [nx,ny,-1,1];

		// inverseWorldMatrix = invert(ProjectionMatrix * ViewMatrix);
		// inverseWorldMatrix = localMatrix * invert(ProjectionMatrix); //can cache invert projection matrix.
		var matWorld = new Mat4();
		//Mat4.mult(matWorld, Fungi.mainCamera.projectionMatrix, Fungi.mainCamera.invertedLocalMatrix);
		//Mat4.invert(matWorld);
		Mat4.mult(matWorld, Fungi.mainCamera.localMatrix, Fungi.mainCamera.invertedProjectionMatrix); //save a step by doing it backwards.


		//https://stackoverflow.com/questions/20140711/picking-in-3d-with-ray-tracing-using-ninevehgl-or-opengl-i-phone/20143963#20143963
		var vec4Near	= [0,0,0,0],
			vec4Far		= [0,0,0,0];		
		Mat4.transformVec4(vec4Near, [nx,ny,-1,1.0], matWorld); //using  4d Homogeneous Clip Coordinates
		Mat4.transformVec4(vec4Far, [nx,ny,1,1.0], matWorld);

		for(var i=0; i < 3; i++){ //Normalize by using W component
			vec4Near[i]	/= vec4Near[3];
			vec4Far[i] 	/= vec4Far[3];
		}

		//................................................
		//Build all the values
		var ray = new Ray();
		ray.origin.copy(vec4Near);			// Save Origin of the Ray
		ray.end.copy(vec4Far);				// Save End Position of the ray
		ray.end.sub(ray.origin,ray.vecLen);	// Vector Length of the ray :: end - origin = vLen
		ray.vecLen.normalize(ray.dir);		// Unit Direction Vector of ray

		return ray;
	}
	
	static MouseDirection(ix,iy,range){}

	static DebugLine(ray){ Fungi.debugLine.addVecLine(ray.origin,6,ray.end,0); }

	static inAABB(box,ray,out){
		var tMin, tMax, min, max, minAxis = 0;//, maxAxis = 0;

		//X Axis ---------------------------
		tMin = (box.worldBounds[	ray.aabb[0]].x - ray.origin.x) * ray.vecLenInv.x;
		tMax = (box.worldBounds[1 - ray.aabb[0]].x - ray.origin.x) * ray.vecLenInv.x;

		//Y Axis ---------------------------
		min = (box.worldBounds[		ray.aabb[1]].y - ray.origin.y) * ray.vecLenInv.y;
		max = (box.worldBounds[1 - 	ray.aabb[1]].y - ray.origin.y) * ray.vecLenInv.y;

		if(max < tMin || min > tMax) return false; //if it criss crosses, its a miss
		if(min > tMin){ tMin = min; minAxis = 1; } //Get the greatest min
		if(max < tMax){ tMax = max; }//Get the smallest max

		//Z Axis ---------------------------
		min = (box.worldBounds[		ray.aabb[2]].z - ray.origin.z) * ray.vecLenInv.z;
		max = (box.worldBounds[1 - 	ray.aabb[2]].z - ray.origin.z) * ray.vecLenInv.z;

		if(max < tMin || min > tMax) return false; //if criss crosses, its a miss
		if(min > tMin){ tMin = min; minAxis = 2; } //Get the greatest min
		if(max < tMax){ tMax = max; } //Get the smallest max

		//Finish ------------------------------
		//var ipos = dir.clone().scale(tMin).add(ray.start); //with the shortist distance from start of ray, calc intersection
		if(out !== undefined){
			out.min		= tMin;
			out.max		= tMax;
			out.nAxis	= minAxis;
			out.nDir	= (ray.aabb[minAxis] == 1)? 1 : -1;
		}
		return true;
	}

	static nearSegmentPoints(ray,A0,A1,tAry){ //http://geomalgorithms.com/a07-_distance.html
		var u = A1.clone().sub(A0),
			v = ray.vecLen.clone(),
			w = A0.clone().sub(ray.origin),
			a = Vec3.dot(u,u),         // always >= 0
			b = Vec3.dot(u,v),
			c = Vec3.dot(v,v),         // always >= 0
			d = Vec3.dot(u,w),
			e = Vec3.dot(v,w),
			D = a*c - b*b,        // always >= 0
			tU, tV;
		//compute the line parameters of the two closest points
		if(D < 0.000001){	// the lines are almost parallel
			tU = 0.0;
			tV = (b>c ? d/b : e/c);    // use the largest denominator
		}else{
			tU = (b*e - c*d) / D;
			tV = (a*e - b*d) / D;
		}

		if( tU < 0 || tU > 1 || tV < 0 || tV > 1) return null;
		if(tAry !== undefined){ tAry[0] = tU; tAry[1] = tV; }

		return [ u.scale(tU).add(A0), v.scale(tV).add(ray.origin) ];
	}
}


/////////////////////////////////////////////////////////////////////
// Bounding Definitions
/////////////////////////////////////////////////////////////////////
class AABB{
	constructor(){
		this.localBounds = [new Vec3(), new Vec3()]; //Local Space Bound Positions
		this.worldBounds = [new Vec3(), new Vec3()]; //World Space Bound Position with target position added to local
		this.target = null;

		if(arguments.length == 1){			//Passing in Target
			this.setTarget(arguments[0]);
		}else if(arguments.length == 2){	//Passing in two Vec3 / arrays
			this.localBounds[0].copy(arguments[0]);
			this.localBounds[1].copy(arguments[1]);
			this.worldBounds[0].copy(arguments[0]);
			this.worldBounds[1].copy(arguments[1]);
		}else if(arguments.length == 6){	//Passing in raw values for bounds.
			this.localBounds[0].set(arguments[0],arguments[1],arguments[2]);
			this.localBounds[1].set(arguments[3],arguments[4],arguments[5]);
			this.worldBounds[0].set(arguments[0],arguments[1],arguments[2]);
			this.worldBounds[1].set(arguments[3],arguments[4],arguments[5]);
		}
	}

	setTarget(t){
		this.target = t;
		if(t.bounds != undefined){
			this.localBounds[0].copy(t.bounds[0]);
			this.localBounds[1].copy(t.bounds[1]);
		}
		return this;
	}

	update(){
		//TODO this won't work well with child renderables. May need to pull translation from worldMatrix.
		this.localBounds[0].add(this.target.position,this.worldBounds[0]);
		this.localBounds[1].add(this.target.position,this.worldBounds[1]);

		return this;
	}
}


/*
class OBB{}
class BoundCapsule{}
class BoundSphere{}
class BoundPlane{}
class BoundQuad{}
*/

export { Ray, AABB };