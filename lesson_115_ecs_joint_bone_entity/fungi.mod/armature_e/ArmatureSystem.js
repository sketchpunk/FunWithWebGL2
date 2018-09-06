import Fungi 			from "../../fungi/Fungi.js";
import { System }		from "../../fungi/Ecs.js";
import Armature			from "./Armature.js";
import ArmaturePreview	from "./ArmaturePreview.js";

const QUERY_COM = ["Armature"];

class ArmatureSystem extends System{
	static init(){ Fungi.ecs.addSystem(new ArmatureSystem, 91); }

	constructor(){ super(); }
	update(ecs){
		let e, ary = ecs.queryEntities( QUERY_COM );
		for( e of ary ){
			if(!e.com.Armature.isModified) continue;

			Armature.updateOffsets( e ).flattenData( e );

			//If Preview Exists
			if(e.com.ArmaturePreview) ArmaturePreview.flattenData( e ).updateBuffer( e );

			e.com.Armature.isModified = false;
		}
	}
}

export default ArmatureSystem;