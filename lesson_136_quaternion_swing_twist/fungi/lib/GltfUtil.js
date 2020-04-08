import App	from "../App.js";
import Vec3 from "../maths/Vec3.js";
import Gltf from "./Gltf.js";

class GltfUtil{
	// #region MESH & ARMATURE
	// Loads in Mesh Only
	static get_mesh( e_name, json, bin, mat, m_names=null ){
		let e = App.$Draw( e_name );
		this.load_mesh_into( e, json, bin, mat, m_names, false );
		return e;
	}

	// Load Skinned Mesh with Bone View
	static get_debug_view( e_name, json, bin, mat, m_names=null, arm_name=null ){
		let e = App.ecs.entity( e_name, ["Node", "Draw", "Armature", "BoneView"] );
		this.load_mesh_into( e, json, bin, mat, m_names, true );	// Mesh
		this.load_bones_into( e, json, bin, arm_name );				// Armature
		e.BoneView.init();											// Render Bones
		return e;
	}

	// Load Armature and BoneView Only
	static get_bone_view( e_name, json, bin, arm_name=null ){
		let e = App.ecs.entity( e_name, [ "Node", "Draw", "Armature", "BoneView" ] );
		this.load_bones_into( e, json, bin, arm_name );				// Armature
		e.BoneView.init();											// Render Bones
		return e;
	}

	// Load Skinned Mesh
	static get_skin_mesh( e_name, json, bin, mat, m_names=null, arm_name=null ){
		let e = App.ecs.entity( e_name, ["Node", "Draw", "Armature"] );
		this.load_mesh_into( e, json, bin, mat, m_names, true );	// Mesh
		this.load_bones_into( e, json, bin, arm_name );				// Armature
		return e;
	}
	// #endregion //////////////////////////////////////////////////////////////

	// #region LOADERS
	// Bin loading of Mesh Data into a Drawing Entity
	static load_mesh_into( e, json, bin, mat=null, mesh_names=null, is_skinned=false ){
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Load all meshes in file
		if( !mesh_names ){
			mesh_names = new Array();
			for( let i=0; i < json.nodes.length; i++ ){
				if( json.nodes[i].mesh != undefined ) mesh_names.push( json.nodes[i].name );
			}
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Mesh can be made up of sub-meshes, So need to loop through em.
		let n, g, m, geo_ary;
		for( n of mesh_names ){
			geo_ary = Gltf.get_mesh( n, json, bin, true ); // Spec Only, Doing a BIN Loading

			for( g of geo_ary ){
				m = App.Mesh.from_bin( n, g, bin, is_skinned );
				e.Draw.add( m, mat, g.mode );
				if( g.rotation )	e.Node.set_rot( g.rotation );
				if( g.position )	e.Node.set_pos( g.position );
				if( g.scale ) 		e.Node.set_scl( g.scale );
			}
		}
	}

	static load_bones_into( e, json, bin, arm_name=null, def_len=0.1 ){
		let n_info	= {}, // Node Info
			arm 	= e.Armature,
			bones 	= Gltf.get_skin_by_nodes( json, arm_name, n_info );
			//bones 	= Gltf.get_skin( json, bin, arm_name, n_info );

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Create Bones
		let len	= bones.length,
			map = {},			// Create a Map of the First Child of Every Parent
			i, b, be;

		for( i=0; i < len; i++ ){
			b	= bones[ i ];
			be	= arm.add_bone( b.name, 1, b.p_idx );
			//console.log( b.name, b.rot, b.scl );
			if( b.rot ) be.Node.set_rot( b.rot );
			if( b.pos ) be.Node.set_pos( b.pos );
			if( b.scl ) be.Node.set_scl( b.scl );

			// Save First Child to Parent Mapping
			if( b.p_idx != null && !map[ b.p_idx ] ) map[ b.p_idx ] = i;
		}

		arm.finalize();

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Set the Entity Transfrom from Armature's Node Transform if available.
		// Loading Meshes that where originally FBX need this to display correctly.
		//console.log( n_info );
		if( n_info.scl ) e.Node.set_scl( n_info.scl );
		if( n_info.rot ) e.Node.set_rot( n_info.rot );

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Calc the Length of Each Bone
		let c;
		for( i=0; i < len; i++ ){
			b = arm.bones[ i ];

			if( !map[ i ] ) b.len = def_len;
			else{
				c = arm.bones[ map[ i ] ]; // First Child's World Space Transform
				b.len = Vec3.len( b.world.pos, c.world.pos ); // Distance from Parent to Child
			}
			//console.log( b.name, b.len );
		}

		return e;
	}
	// #endregion //////////////////////////////////////////////////////////////

	// #region POSES
	/* poses:[  { name:"tpose", skin:0, joints:[ { rot:[], scl:[] } ]}  ] */
	static serialize_pose( name, skin, pose ){
		let json	= pose.bare_serialize(),
			buf		= "";

		for( let i=0; i < json.length; i++ ){
			if( i != 0 ) buf += ",\n";
			buf += "\t" + JSON.stringify( json[ i ] );
		}

		return `{ "name":"${name}", "skin":${skin}, "joints":[\n${buf}\n]}`;
	}

	static get_pose( e, json, pose_name=null, do_world_calc=false ){
		if( !json.poses || json.poses.length == 0 ){ console.error("No Poses in file"); return null; }

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Find Which Pose To Use.
		let p_idx = 0;
		if( pose_name ){
			let i;
			for( i=0; i < json.poses.length; i++ ){
				if( json.poses[ i ].name == pose_name ){ p_idx = i; break; }
			}
			if( i != p_idx ){ console.log("Can not find pose by the name: ", pose_name ); return null; }
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Save pose local space transform
		let bones	= json.poses[ p_idx ].joints,
			pose	= e.Armature.new_pose(),
			i, b;

		for( i=0; i < bones.length; i++ ){
			b = bones[ i ];
			pose.set_bone( i, b.rot, b.pos, b.scl );
		}

		if( do_world_calc ) pose.update_world();

		return pose;
	}
	// #endregion //////////////////////////////////////////////////////////////
}

export default GltfUtil;
export { Gltf };