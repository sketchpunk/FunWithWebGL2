import Renderable	from "./Renderable.js";
import gl, {VAO, ATTR_POSITION_LOC, ATTR_NORM_LOC} from "../gl.js";
import { Quat } from "../Maths.js";

class GeometryData{
	constructor(vertSize=3, jointSize=0){
		this.vertSize	= vertSize;	//How many floats creates a single vertice
		this.jointSize	= jointSize;	//Max bones per vertice

		this.points		= [];	//Point Data - Verts,UV,Norm,Joints,JointWeight
		this.indices	= [];	//Element Array, used for draw modes like triangle, lines, etc.
	}

	////////////////////////////////////////////////////////////////////
	//
	////////////////////////////////////////////////////////////////////
	newPoint(){
		var itm,
			rtn		= [],
			a		= arguments,
			pLen	= this.points.length;

		for(var i=0; i < arguments.length; i+= this.vertSize){
			itm = {
				verts 			: (this.vertSize == 3)? [ a[i], a[i+1], a[i+2] ] : [ a[i], a[i+1], a[i+2], a[i+3] ],
				uv				: [],
				norm			: [],
				joints			: [],			
				jointWeights	: []		
			}
			this.points.push(itm);
			rtn.push(pLen++);
		}

		return rtn;
	}

	setJoints(idxAry,jointIdx,jointWeight){
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
			verts			: this.points[i].verts.slice(0),
			uv				: this.points[i].uv.slice(0),
			norm			: this.points[i].norm.slice(0),
			joints			: this.points[i].joints.slice(0),
			jointWeights	: this.points[i].jointWeights.slice(0)
		}
	}

	////////////////////////////////////////////////////////////////////
	//
	////////////////////////////////////////////////////////////////////

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

	////////////////////////////////////////////////////////////////////
	// Vertices Controlling Functions
	////////////////////////////////////////////////////////////////////
	//extrude a list of points toward a direction
	extrude(idxAry,dir,rot = null,scale=null){
		var v, itm, rtn = [],
			pLen = this.points.length;

		for(var i=0; i < idxAry.length; i++){
			itm = this.clonePoint(idxAry[i]);						//Create a copy of the point data

			if(scale != null)
				for(v=0; v < dir.length; v++) itm.verts[v] *= scale[v];	//Apply Scale

			if(rot != null) Quat.rotateVec3(rot,itm.verts);			//Apply Rotation before translation

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
	constructor(matName, geo=null, arm=null){
		super(null,matName);

		if(geo != null) this.loadGeometryData(geo);

		this.armature 	= arm;
	}

	setArmature(arm){ this.armature = arm; return this; }

	loadGeometryData(geo){
		//Build VAO and Buffers for rendering.
		var verts = geo.compileVertices();

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
		this.drawMode	= (this.vao.isIndexed)? gl.ctx.TRIANGLES : gl.ctx.POINTS; //Final Setup

		return this;
	}

	loadGLTFMesh(m, arm=null){
		//TODO Bounding Box data : mesh.vertices.max / min 
		this.vao = VAO.create();

		//Vertices
		VAO.floatArrayBuffer(this.vao,"bVertices",m.vertices.data,ATTR_POSITION_LOC,m.vertices.compLen,0,0,true);
		
		//Index (Elements)
		if(m.indices.count > 0) VAO.indexBuffer(this.vao,"bIndex",m.indices.data,true);

		//Normals
		if(m.normals != null && m.normals.count > 0){
			VAO.floatArrayBuffer(this.vao,"bNormal", m.normals.data,ATTR_NORM_LOC,m.normals.compLen,0,0,true);
		}

		//Weight and Joints
		if(m.weights != null && m.joints != null){
			VAO.floatArrayBuffer(this.vao,"bJointIdx",		m.joints.data,3,m.joints.compLen,0,0,true)
			   .floatArrayBuffer(this.vao,"bJointWeight",	m.weights.data,4,m.weights.compLen,0,0,true);
		}

		VAO.finalize(this.vao,"GeometryRender");
		this.drawMode	= (this.vao.isIndexed)? gl.ctx.TRIANGLES : gl.ctx.POINTS; //Final Setup

		if(arm != null) this.armature = arm;
		return this;
	}

	drawPoints(){		this.drawMode = gl.ctx.POINTS;		return this; }
	drawLines(){		this.drawMode = gl.ctx.LINES;		return this; }
	drawTriangles(){	this.drawMode = gl.ctx.TRIANGLES;	return this; }

	draw(){
		if(this.vao.count == 0) return;

		if(this.armature != null){
			var mat = [];
			this.armature.getFlatOffset(mat); //TODO : Cache, update when dirty
			this.material.shader.setUniforms("uJoints",mat);
		}

		gl.ctx.bindVertexArray(this.vao.ptr);
		if(this.vao.isIndexed)	gl.ctx.drawElements(this.drawMode, this.vao.count, gl.ctx.UNSIGNED_SHORT, 0); 
		else 					gl.ctx.drawArrays(this.drawMode, 0, this.vao.count);
	}
}

export {GeometryData, GeometryRender}