import { System } from "../Ecs.js";
import Mat4 from "../maths/Mat4.js";

const QUERY_COM = ["Transform"];

class TransformSystem extends System{
	constructor(){ super(); }

	update(ecs){
		let t, e, ary = ecs.queryEntities( QUERY_COM );
		for( e of ary ){
			if( e.com.Transform._isModified ){
				//console.log("Transform Update for : ", e.name);
				//.................................
				//Handle Local Transform
				t = e.com.Transform;
				t._isModified = false;
				Mat4.fromQuaternionTranslationScale(t.modelMatrix, t._rotation, t._position, t._scale);

				//.................................
				//Handle Camera Component if it exists, ViewMatrix for Shaders
				if(e.com.Camera){
					Mat4.invert(e.com.Camera.invertedWorldMatrix, t.modelMatrix);
				}
			}
		}
	}

}

export default TransformSystem;