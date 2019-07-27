/**
 * @module fungi/engine/ecs/Node
 * @version 1.0.0
 * @author Pedro S. <sketchpunk@gmail.com>
 */
import App			from "../App.js";
import { Components, System }	from "../Ecs.js";
import Transform	from "../../maths/Transform.js";
import Mat4			from "../../maths/Mat4.js";
import Quat 		from "../../maths/Quat.js";
import Vec3 		from "../../maths/Vec3.js";

//#########################################################################

/** ECS Component to handle Transform Heirarchy of Entities */
class Node{
	/**
	* Create a Node Component
	*/
	constructor(){
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Position / Rotation / Scale

		/**
		 * A flag to tell systems that data has been modified and requires updating
		 * @public @type {boolean}
		 */
		this.isModified = true;

		/**
		 * Local space transform data
		 * @public @type {Transform}
		 */
		this.local = new Transform();

		/**
		 * World space transform data, calculated by NodeSystem Update based on Transform Hierachy
		 * @private @type {Transform}
		 */
		this.world = new Transform();

		/**
		 * Model matrix used in shaders. Calculated by NodeSystem based on world space transform data
		 * @private @type {Mat4}
		 */
		this.modelMatrix = new Mat4();


		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Heirachy

		/**
		 * Cache at what level of the hierachy the node exists. Used for Sorting in NodeSystem.
		 * @private @type {number}
		 */
		this.level = 0;

		/**
		 * Reference to the Entity Parent. May be null if there is no parent.
		 * @private @type {?Entity}
		 */
		this.parent = null;

		/**
		 * List to references of Entity Children
		 * @private @type {Entity[]}
		 */
		this.children = [];
	}

	////////////////////////////////////////////////////////////////////
	// SETTERS
	////////////////////////////////////////////////////////////////////
		/**
		 * Set local space position and sets modified to true
		 * @param {(number|Vec3)} x - X local position or Vec3 to set x,y,z
		 * @param {?number} y - Y Local position
		 * @param {?number} z - Z Local position
		 * @public @return {Node}
		 */
		setPos( x, y, z ){
			if( arguments.length == 1 ) this.local.pos.copy( x );
			else						this.local.pos.set( x, y, z );
			
			this.isModified = true;
			return this;
		}

		/**
		 * Add values to the local position and sets modified to true
		 * @param {(number|Vec3)} x - X local position or Vec3 to set x,y,z
		 * @param {?number} y - Y Local position
		 * @param {?number} z - Z Local position
		 * @public @return {Node}
		 */
		addPos( x, y, z ){
			if( arguments.length == 1 ) this.local.pos.add( x );
			else{
				this.local.pos.x += x;
				this.local.pos.y += y;
				this.local.pos.z += z;
			}
			this.isModified = true;
			return this;
		}

		/**
		 * Set rotation based on an Axis and angle in radians
		 * @param {Vec3} axis - Unit vector of an axis of rotation
		 * @param {number} ang - Angle in radians
		 * @public @return {Node}
		 */
		setRotAxis( axis, ang ){
			this.local.rot.setAxisAngle( axis, ang );
			this.isModified = true;
			return this;
		}

		/**
		 * Set rotation based on an Axis and angle in radians
		 * @param {Vec3} dir - Unit vector of the direction to look at.
		 * @param {?Vec3} up - Up vector to use, Vec3.UP will be used if left blank
		 * @public @return {Node}
		 */
		setRotLook( dir, up=null ){
			Quat.lookRotation( dir, up || Vec3.UP, this.local.rot );
			this.isModified = true;
			return this;
		}

		/**
		 * Copy a quaternion or Vec4 into rotation
		 * @param {(Array:Quat)} q - Quaterion or a Number[4]
		 * @public @return {this}
		 */
		setRot( q ){
			this.local.rot.copy( q );
			this.isModified = true;
			return this;
		}

