import App				from "../App.js";
import Vao				from "../../core/Vao.js";
import DynamicBuffer	from "../../core/DynamicBuffer.js";
import { Entity, Components, System }	from "../Ecs.js";

//#########################################################################
class DynamicVerts{
	constructor(){
		this.itemIdx	= 0;		// Index to the Draw Item that contains the Vert buffer thats being modified.
		this.buf		= null;		// Dynamic BUffer Wrapper
		this.isModified	= false;	// State when Data has been changed.
	}

	push(){
		this.buf.data.push( ...arguments );
		this.isModified = true;
		return this;
	}

	////////////////////////////////////////////////////////////////////
	// INITIALIZERS
	////////////////////////////////////////////////////////////////////
		static $( e, name, mat="VecWColor", mode=0, startSize=10, vecCompLen=4 ){
			if( !e.DynamicVerts ) Entity.com_fromName( e, "DynamicVerts" );

			let vao = Vao.buildEmpty( name, vecCompLen, startSize );

			e.Draw.add( vao, mat, mode );
			e.DynamicVerts.buf		= DynamicBuffer.newFloat( vao.buf.vertices, vecCompLen, startSize );
			e.DynamicVerts.itemIdx	= e.Draw.items.length - 1;

			return e;
		}

		static entity_pnt( eName ){ return DynamicVerts.$( App.$Draw( eName ), eName+"_vao", "VecWColor", 0 ); }
		static entity_line( eName ){ return DynamicVerts.$( App.$Draw( eName ), eName+"_vao", "VecWColor", 1 ); }


	////////////////////////////////////////////////////////////////////
	// POINTS
	////////////////////////////////////////////////////////////////////
		raw_pnt( x, y, z, w=0 ){ this.push( x, y, z, w ); return this; }
		vec_pnt( v, w=0 ){ this.push( v[0], v[1], v[2], w ); return this; }

		static rawPoint( e, x, y, z, w=0 ){
			e.DynamicVerts.push( x, y, z, w );
			return DynamicVerts;
		}

		static vecPoint( e, v, w=0 ){
			e.DynamicVerts.push( v[0], v[1], v[2], w );
			return DynamicVerts;
		}


	////////////////////////////////////////////////////////////////////
	// LINES
	////////////////////////////////////////////////////////////////////
		raw_line( x0, y0, z0, x1, y1, z1, w0=0, w1 ){
			this.push( x0, y0, z0, w0, x1, y1, z1, w1 || w0 );
			return this;
		}

		vec_line( v0, v1, w0=0, w1 ){
			this.push( v0[0], v0[1], v0[2], w0, v1[0], v1[1], v1[2], w1 || w0 );
			return this;
		}

		vec_box( v1, v2, c=0 ){ return this.raw_box( v1[0], v1[1], v1[2], v2[0],v2[1],v2[2], c); }
		raw_box( x1, y1, z1, x2, y2, z2, c=0 ){//Min -> Max to creating a bounding box.		
			//TopLeft,TopRight,BotRight,BotLeft
			let d = this.buf.data,
				b = [	[x1,y1,z1], [x2,y1,z1],		//Bottom
						[x2,y1,z2], [x1,y1,z2] ],
				t = [	[x1,y2,z1], [x2,y2,z1],		//Top
						[x2,y2,z2], [x1,y2,z2] ],
				i, ii;

			for(i=0; i < 4; i++){
				ii = (i+1) % 4;
				d.push(
					b[i][0],	b[i][1],	b[i][2],	c,	//Draw Bottom
					b[ii][0],	b[ii][1],	b[ii][2],	c,
					t[i][0],	t[i][1],	t[i][2],	c,	//Draw Top
					t[ii][0],	t[ii][1],	t[ii][2],	c,
					b[i][0],	b[i][1],	b[i][2],	c,	//Draw Sides
					t[i][0],	t[i][1],	t[i][2],	c
				);
			}

			this.isModified = true;
			return this;
		}

		static rawLine( e, x0, y0, z0, x1, y1, z1, w0=0, w1 ){
			e.DynamicVerts.push(
				x0, y0, z0, w0,
				x1, y1, z1, w1 || w0
			);
			return DynamicVerts;
		}

		static vecLine( e, v0, v1, w0=0, w1 ){
			e.DynamicVerts.push(
				v0[0], v0[1], v0[2], w0,
				v1[0], v1[1], v1[2], w1 || w0
			);
			return DynamicVerts;
		}

		static vecBox( e, v1, v2, c=0 ){ return DynamicVerts.rawBox(e, v1[0], v1[1], v1[2], v2[0],v2[1],v2[2], c); }
		static rawBox( e, x1, y1, z1, x2, y2, z2, c=0 ){//Min -> Max to creating a bounding box.		
			//TopLeft,TopRight,BotRight,BotLeft
			let d = e.DynamicVerts.buf.data,
				b = [	[x1,y1,z1], [x2,y1,z1],		//Bottom
						[x2,y1,z2], [x1,y1,z2] ],
				t = [	[x1,y2,z1], [x2,y2,z1],		//Top
						[x2,y2,z2], [x1,y2,z2] ],
				i, ii;

			for(i=0; i < 4; i++){
				ii = (i+1) % 4;
				d.push(
					b[i][0],	b[i][1],	b[i][2],	c,	//Draw Bottom
					b[ii][0],	b[ii][1],	b[ii][2],	c,
					t[i][0],	t[i][1],	t[i][2],	c,	//Draw Top
					t[ii][0],	t[ii][1],	t[ii][2],	c,
					b[i][0],	b[i][1],	b[i][2],	c,	//Draw Sides
					t[i][0],	t[i][1],	t[i][2],	c
				);
			}

			e.DynamicVerts.isModified = true;
			return DynamicVerts;
		}


	////////////////////////////////////////////////////////////////////
	// MISC
	////////////////////////////////////////////////////////////////////
		static reset(){
			let e;
			for(e of arguments){
				e.DynamicVerts.buf.data.splice( 0 );
				e.DynamicVerts.isModified = true;
			}
			return DynamicVerts;
		}
} Components( DynamicVerts );



//#########################################################################
class DynamicVertsSystem extends System{
	static init( ecs, priority = 100 ){ ecs.sys_add( new DynamicVertsSystem(), priority ); }

	constructor(){ super(); }
	run( ecs ){
		let d, e, ary = ecs.query_comp( "DynamicVerts" );
		if( !ary ) return;

		for( d of ary ){
			e = ecs.entities[ d.entityID ];
			if( !e.info.active || !d.isModified ) continue;

			d.buf.update();
			d.isModified = false;

			e.Draw.items[ d.itemIdx ].vao.elmCount = d.buf.getComponentCnt();
		}
	}
}


//#########################################################################
export default DynamicVerts;
export { DynamicVertsSystem };