
import Vec3 from "../maths/Vec3.js";
import Vec2 from "../maths/Vec2.js";

class Geometry{
	constructor(){
		this.verts = new Array();
		this.faces = new Array();
	}

	//...................................................
	addVert(x,y,z){
		var v = new Vertex(x, y, z);
		this.verts.push(v)
		return v;
	}

	addVerts(x,y,z){
		//................................
		//if passing in just one array
		if(arguments.length == 1 && arguments[0].length == 3){
			this.verts.push( new Vertex( arguments[0][0], arguments[0][1], arguments[0][2] ) );
			return this;
		}

		//................................
		for(var i=0; i < arguments.length; i+= 3) this.verts.push( 
			new Vertex( arguments[i], arguments[i+1], arguments[i+2] )
		);

		return this;
	}

	addFace(a,b,c){
		for(var i=0; i < arguments.length; i+= 3) this.faces.push(
			new Face(this).set( arguments[i], arguments[i+1], arguments[i+2] )
		);
		return this;
	}

	faceVert(f,v){
		var face = this.faces[f];
		if(!face){ console.log("Face not found",f);  return null; }
		return this.verts[ face[v] ];
	}

	cloneVert(idx,save=true){
		let v = this.verts[idx].clone();
		if(save) this.verts.push(v);
		return v;
	}

	//...................................................
	extrude(idxAry, vDir){
		let len = idxAry.length,
			out = new Array( len ),
			idx = this.verts.length,
			i,v;

		for(i=0; i < len; i++){
			this.verts.push( v = this.verts[ idxAry[i] ].clone().add(vDir) );
			out[i] = idx + i;
		}

		return out;
	}

	//using two index arrays, if built counter clockwise, create triangles out of the quads that make up the wall.
	triangleWallLoop(iAryA,iAryB){
		let i, a, b, c, d, p,
			len = iAryA.length;

		for(i=0; i < len; i++){
			p = (i+1)%len;
			a = iAryB[i],
			b = iAryA[i],
			c = iAryA[p],
			d = iAryB[p];
			this.addFace(a,b,c,c,d,a);
		}
	}

	triangleCircle(cIdx, cAry){
		let len	= cAry.length,
			i, ii;

		for(i=0; i < len; i++){
			ii = (i + 1) % len;
			this.addFace( cAry[i], cIdx, cAry[ii] );
		}
	}

	//...................................................
	vertexArray(){	return this.compileArray(this.verts, Float32Array, 3); }
	faceArray(){	return this.compileArray(this.faces, Uint16Array, 3); }
	uvArray(){		return this.compileArray(this.verts, Float32Array, 2, "uv"); }
	normArray(){	return this.compileArray(this.verts, Float32Array, 3, "norm"); }

	jointArray(size){	return this.compileArray(this.verts, Float32Array, size, "jointIndex"); }
	weightArray(size){	return this.compileArray(this.verts, Float32Array, size, "jointWeight"); }

	compileArray(ary,AryType,size,sub=null){
		var aLen	= ary.length * size,
			out		= new AryType(aLen),
			itm, ii, j;

		for(var i=0; i < ary.length; i++){
			ii	= i * size;
			itm	= (!sub)? ary[i] : ary[i][sub];

			for(j=0; j < size; j++) out[ii + j] = itm[j];
		}
		return out;
	}

	//...................................................
	debugPoints(dPoint, color = 0){
		for(let i of this.verts) dPoint.addVec(i, color);
		return this;
	}
}

/*
function geoFaceNormal(geo,idx,out){
	out[0] = 0; out[1] = 0; out[2] = 0;
	var f	= geo.faces[idx],								//Face Ref
		a	= geo.verts[ f[0] ],							//Face Verts
		b	= geo.verts[ f[1] ],
		c	= geo.verts[ f[2] ],
		ab	= [ b[0] - a[0], b[1] - a[1], b[2] - a[2] ],	//Vector length of A to B and C
		ac	= [ c[0] - a[0], c[1] - a[1], c[2] - a[2] ];

	Vec3.cross(ab,ac,out);
	Vec3.norm(out);
}
*/
 

