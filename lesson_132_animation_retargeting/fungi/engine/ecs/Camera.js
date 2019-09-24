import { Components, System }	from "../Ecs.js";
import Mat4						from "../../maths/Mat4.js";
import gl 						from "../../core/gl.js";

//#########################################################################
class Camera{
	constructor(){
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		this.viewMatrix		= new Mat4();
		this.projMatrix		= new Mat4();
		this.projMatrixInv	= new Mat4();
		this.pvMatrix		= new Mat4();
	}

	static setOrthographic( e, left, right, bottom, top, near, far ){
		//com.projectionMetaData = { left, right, bottom, top, near, far };
		Mat4.ortho( e.Camera.projMatrix, left, right, bottom, top, near, far );
		//Mat4.invert( com.invertedProjectionMatrix, com.projectionMatrix ); //Save Inverted version for Ray Casting.
	}

	static setPerspective( e, fov=45, near=0.1, far=100.0 ){
		let ratio	= gl.width / gl.height;
		fov			= fov * Math.PI/180;
		Mat4.perspective( e.Camera.projMatrix, fov, ratio, near, far );
		Mat4.invert( e.Camera.projMatrix, e.Camera.projMatrixInv );

		//com.projectionMetaData = { fov, ratio, near, far };
		//Mat4.invert(com.invertedProjectionMatrix, com.projectionMatrix); //Save Inverted version for Ray Casting.
	}

	static update( e ){
		Mat4.invert( e.Node.modelMatrix, e.Camera.viewMatrix );						// View Matrix
		Mat4.mul( e.Camera.projMatrix, e.Camera.viewMatrix, e.Camera.pvMatrix );	// Projection View Matrix
	}

	////////////////////////////////////////////////////////////////
	// Space Conversions
	////////////////////////////////////////////////////////////////

	static screenToWorld( eCam, ix, iy, out=null ){
		// http://antongerdelan.net/opengl/raycasting.html
		// Normalize Device Coordinate
		var nx = ix / gl.width * 2 - 1,
			ny = 1 - iy / gl.height * 2;

		// inverseWorldMatrix = invert(ProjectionMatrix * ViewMatrix);  // OR
		// inverseWorldMatrix = localMatrix * invert(ProjectionMatrix); // can cache invert projection matrix.
		var matWorld = new Mat4();
		Mat4.mul( eCam.Node.modelMatrix, eCam.Camera.projMatrixInv, matWorld );

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// https://stackoverflow.com/questions/20140711/picking-in-3d-with-ray-tracing-using-ninevehgl-or-opengl-i-phone/20143963#20143963
		// Clip Cords would be [nx,ny,-1,1] - using 4d Homogeneous Clip Coordinates
		var vec4Near	= [ nx, ny, -1, 1.0 ];		
		Mat4.transformVec4( matWorld, vec4Near );

		for(var i=0; i < 3; i++) vec4Near[i] /= vec4Near[3]; //Normalize by using W component

		out = out || new Vec3();
		return out.copy( vec4Near );
	}

	static worldToScreen( eCam, pos, out=null ){
		var mat	= new Float32Array(16), // Matrix4 Holder
			p	= [ 0, 0, 0, 0 ],		// Vec4
			rtn	= [];					// List of vec2 results

		//Move Points from WorldSpace to -> View Space (View Matrix) -> ClipSpace (ProjMatrix)
		Mat4.mul( eCam.Camera.projMatrix, eCam.Camera.viewMatrix, mat );

		Mat4.transformVec3( mat, pos, p );

		//Move from Clip Space to NDC Space (Normalized Device Coordinate Space) (-1 to 1 opengl viewport)
		if(p[3] != 0){ //only if W is not zero,
			p[0] = p[0] / p[3];
			p[1] = p[1] / p[3];
		}
		
		// Then finally move the points to Screen Space
		// Map points from -1 to 1 range into  0 to 1 range, Then multiple by canvas size
		out		= out || [ 0, 0 ];
		out[0]	= ( p[0] + 1) * 0.5 * gl.width;
		out[1]	= (-p[1] + 1) * 0.5 * gl.height

		return out;
	}

	static worldToScreenAry( eCam, vAry ){
		var mat	= new Float32Array(16), // Matrix4 Holder
			p	= [ 0, 0, 0, 0 ],		// Vec4
			rtn	= [];					// List of vec2 results

		//Move Points from WorldSpace to -> View Space (View Matrix) -> ClipSpace (ProjMatrix)
		Mat4.mul( eCam.Camera.projMatrix, eCam.Camera.viewMatrix, mat );

		let out = new Array( vAry.length );
		for( let i=0; i < vAry.length; i++ ){
			Mat4.transformVec3( mat, vAry[ i ], p );

			// Move from Clip Space to NDC Space (Normalized Device Coordinate Space) (-1 to 1 opengl viewport)
			if(p[3] != 0){ //only if W is not zero,
				p[0] = p[0] / p[3];
				p[1] = p[1] / p[3];
			}

			// Then finally move the points to Screen Space
			// Map points from -1 to 1 range into  0 to 1 range, Then multiple by canvas size
			out[ i ] = [
				( p[0] + 1) * 0.5 * gl.width,
				(-p[1] + 1) * 0.5 * gl.height
			];
		}

		return out;
	}

} Components( Camera );


//#########################################################################
class CameraSystem extends System{
	static init( ecs, priority = 801, priority2 = 1000 ){ 
		ecs.sys_add( new CameraSystem(), priority );
	}

	constructor(){ super(); }
	run( ecs ){
		let c, e, ary = ecs.query_comp( "Camera" );

		for( c of ary ){
			e = ecs.entities[ c.entityID ];
			if( e.Node.isModified ) Camera.update( e );
		}
	}
}


//#########################################################################
export default Camera;
export { CameraSystem };