		/**
		 * Sets local scale and sets modified to true
		 * @param {number} x - X local scale, if the only value passed in then it will scale all axises by X
		 * @param {?number} y - Y Local scale
		 * @param {?number} z - Z Local scale
		 * @public @return {Node}
		 */
		setScl( x, y, z ){
			if( Array.isArray(x) )									this.local.scl.copy( x );
			else if( arguments.length == 1 && typeof x == "number")	this.local.scl.set( x, x, x );
			else if( arguments.length == 3 )						this.local.scl.set( x, y, z ); 
			else { console.log("Unknown Scale Value"); return this; }
			
			this.isModified = true;
			return this;
		}

	////////////////////////////////////////////////////////////////////
	// Child Management
	////////////////////////////////////////////////////////////////////
		/**
		 * Create a Parent-Child relationship between two Entities
		 * @param {Entity} pe - Parent Entity
		 * @param {Entity} ce - Child Entity
		 * @public @return {Node}
		 */
		static addChild( pe, ce, updateLevels = true ){
			let pn = pe.Node;

			if( pn.children.indexOf( ce ) != -1){
				console.log("%s is already a child of %s", ce.info.name, pe.info.name);
				return Node;
			}

			//...............................................
			//if child already has a parent, remove itself
			let cn = ce.Node;
			if( cn.parent != null ) Node.removeChild( cn.parent, ce );

			//...............................................
			cn.parent	= pe;				//Set parent on the child
			cn.level	= pn.level + 1;		//Set the level value for the child
			pn.children.push( ce );			//Add child to parent's children list

			//...............................................
			//if child has its own children, update their level values
			if( updateLevels && cn.children.length > 0 ) updateChildLevel( cn );
			return Node;
		}

		add_child( ce, updateLevels = true ){
			let pe = App.ecs.entity_by_id( this.entityID );

			if( this.children.indexOf( ce ) != -1){
				console.log("%s is already a child of %s", ce.info.name, pe.info.name );
				return Node;
			}

			//...............................................
			//if child already has a parent, remove itself
			let cn = ce.Node;
			if( cn.parent != null ) Node.removeChild( cn.parent, ce );

			//...............................................
			cn.parent	= pe;				// Set parent on the child
			cn.level	= this.level + 1;	// Set the level value for the child
			this.children.push( ce );		// Add child to parent's children list

			//...............................................
			//if child has its own children, update their level values
			if( updateLevels && cn.children.length > 0 ) updateChildLevel( cn );
			return this;
		}

		/**
		 * Remove the Parent-Child relationship between two entities.
		 * @param {Entity} pe - Parent Entity
		 * @param {Entity} ce - Child Entity
		 * @public @return {Node}
		 */
		static removeChild( pe, ce ){
			var idx = pe.Node.children.indexOf( ce );

			if(idx == -1) console.log("%s is not a child of %s", ce.info.name, pe.info.name);
			else{
				//Update Child Data
				ce.Node.parent	= null;
				ce.Node.level	= 0;

				//Remove from parent
				pe.Node.children.splice( idx,1 );
			}

			return Node;
		}

	////////////////////////////////////////////////////////////////////
	// WORLD SPACE
	////////////////////////////////////////////////////////////////////
		/**
		 * Get direction of an Entity based on its World Rotation
		 * @param {Entity} e - Entity that you want to get direction for.
		 * @param {number} [dir=0] - Which direction you want, Forward:0, Left:1, Up:2
		 * @param {?Vec3} [out=null] - Pass in a Vec3, else one will be created.
		 * @public @return {Vec3}
		 */
		static getDir( e, dir=0, out=null ){
			let q = Node.getWorldRot( e );
			out = out || new Vec3();

			switch( dir ){
				case 0: Vec3.transformQuat( Vec3.FORWARD, q, out ); break; // Forward
				case 1: Vec3.transformQuat( Vec3.LEFT, q, out ); break; // Left
				case 2: Vec3.transformQuat( Vec3.UP, q, out ); break; // Up
			}
			return out;
		}

