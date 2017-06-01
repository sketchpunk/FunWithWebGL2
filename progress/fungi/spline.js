var Picking = {
	id:100,
	list:[],
	target:null,
	initX:0,
	initY:0,
	initPos:new Fungi.Maths.Vec3(),
	tmpPos:new Fungi.Maths.Vec3(),

	register:function(obj,cb){
		var id = ++this.id;
		this.list.push({id:id, obj:obj, callback:cb});
		return id;
	},
	
	find:function(id){
		for(var i=0; i < this.list.length; i++){
			if(this.list[i].id == id) return this.list[i];
		}
		return null;
	},

	colorToID:function(a){ return a[0] | (a[1] << 8) | (a[2] << 16); },
	idToColor:function(v){ //With 3 bytes, the max value is 16777215;
		var a = new Float32Array(3);
		a[0] = (v & 0xff) / 255.0;
		a[1] = ((v & 0xff00) >> 8) / 255.0;
		a[2] = ((v & 0xff0000) >> 16) / 255.0;
		return a;
	},

	onDownOverride:function(e,ctrl,x,y){
		var yi		= Fungi.gl.fHeight - y, //Gotta flip the y
			pixel	= Fungi.Shaders.FBO.readPixel(gFbo,x,yi,1),
			id		= Picking.colorToID(pixel);
		
		if(id == 0 || id == 16777215) return; //ignore Black and white.
		ctrl.switchHandler("pick",id);
	},
	onActive:function(data){
		if(!data) return;
		this.target = Picking.find(data);
	},
	onMouseUp:function(e,ctrl,x,y,dx,dy){ 
		ctrl.switchHandler("camera");
	},
	onMouseDown:function(e,ctrl,x,y){
		this.initX = x;
		this.initY = y;
		this.initPos.copy(this.target.obj.position);
	},
	onMouseMove:function(e,ctrl,x,y,dx,dy){
		var v  = [0,0,0]
			dx = x-this.initX,
			dy = y-this.initY;

		this.tmpPos.copy(this.initPos)
			.add(FungiApp.mainCamera.left(v,dx*0.008))
			.add(FungiApp.mainCamera.up(v,-dy*0.008));

		this.target.obj.position.copy(this.tmpPos);
		this.target.callback(this.target.obj);

		//HACK - Calling global vars, not a nice way to approach this.
		gDMesh.clear();
		Bezier.generate(gDMesh.verts,10,
			gPoints._points[0].position,
			gPoints._points[1].position,
			gPoints._points[2].position,
			gPoints._points[3].position
		);
		gDMesh.update();

		//Draw line between position and control point
		FungiApp.debugLines.reset()
			.addVector(gPoints._points[0].position,gPoints._points[1].position,"#b0b0b0")
			.addVector(gPoints._points[2].position,gPoints._points[3].position,"#b0b0b0")
			.update();
	}
}


class DynamicMesh extends Fungi.Renderable{
	constructor(tVert,matName){
		super({},matName);

		this.verts			= [];
		this.bufSize		= Float32Array.BYTES_PER_ELEMENT * 3 * tVert; //3Floats per vert
		this.drawMode		= Fungi.gl.LINE_STRIP;
		this.visible		= false;

		//Create VAO with a buffer a predefined size buffer to dynamicly dump data in.
		Fungi.Shaders.VAO.create(this.vao)
			.emptyFloatArrayBuffer(this.vao,"vert",this.bufSize,Fungi.ATTR_POSITION_LOC,3,0,0,false)
			.finalize(this.vao,"FungiVertDebugger");
	}

	draw(){ if(this.vao.count > 0) Fungi.gl.drawArrays(this.drawMode, 0, this.vao.count); }
	clear(){
		this.verts.length = 0;
		this.vao.count = 0;
		this.visible = false;
	}

	update(){
		//If there is no verts, set this to invisible to disable rendering.
		if(this.verts.length == 0){ this.visible = false; return this; }
		this.visible = true;
		
		//Calc how many vectors we have
		this.vao.count = this.verts.length / 3;

		//Push verts to GPU.
		Fungi.gl.bindBuffer(Fungi.gl.ARRAY_BUFFER,this.vao.buffers["vert"].buf);
		Fungi.gl.bufferSubData(Fungi.gl.ARRAY_BUFFER, 0, new Float32Array(this.verts), 0, null);
		Fungi.gl.bindBuffer(Fungi.gl.ARRAY_BUFFER,null);

		return this;
	}
}


class Bezier{
	static generate(out,res,p0,p1,p2,p3){
		var inc = 1/res, t = 0,
			pos = new Fungi.Maths.Vec3();

		for(var i = 0; i < res; i++){
			Bezier.getPoint(p0,p1,p2,p3, i*inc ,pos);
			out.push(pos.x,pos.y,pos.z);
		}

		Bezier.getPoint(p0,p1,p2,p3, 1 ,pos);
		out.push(pos.x,pos.y,pos.z);
	}

