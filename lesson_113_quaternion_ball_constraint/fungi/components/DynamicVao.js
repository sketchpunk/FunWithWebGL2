import Fungi			from "../Fungi.js";
import Vao				from "../Vao.js";
import DynamicBuffer	from "../data/DynamicBuffer.js";

import { Components }	from "../Ecs.js";

//Setup a Blank Vao then attach a Dynamic Buffer to control it.
function init(e, name, startSize, vecCompLen){
	if(!e.com.DynamicVao) e.addByName("DynamicVao");

	let vao = Vao.standardEmpty(name, vecCompLen, startSize);
	e.com.Drawable.vao		= vao;
	e.com.DynamicVao.verts	= DynamicBuffer.newFloat(vao.bVertices.id, vecCompLen, startSize);
}


class DynamicVao{
	constructor(){
		this.verts		= null;
		this.isModified	= false;
	}

	////////////////////////////////////////////////////////////////////
	// INITIALIZERS
	////////////////////////////////////////////////////////////////////
	static initPoint(e, name, startSize = 4, vecCompLen = 4){
		init(e, name, startSize, vecCompLen);
		e.com.Drawable.drawMode = Fungi.PNT;
		return e;
	}

	static initLine(e, name, startSize = 4, vecCompLen = 4){
		init(e, name, startSize, vecCompLen);
		e.com.Drawable.drawMode = Fungi.LINE;
		return e;
	}


	////////////////////////////////////////////////////////////////////
	// POINTS
	////////////////////////////////////////////////////////////////////
	static rawPoint(e, x, y, z, w=0){
		e.com.DynamicVao.verts.data.push(x, y, z, w);
		e.com.DynamicVao.isModified = true;
		return DynamicVao;
	}

	static vecPoint(e, v, w=0){
		e.com.DynamicVao.verts.data.push(v[0], v[1], v[2], w);
		e.com.DynamicVao.isModified = true;
		return DynamicVao;
	}


	////////////////////////////////////////////////////////////////////
	// LINES
	////////////////////////////////////////////////////////////////////
	static rawLine(e, x0, y0, z0, x1, y1, z1, w0=0, w1){
		e.com.DynamicVao.verts.data.push(
			x0, y0, z0, w0,
			x1, y1, z1, w1 || w0
		);
		e.com.DynamicVao.isModified = true;
		return DynamicVao;
	}

	static vecLine(e, v0, v1, w0=0,w1){
		e.com.DynamicVao.verts.data.push(
			v0[0], v0[1], v0[2], w0,
			v1[0], v1[1], v1[2], w1 || w0
		);
		e.com.DynamicVao.isModified = true;
		return DynamicVao;
	}

	static vecBox(e, v1, v2, c=0){ return DynamicVao.rawBox(e, v1[0], v1[1], v1[2], v2[0],v2[1],v2[2], c); }
	static rawBox(e, x1, y1, z1, x2, y2, z2, c=0){//Min -> Max to creating a bounding box.		
		//TopLeft,TopRight,BotRight,BotLeft
		let d = e.com.DynamicVao.verts.data,
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

		e.com.DynamicVao.isModified = true;
		return DynamicVao;
	}


	////////////////////////////////////////////////////////////////////
	// MISC
	////////////////////////////////////////////////////////////////////
	static reset(){
		let e;
		for(e of arguments){
			e.com.DynamicVao.verts.data.splice(0);
			e.com.DynamicVao.isModified = true;
		}
		return DynamicVao;
	}
} Components(DynamicVao);


export default DynamicVao;