/**
 * @module fungi/engine/ecs/Node
 * @version 1.0.0
 * @author Pedro S. <sketchpunk@gmail.com>
 */

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

		/**
		 * Get the world rotation of an entity
		 * @param {Entity} e - Entity you want get the rotation of.
		 * @param {?Quat} [out=null] - Passin a Quaternion Reference, else a new one will be created.
		 * @public @return {Quat}
		 */
		static getWorldRot( e, out = null ){
			out = out || new Quat();

			if( !e.Node.parent ) return out.copy( e.Node.local.rot );

			console.log( "TODO - Need to implement Node.getWorldRot" );

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

		/*
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
		*/
} Components( Node );


//#########################################################################
const QUERY_COM = [ "Node" ];


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
		ecs.addSystem( new NodeSystem(), priority );
		ecs.addSystem( new NodeCleanupSystem(), priority2 );
	}

	constructor(){ super(); }

	/**
	* System Update
	* @param {Ecs} ecs
	*/
	update( ecs ){
		let e,		// Entity
			cn,		// Child Node ( only if parent node exists )
			ary	= ecs.queryEntities( QUERY_COM, thSort );

		for( e of ary ){
			cn = e.Node;


			// if parent has been modified, then child should also be concidered modified.
			if( cn.parent !== null && cn.parent.Node.isModified ) cn.isModified = true;
			if( !cn.isModified ) continue;

			// if parent exists, add parent's world transform to the child's local transform
			if( cn.parent !== null )	Transform.add( cn.parent.Node.world, cn.local, cn.world );
			else						cn.world.copy( cn.local );

			// Create Model Matrix for Shaders
			Mat4.fromQuaternionTranslationScale( cn.world.rot, cn.world.pos, cn.world.scl, cn.modelMatrix );

			//.............................................
			//cn.isModified = true; // To simplify things, this should be done in a Sub System after rendering.
		}
	}
}


//#########################################################################
/**
* ECS System that handles updating Transform Hierachy data along with create ModelMatrix based on World Space Transform
* @extends System
*/
class NodeCleanupSystem extends System{
	/**
	* System Update
	* @param {Ecs} ecs
	*/
	update(ecs){
		let e, ary = ecs.queryEntities( QUERY_COM, thSort );
		for( e of ary ) if( e.Node.isModified ) e.Node.isModified = false;
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
	let lvlA = a.Node.level,
		lvlB = b.Node.level;

	if(lvlA == lvlB)		return  0;	// A = B
	else if(lvlA < lvlB)	return -1;	// A < B
	else					return  1;	// A > B
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
		if(cn.children.length > 0) updateChildLevel( cn );
	}
}


//#########################################################################
export default Node;
export { NodeSystem, NodeCleanupSystem };