		//** Get direction based on the Node's World Model Matrix */
		static getMatrixDir( e, dir=0, out=null, scale=1 ){
			out = out || new Vec3();

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let i = 0, mx = e.Node.modelMatrix;
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

		/**
		 * Get the world rotation of an entity
		 * @param {Entity} e - Entity you want get the rotation of.
		 * @param {?Quat} [out=null] - Passin a Quaternion Reference, else a new one will be created.
		 * @public @return {Quat}
		 */
		static getWorldRot( e, out = null, incChild=true ){
			out = out || new Quat();

			if( !e.Node.parent ) return out.copy( e.Node.local.rot );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Get the heirarchy nodes
			let n 		= e.Node,
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


		static getWorldTransform( e, out = null, incChild=true ){
			out = out || new Transform();

			if( !e.Node.parent ) return ( incChild )? out.copy( e.Node.local ) : out.reset();

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Get the heirarchy nodes
			let n 		= e.Node,
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
			out.copy( tree[ i ].local );						// Copy in the Root Parent
			
			for( i--; i > -1; i-- ) out.add( tree[ i ].local );	// Add Up All Transforms from root to child.

			return out;
		}

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


		static updateWorldTransform( e, incMatrix=true ){
			let n = e.Node;

			// if parent has been modified, then child should also be concidered modified.
			if( n.parent && n.parent.Node.isModified ) n.isModified = true;
			if( !n.isModified ) return this;

			// if parent exists, add parent's world transform to the child's local transform
			if( n.parent )	Transform.add( n.parent.Node.world, n.local, n.world );
			else			n.world.copy( n.local );

			// Create Model Matrix for Shaders
			if( incMatrix ) Mat4.fromQuaternionTranslationScale( cn.world.rot, cn.world.pos, cn.world.scl, cn.modelMatrix );

			return this;
		}

} Components( Node );


//#########################################################################
/**
* ECS System that handles updating Transform Hierachy data along with create ModelMatrix based on World Space Transform
* @extends System
*/
class NodeSystem extends System{
	/**
	 * Setup the system automaticly to an ECS reference
	 * @param {Ecs} ecs - Instance of an Ecs object
	 * @param {number} [priority=] - What the priority the system has compared to others during update.
	 * @param {number} [priority2=] - Priority for the second system that handles cleanup for Nodes.
	 */
	static init( ecs, priority = 800, priority2 = 1000 ){ 
		ecs.sys_add( new NodeSystem(), priority );
		ecs.sys_add( new NodeCleanupSystem(), priority2 );
	}

	constructor(){ super(); }

	/**
	* System Update
	* @param {Ecs} ecs
	*/
	run( ecs ){
		let cn, ary = ecs.query_comp( "Node", thSort, "node_levels" );

		for( cn of ary ){
			// if parent has been modified, then child should also be concidered modified.
			if( cn.parent !== null && cn.parent.Node.isModified ) cn.isModified = true;
			if( !cn.isModified ) continue;

			// if parent exists, add parent's world transform to the child's local transform
			if( cn.parent !== null )	Transform.add( cn.parent.Node.world, cn.local, cn.world );
			else						cn.world.copy( cn.local );

			// Create Model Matrix for Shaders
			Mat4.fromQuaternionTranslationScale( cn.world.rot, cn.world.pos, cn.world.scl, cn.modelMatrix );
		}
	}
}


//#########################################################################
/**
* ECS System that handles updating Transform Hierachy data along with create ModelMatrix based on World Space Transform
* @extends System
*/
class NodeCleanupSystem extends System{
	run(ecs){
		let n, ary = ecs.query_comp( "Node" );
		for( n of ary ) if( n.isModified ) n.isModified = false;
	}
}


//#########################################################################
// HELPER

/**
 * Compare function to sort entities based on the level of the hierarchy.
 * @param {Entity} a
 * @param {Entity} b
 * @return {number}
 * @private
 */
function thSort( a, b ){
	//Sort by Hierarachy Levels so parents are calculated before children
	if(a.level == b.level)		return  0;	// A = B
	else if(a.level < b.level)	return -1;	// A < B
	else						return  1;	// A > B
}

/**
 * Update the level of all the child nodes of node
 * @param {node} n
 * @private
 */
function updateChildLevel( n ){
	let c, cn;
	for(c of n.children){
		cn			= c.Node;
		cn.level	= n.level + 1;
		if( cn.children.length > 0 ) updateChildLevel( cn );
	}
}


//#########################################################################
export default Node;
export { NodeSystem, NodeCleanupSystem };