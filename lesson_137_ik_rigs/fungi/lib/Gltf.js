import Mat4 from "../maths/Mat4.js";
import Vec3 from "../maths/Vec3.js";
import Quat from "../maths/Quat.js";

/** 
 * Handle parsing data from GLTF Json and Bin Files
 * @example <caption></caption>
 * let aryPrim = Gltf.getMesh( names[0], json, bin );
 * let p = aryPrim[ 0 ];
 *
 * let vao = Vao.buildStandard( "Drill", p.vertices.compLen, p.vertices.data, 
 *	(p.normal)?		p.normal.data	: null, 
 *	(p.uv)? 		p.uv.data		: null,
 *	(p.indices)?	p.indices.data	: null );
 *
 * let e = App.$Draw( "Drill", vao, "LowPolyPhong", p.mode );
 * if( p.rotation )	e.Node.setRot( p.rotation );
 * if( p.position )	e.Node.setPos( p.position );
 * if( p.scale ) 	e.Node.setScl( p.scale );
 *
 * ---- OR ----
 * let vao = Vao.buildFromBin( "ToBufferTest", p, bin );
 * let e = App.$Draw( "BinBufTestMesh", vao, "LowPolyPhong", gl.ctx.TRIANGLES );
 * if( p.rotation )	e.Node.setRot( p.rotation );
 * if( p.position )	e.Node.setPos( p.position );
 * if( p.scale ) 	e.Node.setScl( p.scale );
 */
