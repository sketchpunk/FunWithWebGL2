import { Vec3, Quat, Mat4, Transform } from "../../maths/Maths.js";
import App from "../../App.js";


//#########################################################################

/* ECS Component to handle Transform Heirarchy of Entities */
class Node{
	static init( priority = 800, priority2 = 1000 ){
		App.Components.reg( this );
		App.ecs.sys_add( NodeSys, priority );
		App.ecs.sys_add( NodeCleanupSys, priority2 );
	}

	constructor(){
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Position / Rotation / Scale
		this.updated		= true;
		this.local			= new Transform();	// Local space transform data
		this.world			= new Transform();	// World space transform data, calculated by NodeSystem Update based on Transform Hierachy
		this.model_matrix	= new Mat4();		// Model matrix used in shaders. Calculated by NodeSystem based on world space transform data

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Heirachy
		this.level			= 0; // Cache at what level of the hierachy the node exists. Used for Sorting in NodeSystem.
		this.parent			= null; // Reference to the Entity Parent. May be null if there is no parent.
		this.children		= []; // List to references of Entity Children
	}

	////////////////////////////////////////////////////////////////////
	// SETTERS
	////////////////////////////////////////////////////////////////////
		set_pos( x, y, z ){
			if( arguments.length == 1 ) this.local.pos.copy( x );
			else						this.local.pos.set( x, y, z );
			this.updated = true;
			return this;
		}

		add_pos( x, y, z ){
			if( arguments.length == 1 ) this.local.pos.add( x );
			else{
				this.local.pos.x += x;
				this.local.pos.y += y;
				this.local.pos.z += z;
			}
			this.updated = true;
			return this;
		}

		//----------------------------------

		set_rot_axis( axis, ang ){ this.local.rot.from_axis_angle( axis, ang ); this.updated = true; return this; }
		set_rot_look( dir, up=null ){ Quat.lookRotation( dir, up || Vec3.UP, this.local.rot ); this.updated = true; return this; }
		set_rot( q ){ this.local.rot.copy( q ); this.updated = true; return this; }
		rot_by( deg, axis="y" ){ this.local.rot.rot_deg( deg, axis ); this.updated = true; return this; }

		//----------------------------------

		set_scl( x, y, z ){
			if( Array.isArray(x) || ArrayBuffer.isView(x) )			this.local.scl.copy( x );
			else if( arguments.length == 1 && typeof x == "number")	this.local.scl.set( x, x, x );
			else if( arguments.length == 3 )						this.local.scl.set( x, y, z ); 
			else { console.log("Unknown Scale Value"); return this; }
			
			this.updated = true;
			return this;
		}

	////////////////////////////////////////////////////////////////////
	// Child Management
	////////////////////////////////////////////////////////////////////

		add_child( ce, update_lvl=true ){
			let pe = App.get_e( this.entity_id );

			if( this.children.indexOf( ce ) != -1){
				console.log("%s is already a child of %s", ce.info.name, pe.info.name );
				return Node;
			}

			//...............................................
			//if child already has a parent, remove itself
			let cn = ce.Node;
			if( cn.parent != null ) Node.removeChild( cn.parent, ce ); // TODO FIX

			//...............................................
			cn.parent	= pe;				// Set parent on the child
			cn.level	= this.level + 1;	// Set the level value for the child
			this.children.push( ce );		// Add child to parent's children list

			//...............................................
			//if child has its own children, update their level values
			if( update_lvl && cn.children.length > 0 ) update_child_level( cn );
			return this;
		}

		rm_child( ce ){
			var idx = this.children.indexOf( ce );

			if(idx == -1) console.log("%s is not a child of %s", ce.info.name, App.get_e( this.entity_id ).info.name);
			else{
				//Update Child Data
				ce.Node.parent	= null;
				ce.Node.level	= 0;

				//Remove from parent
				this.children.splice( idx,1 );
			}

			return this;
		}