	static getPoint(p0,p1,p2,p3,t,out){
		if(t > 1) t = 1;
		else if(t < 0) t = 0;

		var i = 1 - t;
		
		out = out || new Fungi.Maths.Vec3();
		out[0] = i * i * i * p0.x +
				3 * i * i * t * p1.x +
				3 * i * t * t * p2.x +
				t * t * t * p3.x;
		out[1] = i * i * i * p0.y +
				3 * i * i * t * p1.y +
				3 * i * t * t * p2.y +
				t * t * t * p3.y;
		out[2] = i * i * i * p0.z +
				3 * i * i * t * p1.z +
				3 * i * t * t * p2.z +
				t * t * t * p3.z;
		return out;
	}
}

/*
static getPoint(p0,p1,p2,p3,t,rtn){
		if(t > 1) t = 1;
		else if(t < 0) t = 0;

		var i = 1 - t;
		
		rtn = rtn || new Fungi.Maths.Vec3();
		rtn.x = i * i * i * p0.x +
				3 * i * i * t * p1.x +
				3 * i * t * t * p2.x +
				t * t * t * p3.x;
		rtn.y = i * i * i * p0.y +
				3 * i * i * t * p1.y +
				3 * i * t * t * p2.y +
				t * t * t * p3.y;
		rtn.z = i * i * i * p0.z +
				3 * i * i * t * p1.z +
				3 * i * t * t * p2.z +
				t * t * t * p3.z;
		return rtn;
	}

	//Gets the Non Normalized Curve Tangent
	static getDerivative(p0,p1,p2,p3,t,rtn){
		//Clamp t betwen 0 and 1
		if(t > 1) t = 1;
		else if(t < 0) t = 0;
		var i = 1 - t;

		rtn = rtn || new Fungi.Maths.Vec3();
		rtn.x = 3 * i * i * (p1.x - p0.x) +
				6 * i * t * (p2.x - p1.x) +
				3 * t * t * (p3.x - p2.x);
		
		rtn.y = 3 * i * i * (p1.y - p0.y) +
				6 * i * t * (p2.y - p1.y) +
				3 * t * t * (p3.y - p2.y);

		rtn.z = 3 * i * i * (p1.z - p0.z) +
				6 * i * t * (p2.z - p1.z) +
				3 * t * t * (p3.z - p2.z);
		return rtn;
	}


__normal3: function(t) {
      // see http://stackoverflow.com/questions/25453159
      var r1 = this.derivative(t),
          r2 = this.derivative(t+0.01),
          q1 = sqrt(r1.x*r1.x + r1.y*r1.y + r1.z*r1.z),
          q2 = sqrt(r2.x*r2.x + r2.y*r2.y + r2.z*r2.z);
      r1.x /= q1; r1.y /= q1; r1.z /= q1;
      r2.x /= q2; r2.y /= q2; r2.z /= q2;
      // cross product
      var c = {
        x: r2.y*r1.z - r2.z*r1.y,
        y: r2.z*r1.x - r2.x*r1.z,
        z: r2.x*r1.y - r2.y*r1.x
      };
      var m = sqrt(c.x*c.x + c.y*c.y + c.z*c.z);
      c.x /= m; c.y /= m; c.z /= m;
      // rotation matrix
      var R = [   c.x*c.x,   c.x*c.y-c.z, c.x*c.z+c.y,
                c.x*c.y+c.z,   c.y*c.y,   c.y*c.z-c.x,
                c.x*c.z-c.y, c.y*c.z+c.x,   c.z*c.z    ];
      // normal vector:
      var n = {
        x: R[0] * r1.x + R[1] * r1.y + R[2] * r1.z,
        y: R[3] * r1.x + R[4] * r1.y + R[5] * r1.z,
        z: R[6] * r1.x + R[7] * r1.y + R[8] * r1.z
      };
      return n;
    },
*/

