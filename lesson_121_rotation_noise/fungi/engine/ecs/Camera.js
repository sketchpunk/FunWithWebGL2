import { Components, System }	from "../Ecs.js";
import Mat4						from "../../maths/Mat4.js";
import gl 						from "../../core/gl.js";

//#########################################################################
class Camera{
	constructor(){
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		this.viewMatrix		= new Mat4();
		this.projMatrix		= new Mat4();
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
		//com.projectionMetaData = { fov, ratio, near, far };
		//Mat4.invert(com.invertedProjectionMatrix, com.projectionMatrix); //Save Inverted version for Ray Casting.
	}

	static update( e ){
		Mat4.invert( e.Node.modelMatrix, e.Camera.viewMatrix );						// View Matrix
		Mat4.mul( e.Camera.projMatrix, e.Camera.viewMatrix, e.Camera.pvMatrix );	// Projection View Matrix
	}
} Components( Camera );


//#########################################################################
const QUERY_COM = [ "Node", "Camera" ];

class CameraSystem extends System{
	static init( ecs, priority = 801, priority2 = 1000 ){ 
		ecs.addSystem( new CameraSystem(), priority );
	}

	constructor(){ super(); }
	update( ecs ){
		let e, ary = ecs.queryEntities( QUERY_COM );
		for( e of ary ) if( e.Node.isModified ) Camera.update( e );
	}
}


//#########################################################################
export default Camera;
export { CameraSystem };