import { System } from "../Ecs.js";
import Mat4 from "../maths/Mat4.js";

const QUERY_COM = ["Transform"];

class TransformHierarchySystem extends System{
	constructor(){ super(); }

	update(ecs){
		let t,		// Transform
			h,		// Hierarchy
			e,		// Entity
			c,		// Child
			isMod,	// isModified
			ary = ecs.queryEntities( QUERY_COM, thSort );

		for( e of ary ){
			t		= e.com.Transform;
			h		= e.com.Hierarchy;
			isMod 	= (t.isModified || (h && h.parentModified));

			//...........................................
			if( isMod ){
				//Handle Local Transform Matrix
				t.isModified = false;
				Mat4.fromQuaternionTranslationScale(t.modelMatrix, t.rotation, t.position, t.scale);
			
				// Handle Hierarchy
				if( h ){
					//If parent exists and either Local OR Parent changed, calc world matrix.
					if( h.parent != null ){
						Mat4.mult( t.modelMatrix, h.parent.com.Transform.modelMatrix, t.modelMatrix );
						h.parentModified	= false;
					}

					//Mark children to force update
					if( h.children.length != 0 ){
						for(c of h.children) c.com.Hierarchy.parentModified = true;
					}
				}

				// Handle camera
				if( e.com.Camera ) Mat4.invert(e.com.Camera.invertedWorldMatrix, t.modelMatrix);
			}
		}//for
	}

}

//Compare function to sort entities based on the level of the hierarchy.
function thSort(a,b){
	//Any entity without TH thrown to the start of the list
	if(!a.com.Hierarchy) return -1; 	
	if(!b.com.Hierarchy) return 1;

	//Sort by Hierarachy Levels so parents are calculated before children
	let lvlA = a.com.Hierarchy.level,
		lvlB = b.com.Hierarchy.level;

	if(lvlA == lvlB)		return  0;	// A = B
	else if(lvlA < lvlB)	return -1;	// A < B
	else					return  1;	// A > B
}


export default TransformHierarchySystem;