//#################################################################
class Vertex extends Vec3{
	constructor(ini){
		super();
		this.uv		= new Vec2();
		this.norm	= new Vec3();

		if(ini && ini.length == 3){ this[0] = ini[0]; this[1] = ini[1]; this[2] = ini[2];
		}else if(arguments.length == 3){ this[0] = arguments[0]; this[1] = arguments[1]; this[2] = arguments[2];
		}else{
			this[0] = this[1] = this[2] = ini || 0;
		}
	}

	initJoints(){
		var len = arguments.length;
		this.jointIndex = new Array(len);
		for(var i=0; i < len; i++) this.jointIndex[i] = arguments[i];
		return this;
	}

	initJointWeights(){
		var len = arguments.length;
		this.jointWeight = new Array(len);
		for(var i=0; i < len; i++) this.jointWeight[i] = arguments[i];
		return this;
	}

	//.......................................
	clone(){
		var v = new Vertex();
		for(var i=0; i < 3; i++){
			v[i]		= this[i];
			v.norm[i]	= this.norm[i];
			if(i < 2) v.uv[i] = this.uv[i];
		}
		return v;
	}

	toString(fix=0){ 
		return (fix == 0)?
			this[0] + "," + this[1] + "," + this[2] :
			this[0].toFixed(fix) + "," + this[1].toFixed(fix) + "," + this[2].toFixed(fix);
	}
}


//#################################################################
class Face extends Array{
	constructor(geo, a, b, c){
		super(3);
		this.geo	= geo;
		this[0]		= a;
		this[1]		= b;
		this[2]		= c;
	}

	set(a,b,c){ this[0] = a; this[1] = b; this[2] = c; return this; }

	vert(i){ return this.geo.verts[ this[i] ]; }

	centroid(out = null){
		if(out != null) out[0] = out[1] = out[2] = 0;	//If out exists, reset it
		else out = [0,0,0];								//else create a new array

		var v;
		for(var i=0; i < this.length; i++){
			v		= this.geo.verts[ this[i] ];
			out[0]	+= v[0];
			out[1]	+= v[1];
			out[2]	+= v[2];
		}

		var invLen = 1 / 3;
		out[0] *= invLen;
		out[1] *= invLen;
		out[2] *= invLen;

		return out;
	}

	clone(){
		var f = new Face(this.geo);
		f[0] = this[0];
		f[1] = this[1];
		f[2] = this[2];
		return f;
	}

	moveToStart(pos){
		var tmp = this[pos];
		if(pos == 1){ 		this[1] = this[2]; this[2] = this[0]; this[0] = tmp; }
		else if(pos == 2){ 	this[2] = this[1]; this[1] = this[0]; this[0] = tmp; }
		return this;
	}
}

//#################################################################
//class Edge{
//	constructor(){}
/*
				static subdivEdge(geo,a,b,div=1,cache){
					var tDivInv	= 1 / (div + 1), //Alway plus one, Because divide one segment creates 2 segments
						idx		= geo.verts.length,
						rtn		= [a],
						v0		= geo.verts[a], //Convert Index Value to actual Vector3
						v1		= geo.verts[b],
						tm1,	// T Minus 1
						ckey,	// Cache Key
						x, y, z, t;

					//Linear Interpolation : (1 - t) * v0 + t * v1;
					for(var i=1; i <= div; i++){
						t		= i * tDivInv;
						tm1		= 1 - t;

						x		= v0[0] * tm1 + v1[0] * t;
						y		= v0[1] * tm1 + v1[1] * t;
						z		= v0[2] * tm1 + v1[2] * t;
						ckey	= x.toFixed(3) + "," + y.toFixed(3) + "," + z.toFixed(3); //Fix the values because of floating point errors

						if(cache[ckey] != undefined) rtn.push( cache[ckey] ); 
						else{
							geo.addVert(x, y, z);	
							cache[ ckey ] = idx;
							rtn.push(idx++); //add index then inc.
						}
					}

					rtn.push(b); //Dont bother doing math on last point, just add index to it.
					return rtn;
				}
*/
//}



export default Geometry;
export {Face, Vertex };