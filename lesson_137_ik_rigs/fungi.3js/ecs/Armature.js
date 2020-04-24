import App, {THREE}			from "../App.js";
import Transform 			from "../../fungi/maths/Transform.js";
import Pose					from "../../fungi.armature/Pose.js";

//#################################################################
class Armature{
	static init( priority = 801 ){
		App.Components.reg( Armature );
		App.ecs
			.sys_add( ArmatureCleanupSys, 1000 );	// Final Cleanup at the end of a frame
	}

	constructor(){
		this.updated		= true;			// Does the armature need to update its buffers
		this.skeleton 		= null;			// THREE uses skeleton to bind to SkinnedMesh
		this.bones			= new Array();	// List of bones in the order they are used in the shader.
		this.name_map		= {};			// Maps Bone names to array index for quick lookups
	}

	/////////////////////////////////////////////////
	// SKELETON CONSTRUCTION
	/////////////////////////////////////////////////
		
		// Bones must be inserted in the order they will be used in a skinned shader.
		// Must keep the bone index and parent index correctly.
		add_bone( name, len=1, p_idx=null ){
			let b = {
				ref 		: new THREE.Bone(),
				name 		: name,					// Bone Name
				idx 		: this.bones.length,	// Bone Index
				p_idx 		: p_idx,				// Parent Bone Index
				len 		: len,					// Length of the Bones
				local		: new Transform(),		// Local Space Bind Transform
				world		: new Transform(),		// World Space Bind Transform
			};

			this.bones.push( b );					// Save Bone Data to Array
			this.name_map[ name ] = b.idx;			// Save Name to Index Mapping

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Set Bone as a child of another
			if( p_idx != null && this.bones[ p_idx ] ){
				let p = this.bones[ p_idx ];

				p.ref.add( b.ref );						// Make Bone a child 
				if( p.len ) b.ref.position.y = p.len;	// Move bone to parent's tail location
			}else{
				b.p_idx = null;
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			return b.ref;
		}

		// Compute the Fungi Local & World Transform Bind Pose
		// THREE will compute the inverse matrix bind pose on its own when bones 
		// are given to THREE.Skeleton
		compute_bind_pose(){
			let b, p;
			for( b of this.bones ){
				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				// Copy current local space transform of the bone
				b.local.rot.from_struct( b.ref.quaternion );
				b.local.pos.from_struct( b.ref.position );
				b.local.scl.from_struct( b.ref.scale );

				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				// Compute its world space transform based on parent's ws transform.
				if( b.p_idx != null ){
					p = this.bones[ b.p_idx ];
					b.world.from_add( p.world, b.local );
				}else b.world.copy( b.local );
			}
		}

		// All bones have been created, do final steps to get things working
		finalize(){
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Setup the Inverted Bind Pose
			this.compute_bind_pose();

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Build THREE.JS Skeleton
			let i, b_ary = new Array( this.bones.length );
			for( i=0; i < this.bones.length; i++ ) b_ary[ i ] = this.bones[ i ].ref;

			this.skeleton = new THREE.Skeleton( b_ary );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Bind Skeleton & Root Bone to SkinnedMesh if available.
			let e = App.get_e( this.entity_id );
			if( e.Obj && e.Obj.ref && e.Obj.ref.isSkinnedMesh ){
				e.Obj.ref.add( this.bones[ 0 ].ref );	// Add Root Bone
				e.Obj.ref.bind( this.skeleton );		// Bind Skeleton
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			return this;
		}

	/////////////////////////////////////////////////
	// METHODS
	/////////////////////////////////////////////////

		// Get the Root Bone
		get_root(){ return this.bones[ 0 ].ref; }

		// Get Bone by Name
		get_bone( b_name ){ return this.bones[ this.name_map[ b_name ] ].ref; }

	/////////////////////////////////////////////////
	// POSE MANAGEMENT
	/////////////////////////////////////////////////
	
		// Create a pose that copies the Bind Pose
		new_pose(){ return new Pose( this ); }

		// Copies modified Local Transforms of the Pose to the Bone Entities.
		load_pose( p ){
			let i, 
				pb, // Pose Bone
				o;	// Bone Object

			for( i=0; i < p.bones.length; i++ ){
				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				// Check if bone has been modified in the pose
				pb = p.bones[ i ];
				if( pb.chg_state == 0 ) continue;

				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				// Copy changes to Bone Entity
				o = this.bones[ i ].ref;

				if( pb.chg_state & Pose.ROT ) o.quaternion.fromArray( pb.local.rot );
				if( pb.chg_state & Pose.POS ) o.position.fromArray( pb.local.pos );
				if( pb.chg_state & Pose.SCL ) o.scale.fromArray( pb.local.scl );

				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				// Update States
				pb.chg_state = 0;
			}

			this.updated = true;
			return this;
		}
		
		// Serialize the Bone Data
		serialize_bones( inc_scale = false ){
			let out	= new Array( this.bones.length ),
				i 	= 0,
				b;

			for( b of this.bones ){
				out[ i ] = {
					name	: b.name,
					len		: b.len,
					idx		: b.idx,
					p_idx 	: b.p_idx,
					pos		: Array.from( b.local.pos ),
					rot		: Array.from( b.local.rot ),
				};

				if( inc_scale ) out[ i ].scl = Array.from( b.local.scl );
				
				i++;
			}
			return out;
		}

		// Serialize the Bone Data
		deserialize_bones( ary ){
			let itm, b;
			for( itm of ary ){
				b = this.add_bone( itm.name, itm.len, itm.p_idx );
				b.position.fromArray( itm.pos );
				b.quaternion.fromArray( itm.rot );
				if( b.scl ) b.scale.fromArray( itm.scl );
			}
			return this;
		}
}



/** System to handle cleanup like setting updated to false */
function ArmatureCleanupSys( ecs ){
	let a, ary = ecs.query_comp( "Armature" );
	if( ary == null ) return; // No Bones Loaded
	for( a of ary ) if( a.updated ) a.updated = false;
}

//#################################################################
export default Armature;