class Gltf{
	////////////////////////////////////////////////////////
	// HELPERS
	////////////////////////////////////////////////////////
		/**
		* Parse out a single buffer of data from the bin file based on an accessor index. (Vertices, Normal, etc)
		* @param {number} idx - Index of an Accessor
		* @param {object} json - GLTF Json Object
		* @param {ArrayBuffer} bin - Array buffer of a bin file
		* @param {bool} specOnly - Returns only Buffer Spec data related to the Bin File
		* @public @return {data:TypeArray, min, max, elmCount, compLen, byteStart, byteLen, arrayType }
		*/
		//https://github.com/KhronosGroup/glTF-Tutorials/blob/master/gltfTutorial/gltfTutorial_005_BuffersBufferViewsAccessors.md
		static parse_accessor( idx, json, bin, spec_only = false ){
			let acc			= json.accessors[ idx ],				// Reference to Accessor JSON Element
				bView 		= json.bufferViews[ acc.bufferView ],	// Buffer Information
				compLen		= Gltf[ "COMP_" + acc.type ],			// Component Length for Data Element
				ary			= null,									// Final Type array that will be filled with data
				byteStart	= 0,
				byteLen		= 0,
				TAry, 												// Reference to Type Array to create
				DFunc; 												// Reference to GET function in Type Array

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Figure out which Type Array we need to save the data in
			switch( acc.componentType ){
				case Gltf.TYPE_FLOAT:			TAry = Float32Array;	DFunc = "getFloat32"; break;
				case Gltf.TYPE_SHORT:			TAry = Int16Array;		DFunc = "getInt16"; break;
				case Gltf.TYPE_UNSIGNED_SHORT:	TAry = Uint16Array;		DFunc = "getUint16"; break;
				case Gltf.TYPE_UNSIGNED_INT:	TAry = Uint32Array;		DFunc = "getUint32"; break;
				case Gltf.TYPE_UNSIGNED_BYTE: 	TAry = Uint8Array; 		DFunc = "getUint8"; break;

				default: console.log("ERROR processAccessor","componentType unknown",a.componentType); return null; break;
			}
			
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let out = { 
				min 		: acc.min,
				max 		: acc.max,
				elm_cnt		: acc.count,
				comp_len 	: compLen
			};

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Data is Interleaved
			if( bView.byteStride ){
				if( spec_only ) console.error( "GLTF STRIDE SPEC ONLY OPTION NEEDS TO BE IMPLEMENTED ");
				/*
					The RiggedSimple sample seems to be using stride the wrong way. The data all works out
					but Weight and Joint indicate stride length BUT the data is not Interleaved in the buffer.
					They both exists in their own individual block of data just like non-Interleaved data.
					In the sample, Vertices and Normals ARE actually Interleaved. This make it a bit
					difficult to parse when dealing with interlanced data with WebGL Buffers.

					TODO: Can prob check if not interlanced by seeing if the Stride Length equals the length 
					of the data in question.
					For example related to the RiggedSimple sample.
					Stride Length == FloatByteLength(4) * Accessor.type's ComponentLength(Vec3||Vec4)
					-- So if Stride is 16 Bytes
					-- The data is grouped as Vec4 ( 4 Floats )
					-- And Each Float = 4 bytes.
					-- Then Stride 16 Bytes == Vec4 ( 4f loats * 4 Bytes )
					-- So the stride length equals the data we're looking for, So the BufferView in question
						IS NOT Interleaved.

					By the looks of things. If the Accessor.bufferView number is shared between BufferViews
					then there is a good chance its really Interleaved. Its ashame that things can be designed
					to be more straight forward when it comes to Interleaved and Non-Interleaved data.
				 */

				// console.log("BView", bView );
				// console.log("Accessor", acc );

				let stride	= bView.byteStride,					// Stride Length in bytes
					elmCnt	= acc.count, 						// How many stride elements exist.
					bOffset	= (bView.byteOffset || 0), 			// Buffer Offset
					sOffset	= (acc.byteOffset || 0),			// Stride Offset
					bPer	= TAry.BYTES_PER_ELEMENT,			// How many bytes to make one value of the data type
					aryLen	= elmCnt * compLen,					// How many "floats/ints" need for this array
					dView 	= new DataView( bin ),				// Access to Binary Array Buffer
					p 		= 0, 								// Position Index of Byte Array
					j 		= 0, 								// Loop Component Length ( Like a Vec3 at a time )
					k 		= 0;								// Position Index of new Type Array

				ary	= new TAry( aryLen );						//Final Array

				//Loop for each element of by stride
				for(var i=0; i < elmCnt; i++){
					// Buffer Offset + (Total Stride * Element Index) + Sub Offset within Stride Component
					p = bOffset + ( stride * i ) + sOffset;	//Calc Starting position for the stride of data

					//Then loop by compLen to grab stuff out of the DataView and into the Typed Array
					for(j=0; j < compLen; j++) ary[ k++ ] = dView[ DFunc ]( p + (j * bPer) , true );
				}

				out.data = ary;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Data is NOT Interleaved
			// https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#data-alignment
			// TArray example from documentation works pretty well for data that is not interleaved.
			}else{
				if( spec_only ){
					out.array_type 	= TAry.name.substring( 0, TAry.name.length - 5 );
					out.byte_start 	= ( acc.byteOffset || 0 ) + ( bView.byteOffset || 0 );
					out.byte_cnt	= acc.count * compLen * TAry.BYTES_PER_ELEMENT;
					//console.log( bin );
				}else{
					let bOffset	= ( acc.byteOffset || 0 ) + ( bView.byteOffset || 0 );
					out.data = new TAry( bin, bOffset, acc.count * compLen ); // ElementCount * ComponentLength
				}
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			return out;
		}


	////////////////////////////////////////////////////////
	// MESH
	////////////////////////////////////////////////////////
		/**
		* Returns the geometry data for all the primatives that make up a Mesh based on the name
		* that the mesh appears in the nodes list.
		* @param {string} name - Name of a node in the GLTF Json file
		* @param {object} json - GLTF Json Object
		* @param {ArrayBuffer} bin - Array buffer of a bin file
		* @param {bool} specOnly - Returns only Buffer Spec data related to the Bin File
		* @public @return {Array.{name,mode,position,vertices,normal,uv,weights,joints}}
		*/
		static get_mesh( name, json, bin, spec_only = false ){
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Find Mesh to parse out.
			let i, n = null, mesh_idx = null;
			for( i of json.nodes ){
				if( i.name === name && i.mesh != undefined ){ n = i; mesh_idx = n.mesh; break; }
			}

			//No node Found, Try looking in mesh array for the name.
			if( !n ){
				for( i=0; i < json.meshes.length; i++ ) if( json.meshes[i].name == name ){ mesh_idx = i; break; }
			}

			if( mesh_idx == null ){
				console.error( "Node or Mesh by the name", name, "not found in GLTF" );
				return null;
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Loop through all the primatives that make up a single mesh
			let m 		= json.meshes[ mesh_idx ],
				pLen 	= m.primitives.length,
				ary		= new Array( pLen ),
				itm,
				prim,
				attr;

			for( let i=0; i < pLen; i++ ){
				//.......................................
				// Setup some vars
				prim	= m.primitives[ i ];
				attr	= prim.attributes;
				itm		= { 
					name	: name + (( pLen != 1 )? "_p" + i : ""),
					mode 	: ( prim.mode != undefined )? prim.mode : Gltf.MODE_TRIANGLES
				};

				//.......................................
				// Save Position, Rotation and Scale if Available.
				if( n ){
					if( n.translation ) itm.position	= n.translation.slice( 0 );
					if( n.rotation )	itm.rotation	= n.rotation.slice( 0 );
					if( n.scale )		itm.scale		= n.scale.slice( 0 );
				}

				//.......................................
				// Parse out all the raw Geometry Data from the Bin file
				itm.vertices = Gltf.parse_accessor( attr.POSITION, json, bin, spec_only );
				if( prim.indices != undefined ) 		itm.indices	= Gltf.parse_accessor( prim.indices,	json, bin, spec_only );
				if( attr.NORMAL != undefined )			itm.normal	= Gltf.parse_accessor( attr.NORMAL,		json, bin, spec_only );
				if( attr.TEXCOORD_0 != undefined )		itm.uv		= Gltf.parse_accessor( attr.TEXCOORD_0,	json, bin, spec_only );
				if( attr.WEIGHTS_0 != undefined )		itm.weights	= Gltf.parse_accessor( attr.WEIGHTS_0,	json, bin, spec_only ); 
				if( attr.JOINTS_0 != undefined )		itm.joints	= Gltf.parse_accessor( attr.JOINTS_0,	json, bin, spec_only );

				//.......................................
				// Save to return array
				ary[ i ] = itm;
			}

			return ary;
		}


	////////////////////////////////////////////////////////
	// SKIN
	// https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#skins
	// https://github.com/KhronosGroup/glTF-Tutorials/blob/master/gltfTutorial/gltfTutorial_020_Skins.md
	////////////////////////////////////////////////////////
				
		// This one uses the Inverted Bind Matrices in the bin file then converts
		// to local space transforms.
		static get_skin( json, bin, name=null, node_info=null ){
			if( !json.skins ){
				console.error( "There is no skin in the GLTF file." );
				return null;
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Skin Checking
			let ji, skin = null;
			if( name != null ){
				for( ji of json.skins ) if( ji.name == name ){ skin = ji; break; }
				if( !skin ){ console.error( "skin not found", name ); return null; }
			}else{
				// Not requesting one, Use the first one available
				for( ji of json.skins ){ 
					skin = ji;
					name = ji.name; // Need name to fill in node_info
					break;
				}
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Create Bone Items
			let boneCnt = skin.joints.length,
				bones 	= new Array(boneCnt),
				n2j 	= {},			// Lookup table to link Parent-Child (Node Idx to Joint Idx) Key:NodeIdx, Value:JointIdx
				n, 						// Node
				ni, 					// Node Index
				itm;					// Bone Item

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Create Bone Array and Loopup Table.
			for(ji=0; ji < boneCnt; ji++ ){
				ni				= skin.joints[ ji ];
				n2j[ "n"+ni ] 	= ji;

				bones[ ji ] = {
					idx : ji, p_idx : null, lvl : 0, name : null,
					pos : null, rot : null, scl : null };
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Get Bone's name and set it's parent index value
			for( ji=0; ji < boneCnt; ji++){
				n				= json.nodes[ skin.joints[ ji ] ];
				itm 			= bones[ ji ];
				
				// Each Bone Needs a Name, create one if one does not exist.
				if( n.name === undefined || n.name == "" )	itm.name = "bone_" + ji;
				else{
					itm.name = n.name.replace("mixamorig:", "");
				} 										

				// Set Children who the parent is.
				if( n.children && n.children.length > 0 ){
					for( ni of n.children ) bones[ n2j["n"+ni] ].p_idx = ji;
				}
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Set the Hierarchy Level for each bone
			let lvl;
			for( ji=0; ji < boneCnt; ji++){
				// Check for Root Bones
				itm = bones[ ji ];
				if( itm.p_idx == null ){ itm.lvl = 0; continue; }

				// Traverse up the tree to count how far down the bone is
				lvl = 0;
				while( itm.p_idx != null ){ lvl++; itm = bones[ itm.p_idx ]; }

				bones[ ji ].lvl = lvl;
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Get Parent Node Transform, Node with the same name as the armature.
			if( node_info ){
				for( ji of json.nodes ){ 
					if( ji.name == name ){ 
						if( ji.rotation )	node_info["rot"] = ji.rotation;
						if( ji.scale )		node_info["scl"] = ji.scale;
						if( ji.position )	node_info["pos"] = ji.position;
						break;
					}
				}
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Bind Pose from Inverted Model Space Matrices
			let bind		= Gltf.parse_accessor( skin.inverseBindMatrices, json, bin ),
				m0			= new Mat4(),
				m1			= new Mat4(),
				near_one	= ( v )=>{	// Need to cleanup scale, ex: 0.9999 is pretty much 1
					if(1 - Math.abs(v[0]) <= 1e-4) v[0] = 1;
					if(1 - Math.abs(v[1]) <= 1e-4) v[1] = 1;
					if(1 - Math.abs(v[2]) <= 1e-4) v[2] = 1;
					return v;
				};

			for( ji=0; ji < boneCnt; ji++ ){
				itm = bones[ ji ];

				// If no parent bone, The inverse is enough
				if( itm.p_idx == null ){
					m1.copy( bind.data, ji * 16 ).invert();

				// if parent exists, keep it parent inverted since thats how it exists in gltf
				// BUT invert the child bone then multiple to get local space matrix.
				// parent_worldspace_mat4_invert * child_worldspace_mat4 = child_localspace_mat4
				}else{
					m0.copy( bind.data, itm.p_idx * 16 );	// Parent Bone Inverted
					m1.copy( bind.data, ji * 16 ).invert();	// Child Bone UN-Inverted
					Mat4.mul( m0, m1, m1 );
				}

				itm.pos = m1.get_translation( new Vec3() ).near_zero();
				itm.rot = m1.get_rotation( new Quat() ).norm();
				itm.scl = near_one( m1.get_scale( new Vec3() ) );
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			return bones;
		}

		// Uses the nodes to get the local space bind pose transform. But the real bind pose
		// isn't always available there, blender export has a habit of using the current pose/frame in nodes.
		static get_skin_by_nodes( json, name=null, node_info=null ){
			if( !json.skins ){
				console.error( "There is no skin in the GLTF file." );
				return null;
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Skin Checking
			let ji, skin = null;
			if( name != null ){
				for( ji of json.skins ) if( ji.name == name ){ skin = ji; break; }
				if( !skin ){ console.error( "skin not found", name ); return null; }
			}else{
				// Not requesting one, Use the first one available
				for( ji of json.skins ){ 
					skin = ji;
					name = ji.name; // Need name to fill in node_info
					break;
				}
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Create Bone Items
			let boneCnt = skin.joints.length,
				bones 	= new Array(boneCnt),
				n2j 	= {},			// Lookup table to link Parent-Child (Node to Joint Indexes)
				n, 						// Node
				ni, 					// Node Index
				itm;					// Bone Item

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Create Bone Array and Loopup Table.
			for(ji=0; ji < boneCnt; ji++ ){
				ni				= skin.joints[ ji ];
				n2j[ "n"+ni ] 	= ji;

				bones[ ji ] = {
					idx : ji, p_idx : null, lvl : 0, name : null,
					pos : null, rot : null, scl : null };
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Collect bone information, inc
			for( ji=0; ji < boneCnt; ji++){
				n				= json.nodes[ skin.joints[ ji ] ];
				itm 			= bones[ ji ];

				// Get Transform Data if Available
				if( n.translation ) 	itm.pos = n.translation.slice(0);
				if( n.rotation ) 		itm.rot = n.rotation.slice(0);
				
				// Each Bone Needs a Name, create one if one does not exist.
				if( n.name === undefined || n.name == "" )	itm.name = "bone_" + ji;
				else{
					itm.name = n.name.replace("mixamorig:", "");
				} 										

				// Scale isn't always available
				if( n.scale ){
					// Near Zero Testing, Clean up the data because of Floating point issues.
					itm.scl		= n.scale.slice(0);
					if( Math.abs( 1 - itm.scl[0] ) <= 0.000001 ) itm.scl[0] = 1;
					if( Math.abs( 1 - itm.scl[1] ) <= 0.000001 ) itm.scl[1] = 1;
					if( Math.abs( 1 - itm.scl[2] ) <= 0.000001 ) itm.scl[2] = 1;
				}

				// Set Children who the parent is.
				if( n.children && n.children.length > 0 ){
					for( ni of n.children ) bones[ n2j["n"+ni] ].p_idx = ji;
				}
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Set the Hierarchy Level for each bone
			let lvl;
			for( ji=0; ji < boneCnt; ji++){
				// Check for Root Bones
				itm = bones[ ji ];
				if( itm.p_idx == null ){ itm.lvl = 0; continue; }

				// Traverse up the tree to count how far down the bone is
				lvl = 0;
				while( itm.p_idx != null ){ lvl++; itm = bones[ itm.p_idx ]; }

				bones[ ji ].lvl = lvl;
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Set the Hierarchy Level for each bone
			if( node_info ){
				for( ji of json.nodes ){ 
					if( ji.name == name ){ 
						if( ji.rotation )	node_info["rot"] = ji.rotation;
						if( ji.scale )		node_info["scl"] = ji.scale;
						if( ji.position )	node_info["pos"] = ji.position;
						break;
					}
				}
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			return bones;
		}

	////////////////////////////////////////////////////////
	// ANIMATION
	////////////////////////////////////////////////////////
		/*
		https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#animations
		https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#appendix-c-spline-interpolation (Has math for cubic spline)

		animation = {
			frame_cnt		: int
			time			: float,
			times			: [ float32array, float32array, etc ],
			tracks			: [
				{ 
					type		: "rot || pos || scl",
					time_idx 	: 0,
					joint_idx	: 0,
					lerp 		: "LINEAR || STEP || CUBICSPLINE",
					data		: float32array,
				},
			]
		}
		*/
		static get_animation( json, bin, name=null, limit=true ){
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Validate there is animations and an anaimtion by a name exists in the json file.
			if( json.animations === undefined || json.animations.length == 0 ){ console.error("There is no animations in gltf"); return null; }

			let i, a = null;
			if( name ){
				for( i of json.animations ) if( i.name === name ){ a = i; break; }
				if( !a ){ console.error("Animation by the name", name, "not found in GLTF"); return null; }
			}else a = json.animations[ 0 ]; // No Name, Grab First One.

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Create Lookup Table For Node Index to Bone Index.
			let joints	= {},
				j_ary	= json.skins[ 0 ].joints;

			for( i=0; i < j_ary.length; i++ ){ 
				joints[ j_ary[i] ] = i; // Node Index to Joint Index
				//console.log( "Idx :", i, " Name: ", json.nodes[ j_ary[i] ].name );
			}
			
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let chi = 0, ch, s, n, prop,
				t_idx, n_name, s_time,
				ch_ary		= [],	// Store all the channel information structs
				time_ary	= [],	// Shared Time Information between Tracks
				time_tbl	= {},	// Keep Track of Time Accessor ID thats been extracted
				time_max	= 0,	// Max Time of the Track Animations
				frame_max	= 0;

			for( chi=0; chi < a.channels.length; chi++ ){
				//.......................
				// Must check that the channel points to a node that the animation is attached to.
				ch = a.channels[ chi ];
				if( ch.target.node == undefined ) continue;
				n = ch.target.node;

				if( joints[ n ] == undefined ){
					console.log("Channel's target node is not a joint of the first skin.");
					continue;
				}

				//.......................
				// User a smaller property name then what GLTF uses.
				switch( ch.target.path ){
					case "rotation"		: prop = "rot"; break;
					case "translation"	: prop = "pos"; break;
					case "scale"		: prop = "scl"; break;
					default: console.log( "unknown channel path", ch.path ); continue;
				}

				//.......................
				// When limit it set, only want rotation tracks and if its the hip, position to.
				n_name = json.nodes[ n ].name.toLowerCase();

				if( limit && 
					!( prop == "rot" ||  
						( n_name.indexOf("hip") != -1 && prop == "pos" )
					) 
				) continue;

				//.......................
				// Parse out the Sampler Data from the Bin file.
				s = a.samplers[ ch.sampler ];

				// Get Time for all keyframes, cache it since its shared.
				t_idx = time_tbl[ s.input ];
				if( t_idx == undefined ){
					time_tbl[ s.input ] = t_idx = time_ary.length;
					s_time = this.parse_accessor( s.input, json, bin );

					time_ary.push( s_time.data );

					time_max	= Math.max( time_max, s_time.max[0] );
					frame_max	= Math.max( frame_max, s_time.data.length );
				}

				//.......................
				// Get the changing value per frame for the property
				ch_ary.push({
					type		: prop,
					time_idx 	: t_idx,
					joint_idx	: joints[ n ],
					interp 		: s.interpolation,
					data		: this.parse_accessor( s.output, json, bin ).data,
				});
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let rtn = { time:time_max, frame_cnt: frame_max, times: time_ary, tracks:ch_ary };
			return rtn;
		}


	////////////////////////////////////////////////////////
	// MISC
	////////////////////////////////////////////////////////
		
		// Binary Buffer can exist in GLTF file encoded in base64. 
		// This function converts the data into an ArrayBuffer.
		static parse_b64_buffer( json ){
			let buf = json.buffers[ 0 ];
			if( buf.uri.substr(0,5) != "data:" ) return null;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Create and Fill DataView with buffer data
			let pos		= buf.uri.indexOf( "base64," ) + 7,
				blob	= window.atob( buf.uri.substr( pos ) ),
				ary_buf = new ArrayBuffer( blob.length ),
				dv		= new DataView( ary_buf );

			for( let i=0; i < blob.length; i++ ) dv.setUint8( i, blob.charCodeAt( i ) );

			return ary_buf;
		}
}

////////////////////////////////////////////////////////
// CONSTANTS
////////////////////////////////////////////////////////
	Gltf.MODE_POINTS 			= 0;		// Mode Constants for GLTF and WebGL are identical
	Gltf.MODE_LINES				= 1;		// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Constants
	Gltf.MODE_LINE_LOOP			= 2;
	Gltf.MODE_LINE_STRIP		= 3;
	Gltf.MODE_TRIANGLES			= 4;
	Gltf.MODE_TRIANGLE_STRIP	= 5;
	Gltf.MODE_TRIANGLE_FAN		= 6;

	Gltf.TYPE_BYTE				= 5120;
	Gltf.TYPE_UNSIGNED_BYTE		= 5121;
	Gltf.TYPE_SHORT				= 5122;
	Gltf.TYPE_UNSIGNED_SHORT	= 5123;
	Gltf.TYPE_UNSIGNED_INT		= 5125;
	Gltf.TYPE_FLOAT				= 5126;

	Gltf.COMP_SCALAR			= 1;		// Component Length based on Type
	Gltf.COMP_VEC2				= 2;
	Gltf.COMP_VEC3				= 3;
	Gltf.COMP_VEC4				= 4;
	Gltf.COMP_MAT2				= 4;
	Gltf.COMP_MAT3				= 9;
	Gltf.COMP_MAT4				= 16;

	Gltf.TARGET_ARY_BUF			= 34962;	// bufferview.target
	Gltf.TARGET_ELM_ARY_BUF		= 34963;

//###############################################################################
export default Gltf;