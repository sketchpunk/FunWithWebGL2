import App	from "../fungi/engine/App.js";
import Vao	from "../fungi/core/Vao2.js";
import Gltf	from "../fungi.misc/GLTF.js";

//##############################################################################
class FungiGLTF{
	/////////////////////////////////////////////////////////////////
	// Main Loading Functions
	/////////////////////////////////////////////////////////////////

		// Just the Mesh;
		static $( e_name, json, bin, mat, mesh_names=null ){
			let e = App.$Draw( e_name );
			this.setup_mesh( e, json, bin, mat, mesh_names );
			return e;
		} 
		
	 	// Mesh with Armature
		static $skin( e_name, json, bin, arm_name="Armature", mat="ArmatureSkinPhong", mesh_names=null ){
			let e = App.$Draw( e_name );
			this.setup_mesh( e, json, bin, mat, mesh_names );
			this.setup_armature( e, arm_name, json );
			return e;
		}

		static $skin_bind( e_name, json, bin, arm_name="Armature", mat="ArmatureSkinPhong", mesh_names=null ){
			let e = App.$Draw( e_name );
			this.setup_mesh( e, json, bin, mat, mesh_names );
			this.setup_armature_bind( e, arm_name, json, bin );
			return e;
		}

		// Armature Preview Only
		static $preview( e_name, arm_name, json ){
			let e = App.$Draw( e_name );
			this.setup_armature( e, arm_name, json );
			App.global.ArmaturePreview.$( e, "ArmaturePreview", 2 );
			return e;
		}

		// Armature Preview Only
		static $preview_bind( e_name, arm_name, json, bin ){
			let e = App.$Draw( e_name );
			this.setup_armature_bind( e, arm_name, json, bin );
			App.global.ArmaturePreview.$( e, "ArmaturePreview", 2 );
			return e;
		}

		static $debug( e_name, json, bin, arm_name="Armature", mat="ArmatureSkinPhong", mesh_names=null ){
			let e = App.$Draw( e_name );
			this.setup_mesh( e, json, bin, mat, mesh_names );
			this.setup_armature( e, arm_name, json );
			App.global.ArmaturePreview.$( e, "ArmaturePreview", 2 );
			return e;
		}

		static $debug_bind( e_name, json, bin, arm_name="Armature", mat="ArmatureSkinPhong", mesh_names=null ){
			let e = App.$Draw( e_name );
			this.setup_mesh( e, json, bin, mat, mesh_names );
			this.setup_armature_bind( e, arm_name, json, bin );
			App.global.ArmaturePreview.$( e, "ArmaturePreview", 2 );
			return e;
		}


	/////////////////////////////////////////////////////////////////
	// Helper Functions
	/////////////////////////////////////////////////////////////////
		static setup_armature( e, arm_name, json ){
			let node	= {},
				bones 	= Gltf.getSkin( arm_name, json, node );

			App.global.Armature.$( e );
			this.gen_bones( e, bones );

			// Set the Entity Transfrom from Armature's Node Transform if available.
			if( node.scl ) e.Node.setScl( node.scl );
			if( node.rot ) e.Node.setRot( node.rot );

			return e;
		}

		static setup_armature_bind( e, arm_name, json, bin ){
			let node	= {},
				bones 	= Gltf.get_bind_skeleton( arm_name, json, bin, node );

			App.global.Armature.$( e );
			this.gen_bones( e, bones );

			// Set the Entity Transfrom from Armature's Node Transform if available.
			if( node.scl ) e.Node.setScl( node.scl );
			if( node.rot ) e.Node.setRot( node.rot );

			return e;
		}

