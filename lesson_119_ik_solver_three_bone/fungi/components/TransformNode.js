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

			pn.scale.mul( ct.scale, cn.scale );				// parent.scale * child.scale
			pn.rotation.mul( ct.rotation, cn.rotation );	// parent.rotation * child.rotation

			//Calc Position
			// parent.position + ( parent.rotation * ( parent.scale * child.position ) )
			Vec3.mul(pn.scale, ct.position, cn.position);	// p.scale * c.position;
			Vec3.transformQuat(cn.position, pn.rotation, cn.position).add(pn.position);
		}
	}

	static transform(lPosition, lRotation, lScale, wPosition, wRotation, wScale, pPosition=null, pRotation=null, pScale=null){
		if(pPosition == null){
			wPosition.copy(lPosition);
			wRotation.copy(lRotation);
			wScale.copy(lScale);
		}else{
			pScale.mul( lScale, wScale );
			pRotation.mul( lRotation, wRotation );

			// parent.position + ( parent.rotation * ( parent.scale * child.position ) )
			Vec3.mul( pScale, lPosition, wPosition ); // p.scale * c.position;
			Vec3.transformQuat(wPosition, pRotation, wPosition).add( pPosition );
		}
	}

	static getWorldTransform(e, wPos, wRot, wScale){
		var ary	= [e.com.Transform],
			t	= e.com.TransformNode;

		//Get the parent tree of the entity
		while(t.parent != null){
			ary.push( t.parent.com.Transform );
			t = t.parent.com.TransformNode;
		}

		let last 	= ary.length - 1,
			tPos	= new Vec3(),
			tRot 	= new Quat(),
			tScale 	= new Vec3();

		wPos.copy( ary[last].position );
		wRot.copy( ary[last].rotation );
		wScale.copy( ary[last].scale );

		for(let i= last-1; i >= 0; i--){
			t = ary[i];
			TransformNode.transform(t.position, t.rotation, t.scale, tPos, tRot, tScale, wPos, wRot, wScale);

			wPos.copy( tPos );
			wRot.copy( tRot );
			wScale.copy( tScale);
		}
	}

	static getWorldPosition(e, out){
		var ary	= [e.com.Transform],
			t	= e.com.TransformNode;

		//.............................................
		//Get the parent tree of the entity
		while(t.parent != null){
			ary.push( t.parent.com.Transform );
			t = t.parent.com.TransformNode;
		}

		//.............................................
		let last 	= ary.length - 1,
			pos  	= new Vec3(),
			pPos	= new Vec3( ary[last].position ),
			pRot 	= new Quat( ary[last].rotation ),
			pScale 	= new Vec3( ary[last].scale );

		for(let i= last-1; i >= 0; i--){
			t = ary[i];

			// parent.position + ( parent.rotation * ( parent.scale * child.position ) )
			Vec3.mul( pScale, t.position, pos ); // p.scale * c.position;
			pPos.add( Vec3.transformQuat(pos, pRot, pos) );

			if(i != 0){ //if last item, dont bother with the rest.
				pScale.mul( t.scale );
				pRot.mul( t.rotation );
			}
		}

		//.............................................
		out = out || new Vec3();
		return out.copy( pPos );
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