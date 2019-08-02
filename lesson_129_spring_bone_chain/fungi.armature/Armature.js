import App			from "../fungi/engine/App.js";
import Transform	from "../fungi/maths/Transform.js";
import DualQuat		from "../fungi/maths/DualQuat.js";
import { Entity, Components, System } from "../fungi/engine/Ecs.js";


//#################################################################
/** Single Bone data struct */
class Bone{
	constructor( len=1 ){
		this.arm_e_ref		= null;
		this.order			= 0;				// Bone Order, Used to identify bone to vertices in shaders
		this.length			= len;				// Length of the Bone (Going UP)
		this.bind 			= new Transform();	// Default Local Transform For Bone, Allows to reset bones back to initial state.

		//...................................
		// Bind Pose is the inverted Hierachy Transform of the bone. Its used to "subtract"
		// an updated Transform to get the difference from the initial state. The Difference
		// is the Offset. That is the actual amount of rotation / translation we need to do.
		this.dqBindPose		= new DualQuat();	// Initial Local-World Space
		this.dqOffset		= new DualQuat();	// The Local-World Space difference from BindPose
	}

	static updateOffset( e ){
		let dq = new DualQuat();
		dq.set( e.Node.world.rot, e.Node.world.pos );
		DualQuat.mul( dq, e.Bone.dqBindPose, e.Bone.dqOffset ); // offset = world * bindPose
	}
} Components(Bone);


//#################################################################
/** This component is to help handle a collection of bones. */
class Armature{
	constructor(){
		this.bones			= new Array();	// Main Bones Array : Ordered by Order Number
		this.names			= {};

		this.isModified		= true;
		this.isActive		= true;			// Disable the Rendering of Armature

		this.flatOffset		= null;			// Flatten Bone DualQuat for Shaders
		this.flatScale		= null;			// Flatten Bone
	}

	///////////////////////////////////////////////////////////
	// INITIALIZERS
	///////////////////////////////////////////////////////////
		static $( e ){
			if( e instanceof Entity && !e.Armature ) Entity.com_fromName( e, "Armature" );
			return e;
		}

		static finalize( e ){
			let arm = ( e instanceof Armature )? e : e.Armature;

			// Sort it by order
			// This is important when flattening the data for shader use
			arm.bones.sort( fSort_bone_order );

			// Create Bind pose data for each bone in the armature
			Armature.bindPose( e );

			// Create Flat Data array based on bone count.
			// NOTE: flatScale must be 4, not 3, because UBO's require 16 byte blocks
			// So a vec3 array has to be a vec4 array
			arm.flatOffset 	= new Float32Array( arm.bones.length * 8 );
			arm.flatScale	= new Float32Array( arm.bones.length * 4 );

			// Create a Lookup map between Bone Names and Their Array Index.
			for( let i=0; i < arm.bones.length; i++ ){
				arm.names[ arm.bones[i].info.name ] = i;
			}

			return e;
		}


	///////////////////////////////////////////////////////////
	// BONES
	///////////////////////////////////////////////////////////
		static addBone( arm, name, len = 1, pe = null, order = null ){
			let e = App.ecs.entity( name, [ "Node", "Bone"] ); 	// Make it easier to create new bones
			e.Bone.length	= len;
			e.Bone.order	= ( order == null )? arm.bones.length : order;

			if( pe ){
				App.node.addChild( pe, e );
				e.Node.local.pos.y = pe.Bone.length; // Move start of bone to the end of the parent's
			}

			arm.bones.push( e );
			return e;
		}

		static getBone( arm, name ){
			if( arm.Armature ) arm = arm.Armature; // An entity weas passed in.

			let b;
			for(b of arm.bones){
				if( b.info.name == name ) return b;
			}
			return null;
		}

		add_bone( name, len = 1, pe = null, order = null ){
			let e = App.ecs.entity( name, [ "Node", "Bone" ] ); 	// Make it easier to create new bones
			e.Bone.length		= len;
			e.Bone.order		= ( order == null )? this.bones.length : order;
			e.Bone.arm_e_ref	= App.ecs.entity_by_id( this.entityID );

			//If not parent bone, parent to the mesh entity.
			if( !pe ) pe = e.Bone.arm_e_ref;

			if( pe ){
				pe.Node.add_child( e );
				if(pe.Bone) e.Node.local.pos.y = pe.Bone.length; // Move start of bone to the end of the parent's
			}

			this.bones.push( e );
			return e;
		}

		get_bone( bName ){ return this.bones[ this.names[ bName ] ]; }


		getParentPath( bName, incChild=true ){
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Get the heirarchy nodes
			let e 		= this.bones[ this.names[bName] ],
				tree 	= [ ];

			if( incChild ) tree.push( e.Bone.order ); // Incase we do not what to add the requested entity to the world transform.

			while( e.Node.parent != null ){
				tree.push( e.Node.parent.Bone.order );
				e = e.Node.parent;
			}

			return tree;
		}

		set_rot_by_idx( i, q ){
			this.bones[ i ].Node.local.rot.copy( q );
			this.bones[ i ].Node.isModified = true;
			return this;
		}


	///////////////////////////////////////////////////////////
	// POSE DATA
	///////////////////////////////////////////////////////////
		static bindPose( e ){
			let arm		= ( e instanceof Armature )? e : e.Armature,
				ary 	= arm.bones.slice( 0 ).sort( fSort_bone_lvl ),
				dqWorld	= new DualQuat(),
				eb; 	// Bone Entity

			for( eb of ary ){
				//.................................
				// Update world space transform then save result as bind pose.
				App.node.updateWorldTransform( eb, false );
				eb.Bone.bind.copy( eb.Node.local );	// Make a Copy as starting point to reset bones

				//.................................
				// Bind Pose is the initial Hierarchy transform of each bone, inverted.
				dqWorld.set( eb.Node.world.rot, eb.Node.world.pos );
				dqWorld.invert( eb.Bone.dqBindPose );
			}
		}

