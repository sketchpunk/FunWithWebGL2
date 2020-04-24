import App,{THREE, Vec3} from "../App.js";
import Gltf from "../../fungi/lib/Gltf.js";

class GltfUtil{
	//////////////////////////////////////////////////////////////
	// GETTERS
	//////////////////////////////////////////////////////////////

		// Get Geometry only
		static get_geo( json, bin, m_names=null ){
			return this.load_geo( json, bin, m_names );
		}

		// Loads in Mesh Only
		static get_mesh( m_name, json, bin, mat, m_names=null ){
			let m = this.load_mesh( json, bin, mat, m_names, false );
			m.name = m_name;
			return App.$( m );
		}

		static get_bone_view( m_name, json, bin, arm_name=null ){
			let e = App.ecs.entity( m_name, [ "Armature" ] ),
				o = e.add_com( "Obj" );

			o.ref = new THREE.Group();					
			o.ref.name = m_name;

			this.load_bones_into( e, json, bin, arm_name );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let b = e.Armature.get_root();
			o.ref.add( b );
			App.scene.add( new THREE.SkeletonHelper( b ) );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			App.scene.add( o.ref );
			return e;
		}

		static get_debug_view( m_name, json, bin, mat, m_names=null, arm_name=null ){
			let m = this.load_mesh( json, bin, mat, m_names, true );
			m.name			= m_name;
			mat.skinning	= true;		// Make Sure Skinning is enabled on the material

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let e 	= App.$( m ),
				arm	= e.add_com( "Armature" );

			this.load_bones_into( e, json, bin, arm_name );
			if( m.type === "Group" ) this.group_bind_skeleton( m, arm.skeleton );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			App.scene.add( new THREE.SkeletonHelper( arm.skeleton.bones[0] ) );
			return e;
		}

		static get_skin_mesh( m_name, json, bin, mat, m_names=null, arm_name=null ){
			let m = this.load_mesh( json, bin, mat, m_names, true );
			m.name			= m_name;
			mat.skinning	= true;		// Make Sure Skinning is enabled on the material

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let e 	= App.$( m ),
				arm	= e.add_com( "Armature" );

			this.load_bones_into( e, json, bin, arm_name );
			if( m.type === "Group" ) this.group_bind_skeleton( m, arm.skeleton );
			return e;
		}

	//////////////////////////////////////////////////////////////
	// LOADERS
	//////////////////////////////////////////////////////////////

