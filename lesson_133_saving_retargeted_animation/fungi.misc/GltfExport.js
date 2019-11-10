//import App			from "../fungi/engine/App.js";
import Mat4			from "../fungi/maths/Mat4.js";
import Transform	from "../fungi/maths/Transform.js";

class GltfExport{
	constructor(){
		this.nodes			= new Array();
		this.skins			= new Array();
		this.meshes			= new Array();
		this.animations		= new Array();

		this.vaos 			= new Array(); // Extra Fungi Data;

		this.accessors		= new Array();
		this.buffer_views	= new Array();

		this.buf_size 		= 0;
	}

	///////////////////////////////////////////////////////////////////////
	// NODES { name:"", mesh:0, skin:0, children:[], rotation:[], scale:[], translation:[] }
	///////////////////////////////////////////////////////////////////////
		add_node( name, is_joint=false ){
			let ni = this.nodes.length;

			let n = { name };
			if( is_joint ) n.is_joint = true;
			
			this.nodes.push( n );
			return ni;
		}

		set_node_mesh( n_idx, m_idx ){ this.nodes[ n_idx ].mesh = m_idx; return this; }
		set_node_skin( n_idx, s_idx ){ this.nodes[ n_idx ].skin = s_idx; return this; }
		set_node_transform( n_idx, rot=null, pos=null, scl=null ){
			let n = this.nodes[ n_idx ];

			if( rot ) n.rotation 	= Array.from(rot);
			if( pos ) n.translation	= Array.from(pos);
			if( scl ) n.scale		= Array.from(scl);

			return this;
		}

		add_node_child( pi, ci ){
			let n = this.nodes[ pi ];
			if( !n.children ) n.children = new Array();
			n.children.push( ci );
			return this;
		}

	///////////////////////////////////////////////////////////////////////
	// MESHES & PRIMITIVES
	///////////////////////////////////////////////////////////////////////
		/* {	"name" : "",
			"mode" : 4,
			"material" : 3,
			"primitives" : [
				{
					"attributes" : { "POSITION" : 0, "NORMAL" : 1, "JOINTS_0" : 2, "WEIGHTS_0" : 3, TANGENT: 0, TEXCOORD_0: 25 },
					"indices" : 4
				}
			]
		} */

		add_mesh( name, mode=4 ){
			let mi = this.meshes.length;

			this.meshes.push({
				name		: name,
				mode 		: mode,
				primitives	: [],
			});

			return mi;
		}

		add_primitive( m_idx ){
			let m = this.meshes[ m_idx ];

			let p = {
				indices : 0,
				attributes : {},
			};

			m.primitives.push( p );
			return this;
		}

	///////////////////////////////////////////////////////////////////////
	// SKINS
	///////////////////////////////////////////////////////////////////////
		// { "name": "Armature", "inverseBindMatrices" : 5, "joints" : [ Node Indexes ] }
		// bones: [
		// 		{ p_idx, len, lvl }
		// ]
		
		add_skin( name="Armature" ){
			let si = this.skins.length;

			this.skins.push({
				name 				: name,
				joints 				: [],
				bones 				: [], // EXTENDED FUNGI DATA
				//inverseBindMatrices : 0,
			});

			return si;
		}

		add_joint( s_idx, name, p_idx=null, rot=null, pos=null, scl=null, len=0.3 ){
			let s	= this.skins[ s_idx ],
				ji 	= s.joints.length;

			// Create a Node for the Joint
			let ni	= this.add_node( name, true );
			this.set_node_transform( ni, rot, pos, scl );

			// Joints are just an array pointing to Node Index
			s.joints.push( ni );

			// Extra Fungi Information, Store Parent Joint Idx, Length of Bone, and Hierarchy Lvl
			s.bones.push({
				p_idx	: p_idx,
				len 	: len,
				lvl 	: ( p_idx == null )? 0 : s.bones[ p_idx ].lvl + 1,
				//name 	: name,
			})

			// Append new joint node as a child to parent node.
			if( p_idx != null ) this.add_node_child( s.joints[ p_idx ], ni );
			return ji;
		}

