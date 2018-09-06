import { System } from "../Ecs.js";
import Mat4 from "../maths/Mat4.js";

const QUERY_COM = ["Transform"];

class TransformSystem extends System{
	constructor(){ super(); }

	update(ecs){
		let t, e, 
			//mat4	= new Mat4(),
			ary		= ecs.queryEntities( QUERY_COM );

		for( e of ary ){
			if( e.com.Transform.isModified ){
				//console.log("Transform Update for : ", e.name);
				//.................................
				//Handle Local Transform
				t = e.com.Transform;
				t.isModified = false;
				Mat4.fromQuaternionTranslationScale(t.modelMatrix, t.rotation, t.position, t.scale);

				//e.com.Transform.isModified = false;

				//.................................
				//Handle Camera Component if it exists, ViewMatrix for Shaders
				if(e.com.Camera){
					t = e.com.Transform;
					//Mat4.fromQuaternionTranslationScale(t.modelMatrix, t.rotation, t.position, t.scale);
					Mat4.invert(e.com.Camera.invertedWorldMatrix, t.modelMatrix);
				}
			}
		}
	}

}

export default TransformSystem;