import { Vec3, Quat }	from "../Maths.js";
import { Components }	from "../Ecs.js";

class TransformNode{
	constructor(){
		this.level			= 0;			// What level in the Hierachy
		this.parent			= null;			// Entity reference of the parent
		this.parentModified	= false;		// When a parent's Local/World Matrix updates, children are marked to update their world matrix
		this.children		= [];			// List of Children Entities

		this.scale			= new Vec3();	// Accumulated Transform Values, World Space
		this.position		= new Vec3();
		this.rotation		= new Quat();
	}


	////////////////////////////////////////////////////////////////////
	// Child Management
	////////////////////////////////////////////////////////////////////
		static addChild(ep, ec){
			let ph = ep.com.TransformNode;

			if( ph.children.indexOf(ec) != -1){
				console.log("%s is already a child of %s", ec.name, ep.name);
				return Hierarchy;
			}

			//...............................................
			//if child already has a parent, remove itself
			let ch = ec.com.TransformNode;
			if(ch.parent != null) TransformNode.removeChild( ch.parent, ec );

			//...............................................
			ch.parent	= ep;				//Set parent on the child
			ch.level	= ph.level + 1;		//Set the level value for the child
			ph.children.push( ec );			//Add child to parent's children list

			//...............................................
			//if child has its own children, update their level values
			if(ch.children.length > 0) updateChildLevel( ch );

			return TransformNode;
		}

		static removeChild(ep, ec){
			var idx = ep.com.TransformNode.children.indexOf(ec);

			if(idx == -1) console.log("%s is not a child of %s", ec.name, ep.name);
			else{
				//Update Child Data
				ec.com.TransformNode.parent	= null;
				ec.com.TransformNode.level		= 0;

				//Remove from parent
				ep.com.TransformNode.children.splice(idx,1);
			}

			return TransformNode;
		}

	////////////////////////////////////////////////////////////////////
	//
	////////////////////////////////////////////////////////////////////
	static updateNode(e){
		let cn = e.com.TransformNode,
			ct = e.com.Transform;

		if(cn.parent == null){
			cn.position.copy( ct.position );
			cn.rotation.copy( ct.rotation );
			cn.scale.copy( ct.scale );
		}else{
			let pn = cn.parent.com.TransformNode;

			pn.scale.mul( ct.scale, cn.scale );			// parent.scale * child.scale
			pn.rotation.mul( ct.rotation, cn.rotation );	// parent.rotation * child.rotation

			//Calc Position
			// parent.position + ( parent.rotation * ( parent.scale * child.position ) )
			let v = Vec3.mul(pn.scale, ct.position);	// p.scale * c.position;
			Vec3.transformQuat(v, pn.rotation, v).add(pn.position, cn.position);
		}
	}
} Components(TransformNode);


//#######################################################################
//recursive function to update the heirarachy levels in children
function updateChildLevel(h){
	let c, th;
	for(c of h.children){
		th			= c.com.TransformNode;
		th.level	= h.level + 1;
		if(th.children.length > 0) updateChildLevel( th );
	}
}


export default TransformNode;