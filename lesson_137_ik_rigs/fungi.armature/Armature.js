import App			from "../fungi/App.js";
import Transform	from "../fungi/maths/Transform.js";
import Mat4			from "../fungi/maths/Mat4.js";
import Pose			from "./Pose.js";

//#################################################################
class Bone{
	constructor(){
		this.index = 0; // Where in the array the bone is located.

		//...................................
		// Bind Pose is the inverted Hierachy World Space Transform of the bone. Its used to "subtract"
		// an updated Transform to get the difference from the initial state. The Difference
		// is the Offset. That is the actual amount of rotation / translation we need to do.
		this.bind_pose	= new Mat4();
		this.offset		= new Mat4();
	}

	update(){
		let n = App.get_e( this.entity_id ).Node;

		this.offset.from_mul( n.model_matrix, this.bind_pose );

		//this.offset
		//	.set( n.world.rot, n.world.pos )	// Current World Space as a DQ
		//	.mul( this.bind_pose );				// Subtract from Bind_pose

		//let dq = new DualQuat();
		//dq.set( e.Node.world.rot, e.Node.world.pos );
		//DualQuat.mul( dq, e.Bone.dqBindPose, e.Bone.dqOffset ); // offset = world * bindPose
	}
}


//#################################################################
class Armature{
	static init( priority = 801 ){
		App.Components.reg( Armature ).reg( Bone );
		App.ecs
			.sys_add( ArmatureSys, priority )
			.sys_add( ArmatureCleanupSys, 1000 );	// Final Cleanup at the end of a frame
	}

	constructor(){
		this.updated		= true;			// Does the armature need to update its buffers
		this.bones			= new Array();	// List of bones in the order they are used in the shader.
		this.name_map		= {};			// Maps Bone names to array index for quick lookups

		this.fbuf_offset	= null;			// Float Buffer of World Space Offsets in Dual Quat
		this.fbuf_scale		= null;			// Same but for scale
	}

	/////////////////////////////////////////////////
	// SKELETON CONSTRUCTION
	/////////////////////////////////////////////////

