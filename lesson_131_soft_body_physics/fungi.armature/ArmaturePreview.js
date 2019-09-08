import App			from "../fungi/engine/App.js";
import Vao			from "../fungi/core/Vao.js";
import gl			from "../fungi/core/gl.js";
import Shader			from "../fungi/core/Shader.js";
import { Entity, Components, System } from "../fungi/engine/Ecs.js";

const ATTRIB_ROT_LOC = 8;
const ATTRIB_POS_LOC = 9;
const ATTRIB_SCL_LOC = 11;
const ATTRIB_LEN_LOC = 10;

//#################################################################
	function geoDiamond(){
		const	pxz	= 0.06,
				py	= 0.1;

		const verts	= [
			0, 0, 0, 0,				// 0 Bottom
			0, 1, 0, 1,				// 1 Top
			-pxz, py,  pxz, 0,		// 2 Bot Left
			 pxz, py,  pxz, 0,		// 3 Bot Right
			 pxz, py, -pxz, 0,		// 4 Top Right
			-pxz, py, -pxz, 0		// 5 Top Left
		];

		const faces = [ 1,2,3, 1,3,4,  1,4,5,  1,5,2,
						 0,3,2, 0,4,3,  0,5,4,  0,2,5 ];

		return { verts, faces, mode:4 }; // Try = 4
	}

	function geoDiamondWire(){
		const	pxz	= 0.015,
				py	= 0.015;

		const verts	= [
			0, 0, 0, 0,				// 0 Bottom
			0, 1, 0, 1,				// 1 Top
			-pxz, py,  pxz, 0,		// 2 Bot Left
			 pxz, py,  pxz, 0,		// 3 Bot Right
			 pxz, py, -pxz, 0,		// 4 Top Right
			-pxz, py, -pxz, 0		// 5 Top Left
		];

		const faces = [ 1,2,1,3,1,4,1,5,
						0,2,0,3,0,4,0,5,
						2,3,3,4,4,5,5,2 ];

		const colors = [
			0.5, 0.5, 0.5,
			1, 0, 0,
			0.5, 0.5, 0.5,
			0.5, 0.5, 0.5,
			0.5, 0.5, 0.5,
			0.5, 0.5, 0.5,
		];

		return { verts, faces, colors, mode:1 }; // Line = 1
	}

	function geoAxis(){
		const	x	= 0.035,
				z	= 0.035;

		const verts	= [
			0, 0, 0, 0,				// 0 Bottom
			0, 1, 0, 1,				// 1 Top
			x, 0, 0, 0,
			0, 0, z, 0,
		];

		const colors = [
			0.4, 0.4, 0.4,
			0.7, 0.7, 0.7,
			1, 0, 0,
			0, 0.7, 0,
		];

		const faces = [ 0, 1, 0, 2, 0, 3, 1, 2, 1, 3, 2, 3 ];

		return { verts, faces, colors, mode:1 }; // Line = 1
	}

	function buildPreviewVao( e, mat, meshType ){
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		let geo;
		switch( meshType ){
			case 0: geo = geoDiamondWire(); break;	// Wire Diamond
			case 1: geo = geoDiamond(); break;		// Solid Diamond
			case 2: geo = geoAxis(); break;			// Axis
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Get a list of length of the bone that the joint represent
		let boneCnt	= e.Armature.bones.length,
			aryLen	= new Float32Array( boneCnt );

		for(let i=0; i < boneCnt; i++) aryLen[i] = e.Armature.bones[i].Bone.length;

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		let elmCount	= 0,
			vao	= new Vao();

		Vao.bind( vao )
			.setInstanced( vao, boneCnt )
			.floatBuffer( vao, "vertex", 		geo.verts,		Shader.POSITION_LOC, 	4 )
			.floatBuffer( vao, "colors",		geo.colors,		Shader.COL_LOC,			3 )
			.floatBuffer( vao, "bonelength",	aryLen,			ATTRIB_LEN_LOC, 1, 0, 0, false, true )
			.emptyFloatBuffer( vao, "rotation",	boneCnt*4*4,	ATTRIB_ROT_LOC, 4, 0, 0, false, true )
			.emptyFloatBuffer( vao, "position",	boneCnt*3*4, 	ATTRIB_POS_LOC, 3, 0, 0, false, true )
			.emptyFloatBuffer( vao, "scale",	boneCnt*3*4,	ATTRIB_SCL_LOC, 3, 0, 0, false, true );

		if( geo.faces ){
			Vao.indexBuffer( vao, "index", geo.faces );
			elmCount = geo.faces.length;
		}else{
			elmCount = geo.verts.length / 4;
		}

		Vao.finalize( vao, e.info.name + "_preview", elmCount );


		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		e.Draw.add( vao, mat, geo.mode );
		e.ArmaturePreview.vao = vao;
		return vao;
	}


//#################################################################
/** Create a preview mesh of armature bones */
class ArmaturePreview{
	constructor(){
		this.flatRotation	= null;
		this.flatPosition	= null;
		this.flatScale 		= null;
		this.vao			= null;
	}

	/////////////////////////////////////////////////
	//
	/////////////////////////////////////////////////
		static $( e, mat="ArmaturePreview", meshType = 0 ){
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Check for Dependancies
			if( !e.Draw || !e.Armature || !e.Node ){
				console.error( "ArmaturePreview needs an entity with the following components: Draw, Armmature, Node" );
				return e;
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Check for Bonwa
			let bLen = e.Armature.bones.length;
			if( bLen == 0 ){
				console.error( "Armature does not have any bones, Bones Needed for ArmaturePreview");
				return e;
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Create component then create Type arrays to hold flatten data.
			let ap = new ArmaturePreview();
			ap.flatRotation	= new Float32Array( bLen * 4 );
			ap.flatPosition	= new Float32Array( bLen * 3 );
			ap.flatScale	= new Float32Array( bLen * 3 );
			Entity.com_add( e, ap );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			buildPreviewVao( e, mat, meshType );

			return e;
		}


	/////////////////////////////////////////////////
	//
	/////////////////////////////////////////////////
		static flattenData( e ){
			let i, ii, iii, nw, 
				arm = e.Armature,
				ap 	= e.ArmaturePreview,
				pos = ap.flatPosition,
				rot = ap.flatRotation,
				scl = ap.flatScale;

			for( i=0; i < arm.bones.length; i++ ){
				nw	= arm.bones[i].Node.world;
				ii	= i * 4;
				iii	= i * 3;

				rot[ii+0]	= nw.rot[0];
				rot[ii+1]	= nw.rot[1];
				rot[ii+2]	= nw.rot[2];
				rot[ii+3]	= nw.rot[3];

				pos[iii+0]	= nw.pos[0];
				pos[iii+1]	= nw.pos[1];
				pos[iii+2]	= nw.pos[2];

				scl[iii+0]	= nw.scl[0];
				scl[iii+1]	= nw.scl[1];
				scl[iii+2]	= nw.scl[2];
			}

			return this;
		}

		static updateBuffer( e ){
			let ap 	= e.ArmaturePreview;

			gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, ap.vao.buf.rotation.id);
			gl.ctx.bufferSubData(gl.ctx.ARRAY_BUFFER, 0, ap.flatRotation, 0, null);

			gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, ap.vao.buf.position.id);
			gl.ctx.bufferSubData(gl.ctx.ARRAY_BUFFER, 0, ap.flatPosition, 0, null);

			gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, ap.vao.buf.scale.id);
			gl.ctx.bufferSubData(gl.ctx.ARRAY_BUFFER, 0, ap.flatScale, 0, null);

			gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, null);

			return this;
		}
} Components( ArmaturePreview );



//#################################################################
const QUERY_COM		= [ "Armature", "ArmaturePreview" ];
class ArmaturePreviewSystem extends System{
	static init( ecs, priority = 810 ){
		ecs.sys_add( new ArmaturePreviewSystem(), priority );
	}

	run( ecs ){
		let e, ary = ecs.query_entities( QUERY_COM );
		for( e of ary ){
			if( e.Armature.isModified ){
				ArmaturePreview.flattenData( e );
				ArmaturePreview.updateBuffer( e );
			}
		}
	}
}


//#################################################################
export default ArmaturePreview;
export { ArmaturePreviewSystem };