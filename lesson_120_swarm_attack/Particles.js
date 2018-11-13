import gl		from "./fungi/gl.js";
import Fungi	from "./fungi/Fungi.js";
import Vao		from "./fungi/Vao.js";
import Shader	from "./fungi/Shader.js";
import { Vec3 }	from "./fungi/Maths.js";
import { Components, System }	from "./fungi/Ecs.js";



/////////////////////////////////////////////////////////////
// COMPONENTS
/////////////////////////////////////////////////////////////
const PARTICLE_POSITION_LOC = 10;
class Particles{
	constructor(){
		this.itemCount	= 0;
		this.items		= null;
		this.order		= null;
		this.isModified	= false;
		this.position	= new Vec3(0,0,0);
	}

	static _newItem(){ return { position : new Vec3(0,0,0) }; }
	static init(e, name, cnt = 1){
		//----------------------------------------
		let com = null;
		if(e.com.Particles)	com = e.com.Particles;
		else 				e.addCom( com = new Particles() );

		com.itemCount		= cnt;
		com.items			= new Array( cnt );
		com.order			= new Array( cnt );
		for(let i=0; i < cnt; i++){
			com.items[ i ]	= Particles._newItem();
			com.order[ i ]	= i;
		}
		arrayShuffle( com.order );


		//----------------------------------------
		const	s = 0.13,
				ss = 0.1;

		const verts	= [
			 0, -s,  0,		// 0 Bottom
			 0,  s,  0,		// 1 Top
			-ss,  0,  ss, 	// 2 Bot Left
			 ss,  0,  ss, 	// 3 Bot Right
			 ss,  0, -ss, 	// 4 Top Right
			-ss,  0, -ss, 	// 5 Top Left
		];

		const faces = [ 1,2,3, 1,3,4,  1,4,5,  1,5,2,
						 0,3,2, 0,4,3,  0,5,4,  0,2,5 ];
		
		e.com.Drawable.vao			= Particles.vao(e, name, verts, faces);
		e.com.Drawable.drawMode		= Fungi.TRI; //Fungi.PNT;
		return e;
	}


	////////////////////////////////////////////////////////////////////
	//
	////////////////////////////////////////////////////////////////////
		static vao(e, vName, verts, faces = null){
			let com				= e.com.Particles,
				itmPositions	= Particles.flattenData( e ),
				oVao 			= new Vao().create()
				.floatBuffer("bVertices",	verts, Shader.ATTRIB_POSITION_LOC, 3)
				.floatBuffer("bPosition",	itmPositions, PARTICLE_POSITION_LOC, 3, 0, 0, true, true)
				.setInstanced( com.itemCount );

			if(faces) oVao.indexBuffer("bIndex", faces);

			let vao = oVao.finalize(name);
			oVao.cleanup();

			return vao;
		}

	////////////////////////////////////////////////////////////////////
	//
	////////////////////////////////////////////////////////////////////
		static flattenData(e){
			let i, ii, iii, n, 
				com = e.com.Particles,
				pos = new Float32Array( com.itemCount * 3 );

			for(i=0; i < com.items.length; i++){
				n	= com.items[ i ].position;
				iii	= i * 3;

				pos[iii  ]	= n[0];
				pos[iii+1]	= n[1];
				pos[iii+2]	= n[2];
			}

			return pos;
		}

		static updateBuffer(e){
			let pos	= Particles.flattenData( e );

			gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, e.com.Drawable.vao.bPosition.id);
			gl.ctx.bufferSubData(gl.ctx.ARRAY_BUFFER, 0, pos, 0, null);
			gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, null);

			return this;
		}
} Components( Particles );



/////////////////////////////////////////////////////////////
// HELPERS
/////////////////////////////////////////////////////////////
class ParticleState{
	constructor( e ){
		let cnt = e.com.Particles.itemCount;

		this.items = new Array(cnt);
		for(let i=0; i < cnt; i++) this.items[ i ] = Particles._newItem();
	}

	apply( e ){
		let com		= e.com.Particles,
			cnt 	= com.itemCount,
			iAry 	= com.items;

		com.isModified = true;
		for(let i=0; i < cnt; i++){
			iAry[i].position.copy( this.items[i].position );
		}
	}
}


function arrayShuffle(ary){
	var i = ary.length,
		ii, t;

	//From End to start, Swop last element with a random earlier element.
	while (0 !== i ) {
		ii = Math.floor(Math.random() * i);
		i--;

		//Swap Data
		t			= ary[ i ];
		ary[ i ]	= ary[ ii ];
		ary[ ii ]	= t;
	}
	return ary;
}


/////////////////////////////////////////////////////////////
// SYSTEM
/////////////////////////////////////////////////////////////
const QUERY_COM = ["Particles"];
class ParticleSystem extends System{
	static init( priority = 20 ){ Fungi.ecs.addSystem(new ParticleSystem(), priority); }
	constructor(){ super(); }
	update(ecs){
		let e, ary = ecs.queryEntities( QUERY_COM );
		for( e of ary ){
			if( e.com.Particles.isModified ){
				Particles.updateBuffer( e );
				e.com.Particles.isModified = false;
			}
		}
	}
}

export { Particles, ParticleSystem, ParticleState };