		gen_inverse_bind( s_idx ){
			let s		= this.skins[ s_idx ],
				tary	= new Array( s.joints.length ),
				fbuf	= new Float32Array( s.joints.length * 16 ),
				m4		= new Mat4(),
				i,ii,j, n, b, t;

			for( i=0; i < s.joints.length; i++ ){
				n = this.nodes[ s.joints[ i ] ];
				b = s.bones[ i ];

				if( !tary[i] )	t = tary[i] = new Transform();
				else			t = tary[i];

				if( b.p_idx == null )	t.set( n.rotation, n.translation, n.scale );
				else 					t.copy( tary[b.p_idx] ).add( n.rotation, n.translation, n.scale );

				Mat4.fromQuaternionTranslationScale( t.rot, t.pos, t.scl, m4 ).invert();

				ii = i * 16;
				for( j=0; j < 16; j++ ) fbuf[ ii+j ] = m4[ j ];
			}

			s.inverseBindMatrices = this.add_accessor_buffer( fbuf, "MAT4", s.joints.length );
		}
	
	///////////////////////////////////////////////////////////////////////
	// ANIMATIONS
	///////////////////////////////////////////////////////////////////////
		/*
		animations:[
			{
				name		: "ANIMATION_NAME",
				channels	: [
					{ sampler : SAMPLERS_INDEX, target: { node:NODE_INDEX, path:"translation|rotation|scale"} }
				],
				samplers	: [
					{ 	input: ACCESSOR_INDEX_TO_TIME_DATA, 
						output: ACCESSOR_INDEX_TO_TRANSFORM_DATA, 
						interpolation:"LINEAR" }
				]
			}
		]
		*/

		add_animation( frame_cnt, time_max, name="Default" ){
			let i = this.animations.length;
			this.animations.push({
				name		: name,
				frame_cnt 	: frame_cnt,		// Extra Fungi Info
				time_max 	: time_max,			// Extra Fungi Info
				channels 	: new Array(),
				samplers 	: new Array(),
			});

			return i;
		}

		add_anim_channel( ai, sam_idx, node_idx, path ){ //path:"translation|rotation|scale"
			let o = this.animations[ ai ];
			o.channels.push({
				sampler : sam_idx,
				target	: { node:node_idx, path:path },
			});

			return this;
		}

		add_anim_sample( ai, time_accessor_idx, tran_accessor_idx, inter_type="LINEAR" ){
			let o	= this.animations[ ai ],
				si	= o.samplers.length;

			o.samplers.push({
				input			: time_accessor_idx,
				output			: tran_accessor_idx,
				interpolation	: inter_type,
			});

			return si;
		}

	///////////////////////////////////////////////////////////////////////
	// ACCESSORS AND BUFFER VIEWS
	///////////////////////////////////////////////////////////////////////
		// type = SCALAR | VEC2 | VEC3 | VEC4 | MAT2 | MAT3 | MAT4
		// https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#accessors
		//accessors:[
		//	{ bufferView:0, byteOffset:0, componentType:5123, count:12636, max:[4212], min:[0], type: SCALAR }
		//]
		add_accessor_buffer( data, type, elm_cnt, calc_bounds=false ){			
			let com_type = 0, bounds = null;

			if( data instanceof Float32Array ){
				com_type = 5126; // FLOAT
				if( calc_bounds ){
					switch( type ){
						case "SCALAR": bounds = this._calc_bounds_scalar_f32( data ); break;
						default: console.log("Unknown type to calc bounds for accessor:",type); break;
					}
				}
			}else if( data instanceof Uint16Array )	com_type = 5123; // UNSIGNED_SHORT

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let bvi = this.buffer_views.length,
				ai 	= this.accessors.length,
				buf = new Uint8Array( data.buffer );

			this.buffer_views.push({
				buffer 		: 0,
				byteLength	: buf.byteLength,
				byteOffset	: this.buf_size,
				data 		: buf,
			});


			let a = {
				bufferView 		: bvi,
				componentType 	: com_type,
				count			: elm_cnt,
				type 			: type,
				//byteOffset 		: 0, Interleaved Data Only
			};

			if( bounds ){
				a.min = bounds[0];
				a.max = bounds[1];
			}

			this.accessors.push( a );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			this.buf_size += buf.byteLength;
			return ai;
		}

