import Fungi from "../Fungi.js";
import { System } from "../Ecs.js";
import Vec3 from "../maths/Vec3.js";

const QUERY_COM = ["TransformNode", "Transform"];

class TransformNodeSystem extends System{
	static init( priority = 90 ){ Fungi.ecs.addSystem(new TransformNodeSystem(), priority); }

	constructor(){ super(); }
	update(ecs){
		let ct,		// Transform
			cn,		// Transform Node
			pn, 	// Parent Transform Node
			e,		// Entity
			c,		// Child
			//v	= new Vec3(),
			ary	= ecs.queryEntities( QUERY_COM, thSort );


		for( e of ary ){
			ct	= e.com.Transform;
			cn	= e.com.TransformNode;

			if( ! (ct.isModified || (cn && cn.parentModified)) ) continue;

			//.............................................
			//If parent exists, calculate world values based on parent's world value and the child's local values.
			if( cn.parent != null ){
				pn = cn.parent.com.TransformNode;

				//SCALE
				pn.scale.mul( ct.scale, cn.scale );			// parent.scale * child.scale

				//ROTATION
				pn.rotation.mul( ct.rotation, cn.rotation );	// parent.rotation * child.rotation

				//POSITION
				// parent.position + ( parent.rotation * ( parent.scale * child.position ) )
				//Vec3.mul(pn.scale, ct.position, v);	// p.scale * c.position;
				//Vec3.transformQuat(v, pn.rotation, v).add(pn.position, cn.position);

				Vec3.mul(pn.scale, ct.position, cn.position);	// p.scale * c.position;
				Vec3.transformQuat(cn.position, pn.rotation, cn.position).add(pn.position);

				cn.parentModified	= false;
			}else{
			//.............................................
			//if root, Copy values to Node
				cn.position.copy( ct.position );
				cn.rotation.copy( ct.rotation );
				cn.scale.copy( ct.scale );
			}

			//.............................................
			//Mark children to force update
			if( cn.children.length != 0 ){
				for(c of cn.children) c.com.TransformNode.parentModified = true;
			}

			//.............................................
			ct.isModified = true; //Incase parent forced child to update, then mark child as modified for other systems to know.
		}//for
	}

}

//Compare function to sort entities based on the level of the hierarchy.
function thSort(a,b){
	//Any entity without TH thrown to the start of the list
	if(!a.com.TransformNode) return -1; 	
	if(!b.com.TransformNode) return 1;

	//Sort by Hierarachy Levels so parents are calculated before children
	let lvlA = a.com.TransformNode.level,
		lvlB = b.com.TransformNode.level;

	if(lvlA == lvlB)		return  0;	// A = B
	else if(lvlA < lvlB)	return -1;	// A < B
	else					return  1;	// A > B
}


export default TransformNodeSystem;