		static flattenData( e ){
			let i, ii, iii, b, n, 
				arm = e.Armature,
				off = arm.flatOffset,
				sca = arm.flatScale;

			for(i=0; i < arm.bones.length; i++){
				b	= arm.bones[i].Bone;
				ii	= i * 8;
				iii	= i * 4;

				off[ii+0]	= b.dqOffset[0];
				off[ii+1]	= b.dqOffset[1];
				off[ii+2]	= b.dqOffset[2];
				off[ii+3]	= b.dqOffset[3];
				off[ii+4]	= b.dqOffset[4];
				off[ii+5]	= b.dqOffset[5];
				off[ii+6]	= b.dqOffset[6];
				off[ii+7]	= b.dqOffset[7];

				n = arm.bones[i].Node.world;
				sca[iii+0]	= n.scl[0];
				sca[iii+1]	= n.scl[1];
				sca[iii+2]	= n.scl[2];
				sca[iii+3]	= 0; //WARNING, This is because of UBO Array Requirements, Vec3 is treated as Vec4
			}
			return this;
		}


	///////////////////////////////////////////////////////////
	// MISC
	///////////////////////////////////////////////////////////
	
		// Serialize the Bone Data
		static serialize( arm, incScale = false ){
			let bLen 	= arm.bones.length,
				out		= new Array( bLen ),
				i, e, bi;

			for( i=0; i < bLen; i++ ){
				e	= arm.bones[ i ];
				bi	= e.Bone.bind;

				out[ i ] = {
					name	: e.info.name,
					lvl		: e.Node.level,
					len		: e.Bone.length,
					idx		: e.Bone.order,
					p_idx 	: (e.Node.parent)? e.Node.parent.Bone.order : null,
					pos		: [ bi.pos[0], bi.pos[1], bi.pos[2] ],
					rot		: [ bi.rot[0], bi.rot[1], bi.rot[2], bi.rot[3] ],
				};

				if( incScale ) out[ i ].scl = [ bi.scl[0], bi.scl[1], bi.scl[2] ];
			}
			return out;
		}
} Components( Armature );
/*
static updateWorld( e ){
	let p = e.Node.parent;

	//if( p && p.Node.isModified ) e.Node.isModified = true;
	if( (p && p.Node.isModified) || e.Node.isModified ){
		if( p ){
			Transform.add( p.Node.world, e.Node.local, e.Node.world );
			
			// Might not need this, But if parent is modified, BUT this node has not, 
			// this node's children will need to be notified that grandparent node changed.
			e.Node.isModified = true;	
		}else{
			e.Node.world.copy( e.Node.local );
		}

		// Update Model matrix since its used in the shader for Local to World Space transformation
		Mat4.fromQuaternionTranslationScale( 
			e.Node.world.rot, 
			e.Node.world.pos, 
			e.Node.world.scl, 
			e.Node.modelMatrix
		);
	}

	return Node;
}
*/


//#################################################################
// Run After TransformSystem

/** After TransformSystem, BoneSystem can then turn all the World Transform into world Dual Quaternions. */
class BoneSystem extends System{
	run( ecs ){
		let ary	= ecs.query_comp( "Bone" );
		if( ary == null ) return; // No Bones Loaded, Exit Early
		
		let e, b, dq = new DualQuat();
			
		for( b of ary ){
			e = ecs.entities[ b.entityID ];

			if( e.Node.isModified ){
				dq.set( e.Node.world.rot, e.Node.world.pos );
				DualQuat.mul( dq, e.Bone.dqBindPose, e.Bone.dqOffset );
			}
		}
	}
}

/** System handles flattening all the DualQuat bone data */
class ArmatureSystem extends System{
	static init( ecs, priority = 801 ){
		ecs.sys_add( new BoneSystem(), priority );
		ecs.sys_add( new ArmatureSystem(), priority+1 ); //Armature needs to run after Bones are Updated.		
		ecs.sys_add( new ArmatureCleanupSystem(), 1000 );
	}

	run( ecs ){
		let a, ary = ecs.query_comp( "Armature" );
		if( ary == null ) return; // No Bones Loaded, Exit Early

		for( a of ary ) if( a.isModified ) Armature.flattenData( ecs.entities[ a.entityID ] );
	}
}

/** System to handle cleanup like setting isModified to false */
class ArmatureCleanupSystem extends System{
	run( ecs ){
		let a, ary = ecs.query_comp( "Armature" );
		if( ary == null ) return; // No Bones Loaded, Exit Early

		for( a of ary ) if( a.isModified ) a.isModified = false;
	}
}


//#################################################################

/** Sort Bone Array by Node.Level */
function fSort_bone_lvl( a, b ){
	if(a.Node.level == b.Node.level)		return  0;	// A = B
	else if(a.Node.level < b.Node.level)	return -1;	// A < B
	else									return  1;	// A > B
}

/** Sort bone array by Bone.order */
function fSort_bone_order( a, b ){
	if(a.Bone.order == b.Bone.order)		return  0;	// A = B
	else if(a.Bone.order < b.Bone.order)	return -1;	// A < B
	else									return  1;	// A > B
}


//#################################################################
export default Armature;
export { Bone, BoneSystem, ArmatureSystem };