		static setup_mesh( e, json, bin, mat=null, mesh_names=null ){
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( !mesh_names ){
				mesh_names = new Array();
				for( let i=0; i < json.meshes.length; i++ ) mesh_names.push( json.meshes[i].name );
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let n, p, prim_ary, vao;
			for( n of mesh_names ){
				prim_ary = Gltf.getMesh( n, json, bin, true );
				for( p of prim_ary ){
					vao = this.build_vao( e, p, bin );
					e.Draw.add( vao, mat, p.mode );
				}
				// This only Works if each Primitive is its own Entity, but not for meshes broken out as pieces 
				// and each piece shares the same main mesh local space
				//if( p.rotation )	e.Node.setRot( p.rotation );
				//if( p.position )	e.Node.setPos( p.position );
				//if( p.scale ) 	e.Node.setScl( p.scale );
			}
		}

		static build_vao( e, spec, bin ){ 
			let d, dv	= ( bin instanceof ArrayBuffer )? new DataView( bin ) : bin,
				elm_cnt	= null,
				vao 	= new Vao().bind();

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( (d=spec.indices) ){
				vao.add_indices_bin( dv, d.byteStart, d.byteLen, true );
				elm_cnt = d.elmCount;
			}

			if( (d=spec.weights) )	vao.add_weights_bin( dv, d.byteStart, d.byteLen );
			if( (d=spec.joints) )	vao.add_bones_bin( bin, d.byteStart, d.elmCount, d.compLen );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			d = spec.vertices;
			vao	.add_vertices_bin( dv, d.byteStart, d.byteLen, true )
				.set( elm_cnt || d.elmCount ) // TODO, Fix FungiMesh.vao
				.unbind_all();

			return vao;
		}

		// Takes the bones information from gltf and
		// create the Entity Heirarchy of the bones and assign
		// it to the armature.
		static gen_bones( e, bones, def_len=0.1 ){
			let arm = e.Armature;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Create Bones
			let i, b, ab, bLen = bones.length;
			for( i=0; i < bLen; i++ ){
				b	= bones[i];
				ab	= arm.add_bone( b.name, 1, null, b.idx );
				if( b.rot ) ab.Node.setRot( b.rot );
				if( b.pos ) ab.Node.setPos( b.pos );
				if( b.scl ) ab.Node.setScl( b.scl );
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Setting up Parent-Child
			for( i=0; i < bLen; i++ ){
				b	= bones[ i ];
				ab	= arm.bones[ b.idx ];
				
				// Can not have levels updated automaticly, Callstack limits get hit
				// Instead, using the Level from bones to manually set it.
				if( b.p_idx != null ) arm.bones[ b.p_idx ].Node.add_child( ab, false );

				// Manual set node level, Must do it after addChild, else it will get overwritten.
				ab.Node.level = b.lvl; //TODO THIS ISN"T CORRECT ANYMORE, ROOT BONE NOW LIVES UNDER RENDER ENTITY
			}

			App.global.Armature.finalize( e );	// This updates World Transforms

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// With the WorldTransforms update, Calculate the Length of each bone.
			// The IK System needs to know the length of each bone.
			for( i=0; i < bLen; i++ ){
				ab = arm.bones[ i ];

				if( ab.Node.children.length == 0 ){
					ab.Bone.length = def_len;
					continue;
				}

				b = ab.Node.children[0].Node.world;					// First Child's World Space Transform
				ab.Bone.length = ab.Node.world.pos.len( b.pos );	// Distance from Parent to Child
			}
		}

	/////////////////////////////////////////////////////////////////
	//
	/////////////////////////////////////////////////////////////////
		static animation( a_name, json, bin ){
			let ganim = Gltf.get_animation( a_name, json, bin, true, false ),
				fanim = new App.global.Animation(),
				i;

			// Copy Over the Time Array
			for( i of ganim.times ){ fanim.add_time_array( i ); }

			// Copy Over Tracks
			for( i of ganim.tracks ){
				fanim.add_joint_track( i.type, i.time_idx, i.joint_idx, i.lerp, i.data );
			}

			return fanim;
		}
}

//##############################################################################
export default FungiGLTF;
export { Gltf };