class DragPoints{
	static getRenderable(){
		if(DragPoints.renderable) return DragPoints.renderable;

		//......................................
		//CREATE SHADER
		var vShader = '#version 300 es\n'+
			'layout(location=0) in vec3 a_position;' +
			'layout(location=1) in vec3 a_id;' +
			'layout(location=2) in lowp vec3 a_color;' +			
			'uniform UBOTransform{ mat4 matProjection; mat4 matCameraView; vec3 posCamera; };' +
			'out lowp vec3 color;'+
			'out lowp vec3 id;'+
			'void main(void){'+
				'vec4 worldpos = matCameraView * vec4(a_position, 1.0);'+
				'float d = distance(posCamera.xyz,worldpos.xyz);'+
				'if(d > 0.0f) gl_PointSize = max(10.0f,(100.0f/d));' +
				'else gl_PointSize = 10.0f;' +
				'color = a_color;'+
				'id = a_id;'+
				'gl_Position = matProjection * worldpos; '+
			'}';

		var fShader = '#version 300 es\n precision mediump float;'+
			'in lowp vec3 color; in lowp vec3 id;'+
			'layout(location = 0) out vec4 outColor0;'+
        	'layout(location = 1) out vec4 outColor1;'+
			'void main(void){ outColor0 = vec4(color,1.0); outColor1 = vec4(id,1.0); }';

		Fungi.Shaders.New("FungiDrawPoints",vShader,fShader)
			.prepareUniformBlocks(Fungi.Res.Ubo[Fungi.UBO_TRANSFORM],0);

		//......................................
		//CREATE MATERIAL
		var mat = Fungi.Shaders.Material.create("FungiDrawPoints","FungiDrawPoints");
		mat.useModelMatrix = false;
		mat.drawMode = Fungi.gl.POINTS;

		//......................................
		//CREATE RENDERABLE
		var ren = new DragPoints();
		ren.material = mat;
		return DragPoints.renderable = ren;
	}

	constructor(){
		var fsize = Float32Array.BYTES_PER_ELEMENT;
		var compSize = 9;
		var stride = compSize * fsize; //How large is the vertex data in bytes, Pos(3)-ID(3)-Color(3), 9 Floats at 4 bytes each

		this._points		= [];
		this._isModified 	= true;
		this._vertCompSize	= compSize;
		this._stride		= stride;
		this._bufSize		= stride * 20;
		this.vao			= {};
		this.visible		= true;
		this.material		= null;

		//Create VAO with a buffer with space for 100 lines.
		Fungi.Shaders.VAO.create(this.vao)
			.emptyFloatArrayBuffer(this.vao,"vert",this._bufSize,Fungi.ATTR_POSITION_LOC,3,stride,0,false) //Setup buffer and verts
			.partitionBuffer(1,3,stride,fsize * 3) //Setup ID
			.partitionBuffer(2,3,stride,fsize * 6) //Setup Color
			.finalize(this.vao,"FungiDragPoints");
		this.vao.count = 0;
	}

	draw(){
		if(this.vao.isIndexed)	Fungi.gl.drawElements(this.material.drawMode, this.vao.count, Fungi.gl.UNSIGNED_SHORT, 0); 
		else					Fungi.gl.drawArrays(this.material.drawMode, 0, this.vao.count);
	}

	addPoint(x,y,z,cHex){
		var obj = { id:0, color:cHex, position:new Fungi.Maths.Vec3().set(x,y,z), index:this._points.length };
		obj.id = Picking.register(obj, this.updateCallback.bind(this));
		this._points.push(obj);
	}

/*
	getPointById(id){
		for(var i=0; i < this._points.length; i++){
			if(this._points[i].id == id) return i;
		}
		return -1;
	}
*/
	updateCallback(o){
		//console.log(o);
		Fungi.Shaders.VAO.updateAryBufSubData(
			this.vao.buffers["vert"].buf,
			o.index * this._stride,
			o.position
		);
	}
/*
	updatePositionById(id,x,y,z){
		var i = this.getPointById(id);
		if(i == -1){ console.log('point not found'); return; }

		Fungi.Shaders.VAO.updateAryBufSubData(
			this.vao.buffers["vert"].buf,
			i * this._stride,
			this._points[i].position.set(x,y,z)
		);
	}
*/
	buildBuffer(){
		if(this._points.length == 0){ this.visible = false; return this; }
		this.visible = true;

		var ary = [], color, cid;
		for(var i=0; i < this._points.length; i++){
			color	= Fungi.Util.rgbArray(this._points[i].color);
			cid		= Picking.idToColor(this._points[i].id);

			ary.push(
				this._points[i].position.x,
				this._points[i].position.y,
				this._points[i].position.z,
				cid[0],
				cid[1],
				cid[2],
				color[0],
				color[1],
				color[2]
			);
		}

		//Calc how many vec4 elements we have
		this.vao.count = ary.length / this._vertCompSize;

		//Push verts to GPU.
		Fungi.gl.bindBuffer(Fungi.gl.ARRAY_BUFFER,this.vao.buffers["vert"].buf);
		Fungi.gl.bufferSubData(Fungi.gl.ARRAY_BUFFER, 0, new Float32Array(ary), 0, null);
		Fungi.gl.bindBuffer(Fungi.gl.ARRAY_BUFFER,null);

		return this;
	}
}