	////////////////////////////////////////////////////////////////////
	// WORLD SPACE
	////////////////////////////////////////////////////////////////////
		// Get direction of an Entity based on its World Rotation
		/*
		get_dir( e, dir=0, out=null ){
			let q = this.get_world_rot( e );
			out = out || new Vec3();

			switch( dir ){
				case 0: Vec3.transform_quat( Vec3.FORWARD, q, out ); break; // Forward
				case 1: Vec3.transform_quat( Vec3.LEFT, q, out ); break; // Left
				case 2: Vec3.transform_quat( Vec3.UP, q, out ); break; // Up
			}
			return out;
		}
		*/

		
		// Get direction based on the Node's World Model Matrix
		get_matrix_dir( dir=0, out=null, scale=1 ){
			out = out || new Vec3();

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let i = 0, mx = this.model_matrix;
			switch( dir ){
				case 0: i = 8; break;	// Forward : 8, 9, 10
				case 1: i = 0; break;	// Left : 0, 1, 2
				case 2: i = 4; break;	// Up : 4, 5, 6
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let x	= mx[ i ],
				y	= mx[ i+1 ],
				z	= mx[ i+2 ],
				len	= 1 / Math.sqrt( x*x + y*y + z*z );

			out[0] = x * len * scale;
			out[1] = y * len * scale;
			out[2] = z * len * scale;
			return out;
		}

		get_world_transform( tf=null ){
			tf = tf || new Transform();
			tf.copy( this.local );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( this.parent != null ){ 
				// Parents Exist, loop till reaching the root
				let n = this;
				while( n.parent != null ){
					n = n.parent.Node;
					tf.add_rev( n.local );
				}
			}
			return tf;
		}

		/*
		get_world_rot( out = null, incChild=true ){
			out = out || new Quat();

			if( !this.parent ) return out.copy( this.local.rot );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Get the heirarchy nodes
			let n 		= this,
				tree 	= [ ];

			if( incChild ) tree.push( n ); // Incase we do not what to add the requested entity to the world transform.

			while( n.parent != null ){
				tree.push( n.parent.Node );
				n = n.parent.Node;
			}

			// Nothing
			if( tree.length == 0 ) return out.reset();

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let i = tree.length - 1;
			out.copy( tree[ i ].local.rot );						// Copy in the Root Parent
			
			for( i--; i > -1; i-- ) out.mul( tree[ i ].local.rot );	// Add Up All Transforms from root to child.

			return out;
		}

		get_world_transform( out = null, inc_child=true, init_tran=null ){
			out = out || new Transform();

			if( init_tran ) out.copy( init_tran );
			else 			out.clear();

			if( !this.parent ){
				return ( inc_child )? out.add( this.local ) : out;
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Get the heirarchy nodes
			let n 		= this,
				tree 	= [ ];

			if( inc_child ) tree.push( n ); // Incase we do not what to add the requested entity to the world transform.

			while( n.parent != null ){
				tree.push( n.parent.Node );
				n = n.parent.Node;
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let i = tree.length - 1;
			out.add( tree[ i ].local );						// Copy in the Root Parent
			
			for( i--; i > -1; i-- ) out.add( tree[ i ].local );	// Add Up All Transforms from root to child.

			return out;
		}

		get_world_parent_child( p, c ){
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Get the heirarchy nodes
			let n = this, tree = [ ];

			while( n.parent != null ){
				tree.push( n.parent.Node );
				n = n.parent.Node;
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let i = tree.length - 1;
			p.copy( tree[ i ].local );	// Copy in the Root Parent
			
			for( i--; i > -1; i-- ) p.add( tree[ i ].local ); // Add Up All Transforms from root to parent.

			c.from_add( p, this.local );
		}

		static updateWorldTransform( e, incMatrix=true ){
			let n = e.Node;

			// if parent has been modified, then child should also be concidered modified.
			if( n.parent && n.parent.Node.updated ) n.updated = true;
			if( !n.updated ) return this;

			// if parent exists, add parent's world transform to the child's local transform
			if( n.parent )	Transform.add( n.parent.Node.world, n.local, n.world );
			else			n.world.copy( n.local );

			// Create Model Matrix for Shaders
			if( incMatrix ) Mat4.fromQuaternionTranslationScale( cn.world.rot, cn.world.pos, cn.world.scl, cn.modelMatrix );

			return this;
		}
		*/

}


//#########################################################################
// SYSTEMS

function NodeSys( ecs ){
	let cn, ary = ecs.query_comp( "Node", node_lvl_sort );

	for( cn of ary ){
		// if parent has been modified, then child should also be concidered modified.
		if( cn.parent !== null && cn.parent.Node.updated ) cn.updated = true;
		if( !cn.updated ) continue;

		// if parent exists, add parent's world transform to the child's local transform
		if( cn.parent !== null )	cn.world.from_add( cn.parent.Node.world, cn.local ); //Transform.add( cn.parent.Node.world, cn.local, cn.world );
		else						cn.world.copy( cn.local );

		// Create Model Matrix for Shaders
		cn.model_matrix.from_quat_tran_scale( cn.world.rot, cn.world.pos, cn.world.scl );
	}	
}

function NodeCleanupSys( ecs ){
	let n, ary = ecs.query_comp( "Node" );
	for( n of ary ) if( n.updated ) n.updated = false;
}


//#########################################################################
// HELPER

function node_lvl_sort( a, b ){
	//Sort by Hierarachy Levels so parents are calculated before children
	if(a.level == b.level)		return  0;	// A = B
	else if(a.level < b.level)	return -1;	// A < B
	else						return  1;	// A > B
}

// Update the level of all the child nodes of node
function update_child_level( n ){
	let c, cn;
	for(c of n.children){
		cn			= c.Node;
		cn.level	= n.level + 1;
		if( cn.children.length > 0 ) update_child_level( cn );
	}
}


//#########################################################################
export default Node;