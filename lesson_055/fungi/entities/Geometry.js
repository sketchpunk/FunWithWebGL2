import Renderable	from "./Renderable.js";
import gl, {VAO, ATTR_POSITION_LOC} from "../gl.js";

class GeometryData{
	constructor(vertSize,jointSize){
		this.vertSize = (vertSize === undefined)?3:vertSize;	//How many floats creates a single vertice
		this.jointSize = (jointSize === undefined)?0:jointSize;	//Max bones per vertice

		this.points = [];	//Point Data - Verts,UV,Norm,Bones,BoneWeight
		this.indices = [];	//Element Array, used for draw modes like triangle, lines, etc.
	}

	newPoint(){
		var itm,
			rtn = [],
			pLen = this.points.length;

		for(var i=0; i < arguments.length; i+= this.vertSize){
			itm = {
				verts:(this.vertSize==3)?
					[arguments[i],arguments[i+1],arguments[i+2]]:
					[arguments[i],arguments[i+1],arguments[i+2],arguments[i+3]],
				uv:[],
				norm:[],
				joints:[],
				jointWeights:[]
			}
			this.points.push(itm);
			rtn.push(pLen++);
		}

		return rtn;
	}

	setBones(idxAry,jointIdx,jointWeight){
		var p,j;
		for(var i=0; i < idxAry.length; i++){
			p = this.points[ idxAry[i] ];

			for(j=0; j < this.jointSize; j++){
				p.joints[j]			= jointIdx[j];
				p.jointWeights[j]	= jointWeight[j];
			}
		}
	}

	clonePoint(i){
		return {
			verts			:this.points[i].verts.slice(0),
			uv				:this.points[i].uv.slice(0),
			norm			:this.points[i].norm.slice(0),
			joints			:this.points[i].joints.slice(0),
			jointWeights	:this.points[i].jointWeights.slice(0)
		}
	}

	//Compile a single array of floats that make up all the vertices
	compileVertices(){
		var v,rtn = [];
		for(var i=0; i < this.points.length; i++){
			for(v=0; v < this.vertSize; v++) rtn.push(this.points[i].verts[v]);
		}
		return rtn;
	}

	compileJoints(jAry,wAry){
		var j;
		for(var i=0; i < this.points.length; i++){
			for(j=0; j < this.jointSize; j++){
				jAry.push(this.points[i].joints[j]);
				wAry.push(this.points[i].jointWeights[j]);
			}
		}
	}

	//extrude a list of points toward a direction
	extrude(idxAry,dir){
		var v, itm, rtn = [],
			pLen = this.points.length;

		for(var i=0; i < idxAry.length; i++){
			itm = this.clonePoint(idxAry[i]);						//Create a copy of the point data

			for(v=0; v < dir.length; v++) itm.verts[v] += dir[v];	//Update the vert position

			this.points.push(itm);									//Save to array
			rtn.push(pLen++);										//Save Index
		}

		return rtn;
	}

	//using two index arrays, if built counter clockwise, create triangles out of the quads that make up the wall.
	triLoop(iAryA,iAryB){
		var a,b,c,d,p,
			len = iAryA.length;

		for(var i=0; i < len; i++){
			p = (i+1)%len;
			a = iAryB[i],
			b = iAryA[i],
			c = iAryA[p],
			d = iAryB[p];
			this.indices.push(a,b,c,c,d,a);
		}
	}
}


class GeometryRender extends Renderable{
	constructor(geo,matName){
		super(null,matName);
		var verts = geo.compileVertices();

		//Build VAO and Buffers for rendering.
		this.vao = VAO.create();
		VAO.floatArrayBuffer(this.vao,"bVertices",verts,ATTR_POSITION_LOC,geo.vertSize,0,0,true,false);

		if(geo.indices.length > 0) VAO.indexBuffer(this.vao,"bIndex",geo.indices,true);
		if(geo.jointSize > 0){
			var jAry = [], wAry = [];
			geo.compileJoints(jAry,wAry);

			VAO.floatArrayBuffer(this.vao,"bJointIdx",		jAry,3,geo.jointSize,0,0,true,false)
			   .floatArrayBuffer(this.vao,"bJointWeight",	wAry,4,geo.jointSize,0,0,true,false);
		}

		VAO.finalize(this.vao,"GeometryRender");

		//Final Setup		
		this.drawMode	= (this.vao.isIndexed)? gl.ctx.TRIANGLES : gl.ctx.POINTS;
		this.visible	= true;
		this.skeleton 	= null;
	}

	drawPoints(){		this.drawMode = gl.ctx.POINTS;		return this; }
	drawLines(){		this.drawMode = gl.ctx.LINES;		return this; }
	drawTriangles(){	this.drawMode = gl.ctx.TRIANGLES;	return this; }

	draw(){
		if(this.vao.count == 0) return;

		if(this.skeleton != null){
			var mat = [];
			this.skeleton.getFlatOffset(mat);
			this.material.shader.setUniforms("uJoints",mat);
		}

		gl.ctx.bindVertexArray(this.vao.ptr);
		if(this.vao.isIndexed)	gl.ctx.drawElements(this.drawMode, this.vao.count, gl.ctx.UNSIGNED_SHORT, 0); 
		else 					gl.ctx.drawArrays(this.drawMode, 0, this.vao.count);
	}
}

export {GeometryData, GeometryRender}