		_calc_bounds_scalar_f32( ary ){
			let i, min = Infinity, max = -Infinity;
			for( i of ary ){
				min = Math.min( min, i );
				max = Math.max( max, i );
			}
			return [ [min], [max] ];
		}

	///////////////////////////////////////////////////////////////////////
	// 
	///////////////////////////////////////////////////////////////////////
		output_bin(){
			let b, buf = new Uint8Array( this.buf_size );

			for( b of this.buffer_views ){
				buf.set( b.data, b.byteOffset );
			}

			//return new Blob( [ buf ], {type: "application/octet-stream"} );
			return buf;
		}

		//Download JSON as a File https://codepen.io/vidhill/pen/bNPEmX
		output_json( fname="model_000" ){
			let buf = '{\n\t"asset":{ "generator":"fungi", "version":"1.0" }\n';
			let i, o;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// MESHES


			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// NODES
			/**/
			buf += '\t,"nodes":[\n';

			for( i=0; i < this.nodes.length; i++ ){
				o = this.nodes[ i ];

				buf += '\t\t';
				if( i != 0 ) buf += ",";

				buf += '{ "name":"'+o.name+'" ';
				buf += ', "rotation":' + JSON.stringify( o.rotation );
				buf += ', "translation":' + JSON.stringify( o.translation );

				if( !o.is_joint )	buf += ', "scale":' + JSON.stringify( o.scale );
				if( o.children )	buf += ', "children":' + JSON.stringify( o.children );

				buf += '}\n';
			}

			buf += '\t]\n';
			
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// SKINS
			/**/
			if( this.skins.length > 0 ){
				buf += '\t,"skins":[\n';

				for( i=0; i < this.skins.length; i++ ){
					o = this.skins[ i ];

					buf += '\t\t';
					if( i != 0 ) buf += ",";

					buf += '{ "name":"'+o.name+'", "inverseBindMatrices":'+ o.inverseBindMatrices +',\n';
					buf += '\t\t\t"joints":' + JSON.stringify( o.joints );
					buf += '\n\t\t\t,"bones":' + JSON.stringify( o.bones ); // Extra Fungi Info
					buf += '}\n';
				}

				buf += '\t]\n';
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// ANIMATIONS
			if( this.animations.length > 0 ){
				buf += '\t,"animations":[\n';

				for( i=0; i < this.animations.length; i++ ){
					o = this.animations[ i ];

					buf += '\t\t';
					if( i != 0 ) buf += ",";

					buf += '{ "name":"'+o.name+'" ';
					buf += ', "frame_cnt":'+o.frame_cnt+', "time_max":'+o.time_max; // Extra Fungi Info
					buf += '\n\t\t\t,"channels":' + JSON.stringify( o.channels );
					buf += '\n\t\t\t,"samplers":' + JSON.stringify( o.samplers );
					buf += '}\n';
				}

				buf += '\t]\n';
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// ACCESSORS
			/**/
			buf += '\t,"accessors":[\n';
			for( i=0; i < this.accessors.length; i++ ){
				o = this.accessors[ i ];
				buf += '\t\t';
				if( i != 0 ) buf += ",";
				buf += JSON.stringify( o ) + "\n";
			}
			buf += '\t]\n';

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// BUFFERS
			buf += '\t,"bufferViews":[\n';
			for( i=0; i < this.buffer_views.length; i++ ){
				o = this.buffer_views[ i ];
				buf += '\t\t';
				if( i != 0 ) buf += ",";
				buf += '{ "buffer":'+o.buffer+', "byteLength":'+o.byteLength+', "byteOffset":'+ o.byteOffset+' }\n';
			}
			buf += '\t]\n';

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// FINISH UP
			buf += '\t,"buffers": [ { "byteLength" : '+this.buf_size+', "uri" : "'+fname+'.bin"} ] ';
			buf += "}";

			//console.log( buf );
			return buf;
		}
}

export default GltfExport;

//App.global["GltfExport"] = GltfExport;