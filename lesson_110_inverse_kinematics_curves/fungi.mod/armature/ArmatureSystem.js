import Fungi 			from "../../fungi/Fungi.js";
import { System }		from "../../fungi/Ecs.js";
import Armature			from "./Armature.js";
import ArmaturePreview	from "./ArmaturePreview.js";

const QUERY_COM = ["Armature"];

class ArmatureSystem extends System{
	constructor(){ 
		super();
	}

	update(ecs){
		let e, ary = ecs.queryEntities( QUERY_COM );
		for( e of ary ){
			if(!e.com.Armature.isModified) continue;
			//console.log(e.name);
			//if one joint has changed, then update pose
			Armature.updatePose( e );
			Armature.flatOffset(e, e.com.Armature.flatOffset )

			//If Preview Exists
			if(e.com.Armature.flatWorldSpace) ArmaturePreview
									.flattenData( e )
									.updateBuffer( e );
		}
	}

	static init(){ Fungi.ecs.addSystem(new ArmatureSystem, 50); }
}

export default ArmatureSystem;