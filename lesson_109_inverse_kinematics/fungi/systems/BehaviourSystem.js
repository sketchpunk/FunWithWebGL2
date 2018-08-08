import { System } from "../Ecs.js";

const QUERY_COM = ["Behaviour"];

class BehaviourSystem extends System{
	constructor(){ super(); }

	update(ecs){
		let t, e, ary = ecs.queryEntities( QUERY_COM );
		for( e of ary ){
			if(!e.active || !e.com.Behaviour.update) continue;
			e.com.Behaviour.update();
		}
	}
}

export default BehaviourSystem;