import Downloader, { HandlerTypes }	from "../fungi/engine/lib/Downloader.js";
import App, { Vao } 				from "../fungi/engine/App.js";

import Armature			from "../fungi.armature/Armature.js";
import ArmaturePreview 	from "../fungi.armature/ArmaturePreview.js";

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
		static parseAccessor( idx, json, bin, specOnly = false ){
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
				elmCount	: acc.count,
				compLen 	: compLen
			};

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Data is Interleaved
			if( bView.byteStride ){
				if( specOnly ) console.error( "GLTF STRIDE SPEC ONLY OPTION NEEDS TO BE IMPLEMENTED ");
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
				if( specOnly ){
					out.arrayType 	= TAry.name.substring( 0, TAry.name.length - 5 );
					out.byteStart 	= ( acc.byteOffset || 0 ) + ( bView.byteOffset || 0 );
					out.byteLen		= acc.count * compLen * TAry.BYTES_PER_ELEMENT;
					//console.log( bin );
				}else{
					let bOffset	= ( acc.byteOffset || 0 ) + ( bView.byteOffset || 0 )
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
		static getMesh( name, json, bin, specOnly = false ){
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Find Mesh to parse out.
			let i, n = null, mesh_idx = null;
			for( i of json.nodes ) if( i.name === name && i.mesh != undefined ){ n = i; mesh_idx = n.mesh; break; }

			//No node Found, Try looking in mesh array for the name.
			if( !n ){
				for(i=0; i < json.meshes.length; i++ ) if( json.meshes[i].name == name ){ mesh_idx = i; break; }
			}

			if( mesh_idx == null ){
				console.error("Node or Mesh by the name", name, "not found in GLTF");
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
				itm.vertices = Gltf.parseAccessor( attr.POSITION, json, bin, specOnly );
				if( prim.indices != undefined ) 		itm.indices	= Gltf.parseAccessor( prim.indices,		json, bin, specOnly );
				if( attr.NORMAL != undefined )			itm.normal	= Gltf.parseAccessor( attr.NORMAL,		json, bin, specOnly );
				if( attr.TEXCOORD_0 != undefined )		itm.uv		= Gltf.parseAccessor( attr.TEXCOORD_0,	json, bin, specOnly );
				if( attr.WEIGHTS_0 != undefined )		itm.weights	= Gltf.parseAccessor( attr.WEIGHTS_0,	json, bin, specOnly ); 
				if( attr.JOINTS_0 != undefined )		itm.joints	= Gltf.parseAccessor( attr.JOINTS_0,	json, bin, specOnly );

				//.......................................
				// Save to return array
				ary[ i ] = itm;
			}

			return ary;
		}


	////////////////////////////////////////////////////////
	// SKIN
	////////////////////////////////////////////////////////
		
		//INFO : https://github.com/KhronosGroup/glTF-Tutorials/blob/master/gltfTutorial/gltfTutorial_020_Skins.md
		static getSkin( name, json, node_info=null ){
			if( !json.skins ){
				console.error( "There is no skin in the GLTF file." );
				return null;
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let ji, skin = null;
			for( ji of json.skins ) if( ji.name == name ){ skin = ji; break; }

			if( !skin ){ console.error( "skin not found", name ); return null; }

			//skin.inverseBindMatrices = Accessor Idx for the BindPose for each joint.
			//skin.skeleton - Node Index of Root Bone (Optional, may need to find it yourself)

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
					// Near One Testing, Clean up the data because of Floating point issues.
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
	// Animation
	////////////////////////////////////////////////////////
		static getSkinAnimation( name, json, bin ){
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Validate there is animations and an anaimtion by a name exists in the json file.
			if( json.animations === undefined || json.animations.length == 0 ){ console.error("There is no animations in gltf"); return null; }

			let i, a = null;
			for( i of json.animations ) if( i.name === name ){ a = i; break; }

			if( !a ){ console.error("Animation by the name", name, "not found in GLTF"); return null; }


			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~		
			// Create Lookup table for Node to Joint. Each Joint will be updated with pos, rot or scl data.
			let tbl		= {},
				itms 	= json.skins[0].joints;
			for( i=0; i < itms.length; i++ ) tbl[ itms[i] ] = { bone_idx: i };


			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			//Process Channels and pull out the sampling data ( Rot, Pos, Scl & Time Stamp for Each );
			let chi = 0, ch, s, n, prop, tData, dData ;

			for( chi=0; chi < a.channels.length; chi++ ){
				//.......................
				// Must check that the channel points to a node that the animation is attached to.
				ch = a.channels[ chi ];
				if( ch.target.node == undefined ) continue;
				n = ch.target.node;

				if( !tbl[ n ] ){
					console.log("Channel's target node is not joint of the first skin.");
					continue;
				}

				//.......................
				// User a smaller pproperty name then what GLTF uses.
				switch( ch.target.path ){
					case "translation"	: prop = "pos"; break;
					case "rotation"		: prop = "rot"; break;
					case "scale"		: prop = "scl"; break;
					default: console.log( "unknown channel path", ch.path ); continue;
				}

				//.......................
				// Parse out the Sampler Data from the Bin file.
				s		= a.samplers[ ch.sampler ];
				tData	= this.parseAccessor( s.input, json, bin );		// Get Time for all keyframes
				dData	= this.parseAccessor( s.output, json, bin );	// Get Value that changes per keyframe

				// Using the Node Index, Save it to the lookup table with the prop name.
				tbl[ n ][ prop ] = { time: tData.data, data: dData.data, lerp:s.interpolation };
			}

			return tbl;
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

// Hacking the prototype is to be frawned apo, but it makes a better API usage.
Downloader.prototype.addGLTF = function( name, file, matName, meshNames, skinName=null, loadSkin=true, loadPrev=true ){
	this._queue.push( { name, matName, 
		handler		: "gltf", 
		meshNames,
		skinName,
		loadSkin,
		loadPrev,
		files 	: [
			{ url: file + ".gltf", type:"json" },
			{ url: file + ".bin", type:"arraybuffer" }
		]
	});
	return this;
}

HandlerTypes.gltf = class{
	static downloaded( dl, xhr ){
		switch( xhr.activeItem.files.length ){
			case 1: xhr.activeItem.json	= xhr.response; break;
			case 0: xhr.activeItem.bin	= xhr.response; break;
		}
	}

	static load( dl ){
		let e, bones;
		for( let i of dl.gltf ){
			e = this.meshEntity( i.name, i.matName, i.meshNames, i.json, i.bin );

			if( i.skinName ){
				Armature.$( e );
				let bones = Gltf.getSkin( i.skinName, i.json );
				this.loadBones( e, bones );

				//console.log( JSON.stringify( Armature.serialize( e.Armature, false ) ) );
				if( i.loadPrev )  ArmaturePreview.$( e, "ArmaturePreview", 2 );
			}
		}
		return true;
	}

	static meshEntity( name, matName, meshNames, json, bin ){
		let e = App.$Draw( name );
		let prims, p, vao, mName;

		for( mName of meshNames ){
			prims = Gltf.getMesh( mName, json, bin, true ); // Spec Only
			for( p of prims ){
				vao = Vao.buildFromBin( name + "_" + p.name, p, bin );
				e.Draw.add( vao, matName, p.mode );
			}
			//This only Works if each Primitive is its own Entity, but not for meshes broken out as pieces 
			//and each piece shares the same main mesh local space
			//if( p.rotation )	e.Node.setRot( p.rotation );
			//if( p.position )	e.Node.setPos( p.position );
			//if( p.scale ) 	e.Node.setScl( p.scale );
		}

		return e;
	}

	static loadBones( e, bones ){
		let arm = e.Armature;	

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Create Bones
		let i, b, ab, bLen = bones.length;
		for( i=0; i < bLen; i++ ){
			b	= bones[i];
			ab	= Armature.addBone( arm, b.name, 1, null, b.idx );

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
			if( b.p_idx != null ) App.node.addChild( arm.bones[ b.p_idx ], ab, false );

			// Manual set node level, Must do it after addChild, else it will get overwritten.
			ab.Node.level = b.lvl; 
		}
		Armature.finalize( e );	//This updates World Transforms

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// With the WorldTransforms update, Calculate the Length of each bone.
		for( i=0; i < bLen; i++ ){
			ab	= arm.bones[ i ];
			if( ab.Node.children.length == 0 ){
				ab.Bone.length = 0.03;
				continue;
			}

			b = ab.Node.children[0].Node.world;					// First Child's World Space Transform
			ab.Bone.length = ab.Node.world.pos.length( b.pos );	// Distance from Parent to Child
		}
	}

}; HandlerTypes.gltf.priority = 100;


//###############################################################################
export default Gltf;