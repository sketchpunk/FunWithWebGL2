import gl			from "../gl.js";
import Fungi		from "../Fungi.js";
import {Vec3, Mat4}	from "../Maths.js";

/*
class Ray{
	this.dir = new Vec3();
	this.deltaLen = new Vec3();
	this.origin = new Vec3();
	this.end = new Vec3();

	static mouseSegment(ix,iy)
	static mouseDirection(ix,iy,range)
	static debugLine(ray){}
}

class AABB{
	this.localBounds[2];
	this.worldBounds[2];
	this.target = null;

	constructor(){
		if(arguments.length == 2){
			this.localBounds[0] = arguments[0];
			this.localBounds[1] = arguments[1];
		}else if(arguments.length == 6){
			this.localBounds[0] = new Vec3(arguments[0],arguments[1],arguments[2]);
			this.localBounds[1] = new Vec3(arguments[3],arguments[4],arguments[5]);
		}
	}

	setTarget() return this;
	
	update(){
		this.localBounds[0].add(target.position,this.worldBounds[0]);
		this.localBounds[1].add(target.position,this.worldBounds[1]);
	}
}

*/

class Ray{

	//Create actual point in 3d space the mouse clicked plus the furthest point the ray can travel.
	static pointsFromMouse(ix,iy){
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

		for(var i=0; i < 3; i++){
			vec4Near[i] /= vec4Near[3];
			vec4Far[i] /= vec4Far[3];
		}

		var rayNear	= new Vec3(vec4Near[0],	vec4Near[1],	vec4Near[2]),
			rayFar	= new Vec3(vec4Far[0],	vec4Far[1],		vec4Far[2]);

		return {start:rayNear,end:rayFar};
	}

	//Gives you the direction from the center of the screen the user clicked.
	static directionFromMouse(ix,iy){
		//http://antongerdelan.net/opengl/raycasting.html
		//Normalize Device Coordinate
		var nx = ix / gl.width * 2 - 1,
			ny = 1 - iy / gl.height * 2;

		//..........................................
		//4d Homogeneous Clip Coordinates
		var vec4Clip = [nx,ny,-1.0,1.0]; // -Z is forward, W just needs to be 1.0.

		//..........................................
		//4d Eye (Camera) Coordinates
		var vec4Eye = [0,0,0,0],
			matInvProj = new Mat4();

		//Mat4.invert(matInvProj, Fungi.mainCamera.projectionMatrix);
		//Mat4.transformVec4(vec4Eye, vec4Clip, matInvProj);
		Mat4.transformVec4(vec4Eye, vec4Clip, Fungi.mainCamera.invertedProjectionMatrix);
		
		vec4Eye[2] = -1; //Reset Forward Direction
		vec4Eye[3] = 0.0; //Not a Point

		//..........................................
		//4d World Coordinates
		var vec4World = [0,0,0,0];
		//.Mat4.transformVec4(vec4World,vec4Clip,Cam.invertedLocalMatrix);
		Mat4.transformVec4(vec4World, vec4Eye, Fungi.mainCamera.localMatrix);

		var ray = new Vec3(vec4World[0], vec4World[1], vec4World[2]);
		return ray.normalize();
	}

	//planeNorm should be normalized.
	static inPlane(rayStart,rayEnd,planeNorm,planePos){
		// t = ray2PlaneLen.planeNorm / rayLen.planeNorm
		// i = rayStart + (t * rayLen)
		var rayLen	= new Vec3(rayEnd).sub(rayStart),						//Ray Length
			denom	= Vec3.dot(rayLen,planeNorm);							//Dot product of rayPlen Length and plane normal

		if(denom <= 0.000001 && denom >= -0.000001) return null;			//abs(denom) < epsilon, using && instead to not perform absolute.

		var ray2PlaneLen	= new Vec3(planePos).sub(rayStart),				//Distance between start of ray and plane position.
			t 				= Vec3.dot(ray2PlaneLen,planeNorm) / denom;

		if(t >= 0) return rayLen.clone().scale(t).add(rayStart);			//include && t <= 1 to limit to range of ray, else its infinite in fwd dir.

		return null;
	}

