import gl			from "../gl.js";
import Fungi		from "../Fungi.js";
import {Vec3, Mat4}	from "../Maths.js";

class Ray{

	//Create actual point in 3d space the mouse clicked plus the furthest point the ray can travel.
	static pointsFromMouse(ix,iy){
		//http://antongerdelan.net/opengl/raycasting.html
		//Normalize Device Coordinate
		var nx = ix / gl.width * 2 - 1,
			ny = 1 - iy / gl.height * 2;

		//Clip Cords would be [nx,ny,-1,1];

		// inverseWorldMatrix = invert(ProjectionMatrix * ViewMatrix)
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

}

export default Ray;