		// Bones must be inserted in the order they will be used in a skinned shader.
		// Must keep the bone index and parent index correctly.
		add_bone( name, len=1, p_idx=null ){
			let b = {
				ref 		: App.ecs.entity( name, ["Node","Bone"] ),
				name 		: name,					// Bone Name
				idx 		: this.bones.length,	// Bone Index
				p_idx 		: p_idx,				// Parent Bone Index
				len 		: len,					// Length of the Bones
				local		: new Transform(),		// Local Space Bind Transform
				world		: new Transform(),		// World Space Bind Transform
			};

			this.bones.push( b );					// Save Bone Data to Array
			this.name_map[ name ] 	= b.idx;		// Save Name to Index Mapping
			b.ref.Bone.index		= b.idx;		// Set Index on Entity Bone

			//b.ref.Node.local.use_scl = false;		// Disable using Scale Applied To Position.
			//b.ref.Node.world.use_scl = false;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Set Bone as a child of another
			if( p_idx != null && this.bones[ p_idx ] ){
				let p = this.bones[ p_idx ];

				p.ref.Node.add_child( b.ref );						// Make Bone Entity a child entity
				if( p.ref.Bone ) b.ref.Node.local.pos.y = p.len;	// Move bone to parent's tail location
			}else{
				b.p_idx = null										// Make bone a child of the drawing entity
				App.get_e( this.entity_id ).Node.add_child( b.ref );
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			return b.ref;
		}

		// Calculate the Bind Pose based on the Bone Entity Local Transform
		compute_bind_pose(){
			let b, p;
			for( b of this.bones ){
				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				// Copy current local space transform of the bone
				b.local.copy( b.ref.Node.local );

				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				// Compute its world space transform based on parent's ws transform.
				if( b.p_idx != null ){
					p = this.bones[ b.p_idx ];
					b.world.from_add( p.world, b.local );
				}else b.world.copy( b.local );

				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				// Create Bind Pose for the bone ( b.world.invert )
				b.ref.Bone.bind_pose
					.from_quat_tran_scale( b.world.rot, b.world.pos, b.world.scl )
					.invert();
			}
		}

		// Final steps to get the Armature Ready for use
		finalize(){
			// Setup the Inverted Bind Pose
			this.compute_bind_pose();

			// Create Flat Data array based on bone count.
			this.fbuf_offset = new Float32Array( this.bones.length * 16 );
			return this;
		}

	/////////////////////////////////////////////////
	// METHODS
	/////////////////////////////////////////////////
	
		get_e( b_name ){ return this.bones[ this.name_map[ b_name ] ].ref; }

		* bone_entity_iter(){ let b; for( b of this.bones ) yield b.ref; }

	/////////////////////////////////////////////////
	// BUFFERS
	/////////////////////////////////////////////////
		
		update_buffer(){
			// Save Data to fbufs
			let off = this.fbuf_offset,
				i, ii, b, data;

			for( i=0; i < this.bones.length; i++ ){
				ii		= i * 16;
				b		= this.bones[ i ].ref;
				data 	= b.Bone.offset;

				off[ii+0]	= data[0];
				off[ii+1]	= data[1];
				off[ii+2]	= data[2];
				off[ii+3]	= data[3];
				off[ii+4]	= data[4];
				off[ii+5]	= data[5];
				off[ii+6]	= data[6];
				off[ii+7]	= data[7];
				off[ii+8]	= data[8];
				off[ii+9]	= data[9];
				off[ii+10]	= data[10];
				off[ii+11]	= data[11];
				off[ii+12]	= data[12];
				off[ii+13]	= data[13];
				off[ii+14]	= data[14];
				off[ii+15]	= data[15];
			}
			return this;
		}

	/////////////////////////////////////////////////
	// POSE MANAGEMENT
	/////////////////////////////////////////////////
	
		// Create a pose that copies the Bind Pose
		new_pose(){ return new Pose( this ); }

		// Copies modified Local Transforms of the Pose to the Bone Entities.
		load_pose( p ){
			let i, 
				pb, // Pose Bone
				n;	// Bone Entity Node

			for( i=0; i < p.bones.length; i++ ){
				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				// Check if bone has been modified in the pose
				pb = p.bones[ i ];
				if( pb.chg_state == 0 ) continue;

				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				// Copy changes to Bone Entity
				n = this.bones[ i ].ref.Node;

				if( pb.chg_state & Pose.ROT ) n.local.rot.copy( pb.local.rot );
				if( pb.chg_state & Pose.POS ) n.local.pos.copy( pb.local.pos );
				if( pb.chg_state & Pose.SCL ) n.local.scl.copy( pb.local.scl );

				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				// Update States
				n.updated		= true;
				pb.chg_state	= 0;
			}

			this.updated = true;
			return this;
		}


	/////////////////////////////////////////////////
	// POSE MANAGEMENT
	/////////////////////////////////////////////////
		
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
}


//#################################################################
/* After TransformSystem, BoneSystem can then turn all the World Transform into world Dual Quaternions. */
function ArmatureSys( ecs ){
	let i, e, a, ary = ecs.query_comp( "Armature" );
	if( !ary ) return; // No armatures, skip.

	for( a of ary ){
		e = ecs.entities[ a.entity_id ];
		if( e.Node.updated ) a.updated = true;	// If the entiry transform has changed, Need to recalc all bones even if bones haven't changed themselves.
		if( !a.updated ) continue;

		// Update All Bone Offset Matrices
		for( e of a.bone_entity_iter() ){
			if( e.Node.updated ) e.Bone.offset.from_mul( e.Node.model_matrix, e.Bone.bind_pose );
		}

		// Save all the Bone Offset Matrices into Buffer for GPU
		a.update_buffer();
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