		// Bin loading of Mesh Data into a Drawing Entity
		static load_mesh( json, bin, mat=null, mesh_names=null, is_skinned=false ){
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Load all meshes in file
			if( !mesh_names ){
				mesh_names = new Array();
				for( let i=0; i < json.meshes.length; i++ ) mesh_names.push( json.meshes[i].name );
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Mesh can be made up of sub-meshes, So need to loop through em.
			let n, g, geo_ary, list = [];
			
			for( n of mesh_names ){
				geo_ary = Gltf.get_mesh( n, json, bin, false ); // Load Type Arrays

				if( geo_ary.length == 1 )
					list.push( this.mk_geo_mesh( geo_ary[0], mat, is_skinned ) );
				else						
					for( g of geo_ary ) 
						list.push( this.mk_geo_mesh( g, mat, is_skinned ) );
				
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Return mesh Or if multiple, a Group of Meshes.
			if( list.length == 1 ) return list[0];

			let rtn = new THREE.Group();
			for( g of list ) rtn.add( g );

			return rtn;
		}

		static load_geo( json, bin, mesh_names=null ){
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Load all meshes in file
			if( !mesh_names ){
				mesh_names = new Array();
				for( let i=0; i < json.meshes.length; i++ ) mesh_names.push( json.meshes[i].name );
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Mesh can be made up of sub-meshes, So need to loop through em.
			let n, g, geo_ary, list = [];
			
			for( n of mesh_names ){
				geo_ary = Gltf.get_mesh( n, json, bin, false ); // Load Type Arrays

				if( geo_ary.length == 1 )
					list.push( this.mk_geo( geo_ary[0] ) );
				else						
					for( g of geo_ary ) 
						list.push( this.mk_geo( g ) );
				
			}

			return list;
		}

		static load_bones_into( e, json, bin, arm_name=null, def_len=0.1 ){
			let n_info	= {}, // Node Info
				arm 	= e.Armature,
				//bones 	= Gltf.get_skin( json, bin, arm_name, n_info );
				bones 	= Gltf.get_skin_by_nodes( json, arm_name, n_info );
			

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Create Bones
			let len	= bones.length,
				map = {},			// Create a Map of the First Child of Every Parent
				i, b, be;

			for( i=0; i < len; i++ ){
				b	= bones[ i ];
				be	= arm.add_bone( b.name, 1, b.p_idx );

				if( b.rot ) be.quaternion.fromArray( b.rot );
				if( b.pos ) be.position.fromArray( b.pos );
				if( b.scl ) be.scale.fromArray( b.scl );

				// Save First Child to Parent Mapping
				if( b.p_idx != null && !map[ b.p_idx ] ) map[ b.p_idx ] = i;
			}

			arm.finalize();

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Set the Entity Transfrom from Armature's Node Transform if available.
			// Loading Meshes that where originally FBX need this to display correctly.
			if( n_info.scl ) e.Obj.ref.scale.fromArray( n_info.scl );
			if( n_info.rot ) e.Obj.ref.quaternion.fromArray( n_info.rot );

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
			}

			return e;
		}

	//////////////////////////////////////////////////////////////
	// HELPERS
	//////////////////////////////////////////////////////////////
		// Create a Geo Buffer and Mesh from data from bin file.
		static mk_geo( g ){
			let geo = new THREE.BufferGeometry();
			geo.setAttribute( "position", new THREE.BufferAttribute( g.vertices.data, g.vertices.comp_len ) );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( g.indices )
				geo.setIndex( new THREE.BufferAttribute( g.indices.data, 1 ) );

			if( g.normal )
				geo.setAttribute( "normal", new THREE.BufferAttribute( g.normal.data, g.normal.comp_len ) );

			if( g.uv )
				geo.setAttribute( "uv", new THREE.BufferAttribute( g.uv.data, g.uv.comp_len ) );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			geo.name = g.name;
			return geo;
		}

		// Create a Geo Buffer and Mesh from data from bin file.
		static mk_geo_mesh( g, mat, is_skinned=false ){
			let geo = new THREE.BufferGeometry();
			geo.setAttribute( "position", new THREE.BufferAttribute( g.vertices.data, g.vertices.comp_len ) );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( g.indices )
				geo.setIndex( new THREE.BufferAttribute( g.indices.data, 1 ) );

			if( g.normal )
				geo.setAttribute( "normal", new THREE.BufferAttribute( g.normal.data, g.normal.comp_len ) );

			if( g.uv )
				geo.setAttribute( "uv", new THREE.BufferAttribute( g.uv.data, g.uv.comp_len ) );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( is_skinned && g.joints && g.weights ){
				geo.setAttribute( "skinIndex", new THREE.Uint16BufferAttribute( g.joints.data, g.joints.comp_len ) );
				geo.setAttribute( "skinWeight", new THREE.Float32BufferAttribute( g.weights.data, g.weights.comp_len ) );
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let m = ( !is_skinned )?
				new THREE.Mesh( geo, mat ) :
				new THREE.SkinnedMesh( geo, mat );

			m.name = g.name;
			return m;
		}

		static group_bind_skeleton( grp, skeleton ){
			let c, i, len = grp.children.length, root_bind=false;

			grp.updateMatrixWorld( true ); // MUST DO THIS, Else things gets effed up
			for( i=0; i < len; i++ ){
				c = grp.children[ i ];
				if( !c.isSkinnedMesh ) continue;

				// Need to child the root bone to a SkinnedMesh else no works
				// Can only do this once, so do it on the first possible one.
				if( !root_bind ){ c.add( skeleton.bones[0] ); root_bind = true; }

				c.bind( skeleton );			// Bind Skeleton to SkinnedMesh
				c.bindMode = "detached";	// Not sure if it does anything but just incase.
			}
		}

	//////////////////////////////////////////////////////////////
	// POSES
	//////////////////////////////////////////////////////////////

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

}

export default GltfUtil;
export { Gltf };