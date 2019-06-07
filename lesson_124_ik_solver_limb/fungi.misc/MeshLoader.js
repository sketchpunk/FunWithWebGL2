import gl							from "../fungi/core/gl.js";
import Vao, { Buffer }				from "../fungi/core/Vao.js";
import App							from "../fungi/engine/App.js";
import Downloader, { HandlerTypes }	from "../fungi/engine/lib/Downloader.js";
import Armature						from "../fungi.armature/Armature.js";
import ArmaturePreview				from "../fungi.armature/ArmaturePreview.js";

//#############################################################################
const DOPT_VAO		= 1;
const DOPT_ARM		= 2;
const DOPT_PREV		= 4;

const BOPT_IDX		= 1;
const BOPT_UV		= 2;
const BOPT_NORM		= 4;
const BOPT_BWEIGHT	= 8;
const BOPT_BIDX		= 16;


//#############################################################################
// Hacking the prototype is to be frawned apo, but it makes a better API usage.
Downloader.prototype.addEntity = function( name, file, mat_name, draw_opt=1, buf_opt=1, mesh_names=null ){
	this._queue.push({ 
		name,
		draw_opt,
		buf_opt,
		mesh_names,
		mat_name,
		handler		: "entity", 
		files		: [
			{ url: file + ".txt", type:"text" },
			{ url: file + ".bin", type:"arraybuffer" }
		]
	});
	return this;
}

// vert_opt = 1 : Indices, 2: UV, 4:Normals
HandlerTypes.entity = class{
	static downloaded( dl, xhr ){
		switch( xhr.activeItem.files.length ){
			case 1: xhr.activeItem.text	= xhr.response; break;
			case 0: xhr.activeItem.bin	= xhr.response; break;
		}
	}

	static load( dl ){
		let e, d_vao, d_arm, d_prev;

		for( let i of dl.entity ){
			d_vao	= (( i.draw_opt & DOPT_VAO ) != 0);
			d_arm	= (( i.draw_opt & DOPT_ARM ) != 0);
			d_prev	= (( i.draw_opt & DOPT_PREV ) != 0);
			if( !d_vao && !d_arm && !d_prev ) continue;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			e = App.$Draw( i.name );

			if( d_vao ) build_vao( e, i );

			if( d_arm || d_prev ){
				load_bones( Armature.$( e ), i );

				if( !d_arm ) e.Armature.isActive = false; // Disable Arm Rendering
				if( d_prev ) ArmaturePreview.$( e, "ArmaturePreview", 2 );
			}
		}
		return true;
	}
}; HandlerTypes.entity.priority = 100;


//#############################################################################

function parse_section( sec, txt ){
	let aPos = txt.indexOf( "<" + sec + ">" ) + sec.length + 2;
	let bPos = txt.indexOf( "</" + sec + ">" );

	if( aPos == -1 || bPos == -1 || bPos <= aPos ) return null;

	let tmp	= txt.substring( aPos, bPos );

	try{ return JSON.parse( tmp ); }
	catch(err){ console.error( err.message, "\n" , tmp ); }

	return null;
}

function build_vao( e, info ){
	let json	= parse_section( "Vao", info.text ),
		b_idx	= (( info.buf_opt & BOPT_IDX ) != 0),
		b_uv	= (( info.buf_opt & BOPT_UV ) != 0),
		b_norm	= (( info.buf_opt & BOPT_NORM ) != 0),
		b_bw	= (( info.buf_opt & BOPT_BWEIGHT ) != 0),
		b_bi	= (( info.buf_opt & BOPT_BIDX ) != 0);

	// To Bind to GL Buffers, need DataView but to bind to TypeArrays need ArrayBuffer
	let dv 	= ( info.bin instanceof ArrayBuffer )? new DataView( info.bin ) : info.bin;
	let vao, itm;

	for( let i in json ){
		if( info.mesh_names && info.mesh_names.indexOf(i) < 0 ) continue;
		itm = json[ i ];
		vao	= new Vao();

		Vao.bind( vao );
		Vao.vert_bin( vao, dv, itm.vertices.byteStart, itm.vertices.byteLen, itm.vertices.compLen );

		if( b_idx )		Vao.index_bin( vao, dv, itm.indices.byteStart, itm.indices.byteLen );
		if( b_uv )		Vao.uv_bin( vao, dv, itm.uv.byteStart, itm.uv.byteLen );
		if( b_norm )	Vao.norm_bin( vao, dv, itm.normal.byteStart, itm.normal.byteLen );
		if( b_bw )		Vao.weight_bin( vao, dv, itm.weights.byteStart, itm.weights.byteLen, itm.weights.compLen );
		if( b_bi )		Vao.joint_bin( vao, info.bin, itm.joints.byteStart, itm.joints.elmCount, itm.joints.compLen );	

		Vao.finalize( vao, info.name + "_" + i, ((b_idx)? itm.indices.elmCount : itm.vertices.elmCount) );
		e.Draw.add( vao, info.mat_name, itm.mode );
	}
}

function load_bones( e, info ){
	let json = parse_section( "Armature", info.text );

	let i, b, ab, bLen = json.length, arm = e.Armature;

	for( i=0; i < bLen; i++ ){
		b	= json[i];
		ab 	= Armature.addBone( arm, b.name, b.len, null, b.idx );

		// Can not have levels updated automaticly, Callstack limits get hit
		// Instead, using the Level from bones to manually set it.
		if( b.p_idx != null ) App.node.addChild( arm.bones[ b.p_idx ], ab, false );

		// Manual set node level, Must do it after addChild, else it will get overwritten.
		ab.Node.level = b.lvl; 

		if( b.rot ) ab.Node.setRot( b.rot );
		if( b.pos ) ab.Node.setPos( b.pos );
		if( b.scl ) ab.Node.setScl( b.scl );
	}
	Armature.finalize( e );	//This updates World Transform
}


//#############################################################################
export default null;