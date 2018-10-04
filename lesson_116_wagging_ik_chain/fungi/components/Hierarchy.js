import { Vec3, Quat }	from "../Maths.js";
import { Components }	from "../Ecs.js";

class Hierarchy{
	constructor(){
		this.level			= 0;			// What level in the Hierachy
		this.parent			= null;			// Entity reference of the parent
		this.parentModified	= false;		// When a parent's Local/World Matrix updates, children are marked to update their world matrix
		this.children		= [];			// List of Children Entities
	}


	////////////////////////////////////////////////////////////////////
	// Child Management
	////////////////////////////////////////////////////////////////////
		static addChild(ep, ec){
			let ph = ep.com.Hierarchy;

			if( ph.children.indexOf(ec) != -1){
				console.log("%s is already a child of %s", ec.name, ep.name);
				return Hierarchy;
			}

			//...............................................
			//if child already has a parent, remove itself
			let ch = ec.com.Hierarchy;
			if(ch.parent != null) Hierarchy.removeChild( ch.parent, ec );

			//...............................................
			ch.parent	= ep;				//Set parent on the child
			ch.level	= ph.level + 1;		//Set the level value for the child
			ph.children.push( ec );			//Add child to parent's children list

			//...............................................
			//if child has its own children, update their level values
			if(ch.children.length > 0) updateChildLevel( ch );

			return Hierarchy;
		}

		static removeChild(ep, ec){
			var idx = ep.com.Hierarchy.children.indexOf(ec);

			if(idx == -1) console.log("%s is not a child of %s", ec.name, ep.name);
			else{
				//Update Child Data
				ec.com.Hierarchy.parent	= null;
				ec.com.Hierarchy.level		= 0;

				//Remove from parent
				ep.com.Hierarchy.children.splice(idx,1);
			}

			return Hierarchy;
		}


	////////////////////////////////////////////////////////////////////
	// World Space Data
	////////////////////////////////////////////////////////////////////
		static getWorldPosition( e ){
		}

		static getWorldRotation( e, out = null ){
			//.................................
			//Check if there is a parent, if not just pass the local rotation
			out = out || new Quat();
			let p = e.com.Hierarchy.parent;
			if(p == null) return out.copy( e.com.Transform.rotation );
			
			//.................................
			//Move Up the stack to get all the rotations
			let stack 	= new Array();
			stack.push( e.com.Transform.rotation );

			while(p != null){
				stack.push( p.com.Transform.rotation );
				p = p.com.Hierarchy.parent;
			}

			//multiple all the quaternions from root to branch to get world rotation.
			let i = stack.length - 1;
			out.copy( stack[i] ); //Copy last item (root) as a starting point

			for(i = i-1; i >= 0; i--) Quat.mul(out, out, stack[i]);

			return out;
		}
} Components(Hierarchy);


//#######################################################################
//recursive function to update the heirarachy levels in children
function updateChildLevel(h){
	let c, th;
	for(c of h.children){
		th			= c.com.Hierarchy;
		th.level	= h.level + 1;
		if(th.children.length > 0) updateChildLevel( th );
	}
}


export default Hierarchy;