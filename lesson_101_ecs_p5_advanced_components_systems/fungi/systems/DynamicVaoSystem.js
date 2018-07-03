import { System } from "../Ecs.js";

const QUERY_COM = ["DynamicVao"];

class DynamicVaoSystem extends System{
	constructor(){ super(); }

	update(ecs){
		let d, e, ary = ecs.queryEntities( QUERY_COM );
		for( e of ary ){
			if(!e.active || !e.com.DynamicVao.isModified) continue;
			//console.log("Updating DynamicVao", e.name);

			d = e.com.DynamicVao;
			d.verts.pushToGPU();
			d.isModified = false;

			e.com.Drawable.vao.elmCount = d.verts.getComponentCnt();
		}
	}
}

export default DynamicVaoSystem;