	static inPolygon(rayStart,rayEnd,vecAry){
		//....................................................
		//Figure out he plane direction and position for poly
		var planeNorm = new Vec3(),
			planePos = new Vec3(vecAry[0]), 			//Any point will do really.
			v0 = new Vec3(vecAry[1]).sub(planePos),		//v1 - v0 CROSS v2 - v0 :: Counter Clock Wise to get correct direction.
			v1 = new Vec3(vecAry[vecAry.length-1]).sub(planePos);
		Vec3.cross(v0,v1,planeNorm);
		planeNorm.normalize();

		//....................................................
		//Find Intersection Point

		var iPos = Ray.inPlane(rayStart,rayEnd,planeNorm,planePos);
		if(iPos == null) return null;

		//....................................................
		/* Edge Checking - C++ Sample
			Vec3f edge0 = v1 - v0;
			Vec3f edge1 = v2 - v1;
			Vec3f edge2 = v0 - v2;
			Vec3f C0 = P - v0;
			Vec3f C1 = P - v1;
			Vec3f C2 = P - v2;
			if (dot(N, cross(edge0, C0)) > 0 &&
				dot(N, cross(edge1, C1)) > 0 &&
				dot(N, cross(edge2, C2)) > 0) return true; // P is inside the triangle*/
				
		var edge	= new Vec3(),	//length of edge
			ilen	= new Vec3(),	//intersection point length from starting of edge
			cp		= new Vec3(),	//cross product of Edge and iLen
			ii;						

		for(var i=0; i < vecAry.length; i++){
			ii = (i+1)%3;

			edge.copy(vecAry[ii]).sub(vecAry[i]);	//Edge Length
			ilen.copy(iPos).sub(vecAry[i]);			//intersection to edge length
			Vec3.cross(edge,ilen,cp);				//Cross Product of Edge and Inter 

			if(Vec3.dot(planeNorm,cp) < 0) return null; //if angle is in the negative, then its outside the polygon.
		}

		return iPos;
	}

	//NOTE: Think the Barycentric approach is more comberson then the poly edge detection
	//TODO:moller-trumbore algoritham might be better - https://www.scratchapixel.com/lessons/3d-basic-rendering/ray-tracing-rendering-a-triangle/moller-trumbore-ray-triangle-intersection
	//Another better Triangle Intersection algoritham - https://graphics.stanford.edu/courses/cs348b-98/gg/intersect.html
	static inTriangle(rayStart,rayEnd,vecAry){
		//....................................................
		//Figure out he plane direction and position for poly
		var planeNorm = new Vec3(),
			planePos = new Vec3(vecAry[0]), 			//Any point will do really.
			v0 = new Vec3(vecAry[1]).sub(planePos),		//v1 - v0 CROSS v2 - v0 :: Counter Clock Wise to get correct direction.
			v1 = new Vec3(vecAry[2]).sub(planePos);
		Vec3.cross(v0,v1,planeNorm);
		planeNorm.normalize();

		//....................................................
		//Find Intersection Point
		var iPos = Ray.inPlane(rayStart,rayEnd,planeNorm,planePos);
		if(iPos == null) return null;

		//....................................................
		// Barycentric Coordinates 
		var edgeA	= new Vec3(),
			edgeB	= new Vec3(),
			perp	= new Vec3(),
			perpLen	= new Vec3(),
			iLen	= new Vec3(),
			t;

		var ii,iii;
		for(var i=0; i < vecAry.length; i++){
			ii	= (i+1)%3;
			iii	= (i+2)%3;

			//Get the first two edges a = v0-v1, b = v2-v1
			edgeA.copy(vecAry[i]).sub(vecAry[ii]); //Vector Length BA
			edgeB.copy(vecAry[iii]).sub(vecAry[ii]); //Vector Length BC

			//Project EdgeA onto EdgeB to create a perpendicular line from the first point to the opposite edge.
			t = Vec3.dot(edgeA,edgeB) / Vec3.dot(edgeB,edgeB);	//Projection |a|.|b| / |b|.|b| = t  :: Project A onto B.
			perp.copy(edgeB).scale(t).add(vecAry[ii]);			//start + len*t

			Fungi.debugLine.addVecLine(vecAry[i],2, perp,2);

			//Project triangle point to i point onto perpendicular line
			perpLen.copy(perp).sub(vecAry[i]);	//Get length of perpendicular line from point to opposite edge
			iLen.copy(iPos).sub(vecAry[i]);		//Get Length of ipos from the starting point.
			t = Vec3.dot(iLen,perpLen) / Vec3.dot(perpLen,perpLen); //(1 - Projection) if needing Barycentric coord, else leave as is

			Fungi.debugPoint.addVecPoint(perpLen.scale(t).add(vecAry[ii]),2);

			if(t < 0 || t > 1) return null; //t must be between 0 and 1 to be successful
		}
		return iPos;
	}
}

export default Ray;