var Picking = {
	id:100,
	list:[],
	target:null,
	initX:0,
	initY:0,
	//initPos:new Fungi.Maths.Vec3(),
	//tmpPos:new Fungi.Maths.Vec3(),

	register:function(cb){
		var id = ++this.id;
		this.list.push({id:id, cbObject:cb}); //obj:obj, 
		return id;
	},
	
	find:function(id){
		for(var i=0; i < this.list.length; i++){
			if(this.list[i].id == id) return this.list[i];
		}
		return null;
	},

	colorToID:function(a){ return a[0] | (a[1] << 8) | (a[2] << 16); },
	idToColor:function(v,a){ //With 3 bytes, the max value is 16777215;
		a = a || new Float32Array(3);
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

		this.target.cbObject.onPickingDown(this.target.id,x,y);

		//this.initPos.copy(this.target.obj.position);
	},
	onMouseMove:function(e,ctrl,x,y,dx,dy){
		var //v  = [0,0,0],
			dx = x-this.initX,
			dy = y-this.initY;

		this.target.cbObject.onPickingMove(this.target.id,x,y,dx,dy);

		/*
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
		*/
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

	draw(){ 
		if(this.vao.count > 0){
			Fungi.gl.bindVertexArray(this.vao.id);
			Fungi.gl.drawArrays(this.drawMode, 0, this.vao.count);
		}
	}
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

class Spline{
	constructor(curveCnt){
		this.points = [];
		if(curveCnt == undefined) curveCnt = 1;

		var y = 0,x = ((curveCnt * 3)+1) * -0.5;
		for(var i=0; i < curveCnt*3+1; i++){
			switch( i % 3 ){ //y = ((i%3 != 0)?1:0)
				case 0: y = 0; break;
				case 1: y = 1; break;
				case 2: y = -1; break;
			}
			this.points.push( new Fungi.Maths.Vec3( x+i, y, 0) );
		}
	}

	curveCount(){ return (this.points.length-1) / 3;} //Get how many curves exist in the points array

	//getCurve(i){
	//	var a = i * 3;
	//	var b = a + 3;
	//	console.log(this.pointCount(),a,b);
	//}

	static cubicBezierPoint(p0,p1,p2,p3,t,out){
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

class SplineEditor{
	static getRenderable(sampSize,spline){
		if(SplineEditor.renderable) return SplineEditor.renderable;

		//......................................
		//CREATE SHADER
		var vShader = '#version 300 es\n'+
			'layout(location=0) in vec3 a_position;' +
			'layout(location=1) in vec3 a_id;' +
			'layout(location=2) in float a_color;' +			
			'uniform UBOTransform{ mat4 matProjection; mat4 matCameraView; vec3 posCamera; };' +
			'uniform vec3[3] uColor;'+
			'out lowp vec3 color;'+
			'out lowp vec3 id;'+
			'void main(void){'+
				'vec4 worldpos = matCameraView * vec4(a_position, 1.0);'+
				'float d = distance(posCamera.xyz,worldpos.xyz);'+
				'if(d > 0.0f) gl_PointSize = max(10.0f,(100.0f/d));' +
				'else gl_PointSize = 10.0f;' +
				'color = uColor[ int(a_color) ];'+
				'id = a_id;'+
				'gl_Position = matProjection * worldpos; '+
			'}';

		var fShader = '#version 300 es\n precision mediump float;'+
			'in lowp vec3 color; in lowp vec3 id;'+
			'layout(location = 0) out vec4 outColor0;'+
        	'layout(location = 1) out vec4 outColor1;'+
			'void main(void){ outColor0 = vec4(color,1.0); outColor1 = vec4(id,1.0); }';

		Fungi.Shaders.New("FungiSplineEditor",vShader,fShader)
			.prepareUniforms("uColor","vec3")
			.prepareUniformBlocks(Fungi.Res.Ubo[Fungi.UBO_TRANSFORM],0)
			.setUniforms("uColor",Fungi.Util.rgbArray("0000ff","ff0000","009900"));

		//......................................
		//CREATE MATERIAL
		var mat = Fungi.Shaders.Material.create("FungiSplineEditor","FungiSplineEditor");
		mat.useModelMatrix = false;
		mat.drawMode = Fungi.gl.POINTS;

		//......................................
		//CREATE RENDERABLE
		var ren = new SplineEditor(sampSize,spline);
		ren.material = mat;

		return SplineEditor.renderable = ren;
	}

	draw(){
		//draw points
		Fungi.gl.bindVertexArray(this.vao.id);
		this.material.shader.setUniforms("uColor",this.dotColors);
		Fungi.gl.drawArrays(this.material.drawMode, 0, this.vao.count);
		
		//draw curves
		//Fungi.gl.bindVertexArray(this.curveMesh.vao.id);
		this.curveMesh.draw();

		//draw connector lines
		this.material.shader.setUniforms("uColor",this.conColors);
		//Fungi.gl.bindVertexArray(this.lineMesh.vao.id);
		this.lineMesh.draw();
	}

	constructor(sampSize,spline){
		this.vao = {};
		this.sampleSize = sampSize;						//How many points to sample each curve
		this.splineData = spline;						//Data to visualize and modify
		this.moveRate = 0.008;							//Rate of how to move the points based on mouse movement

		this.pickList = [];								//List of draggable items
		this.pickTarget = [null,null,null];				//Which points are going to be moved based on whats selected					
		this.pickTmpPos = new Fungi.Maths.Vec3();		//Reused var for vector math
		this.pickOffsetPos = new Fungi.Maths.Vec3();	//Reused var for vector math

		this.dotColors = Fungi.Util.rgbArray("0000ff","ff0000","009900");	//Colors for the dots and curves
		this.conColors = Fungi.Util.rgbArray("909090");						//Colors for the connector lines

		//Create Points Buffer
		var p 		= 0,				//Index Mapping
			cID		= [0.0,0.0,0.0],	//ID in GL Color Form
			id		= 0,				//ID as int
			verts	= new Float32Array(spline.points.length * 3),	//Array data for GL Buffers
			color	= new Float32Array(spline.points.length),		//Color Index for vert
			idAry	= new Float32Array(spline.points.length * 3);	//ColorID for Vert

		//Build up the data
		for(var i=0; i < spline.points.length; i++){
			p			= i * 3;
			verts[p]	= spline.points[i][0];
			verts[p+1]	= spline.points[i][1];
			verts[p+2]	= spline.points[i][2];
			color[i]	= (i%3 == 0)? 1 : 2;

			id = Picking.register(this);
			Picking.idToColor(id,cID);
			idAry[p]	= cID[0];
			idAry[p+1]	= cID[1];
			idAry[p+2]	= cID[2];

			this.pickList.push( { 
				id				: id,
				isConn 			: ((i % 3) != 0),
				vecByteStart	: p * Float32Array.BYTES_PER_ELEMENT, 
				position		: spline.points[i], 
				initpos			: new Fungi.Maths.Vec3() 
			} );
		}

		//Push the data to the gpu
		Fungi.Shaders.VAO.create(this.vao)
			.floatArrayBuffer(this.vao,"vert",	verts,0,3,0,0,true,false)
			.floatArrayBuffer(this.vao,"id",	idAry,1,3,0,0,false,false)
			.floatArrayBuffer(this.vao,"color",	color,2,1,0,0,false,false)
			.finalize(this.vao,"FungiSplineEditorPoints");

		this.vao.count	= this.vao.buffers["vert"].count;

		//Setup some dynamic meshes used for visualizing the data.
		this.curveMesh	= new DynamicMesh(100,null);	//Line Curves
		this.lineMesh	= new DynamicMesh(50,null);		//Connector Lines
		this.lineMesh.drawMode = Fungi.gl.LINES;
	}

	//Recreate the curve buffer
	updateDynamicMesh(){
		var inc = 1/this.sampleSize, t = 0, p = 0,
			pos = new Fungi.Maths.Vec3();

		this.curveMesh.clear();
		this.lineMesh.clear();

		for(var i=0; i < this.splineData.curveCount(); i++){
			p = i * 3;
			for(var x = 0; x <= this.sampleSize; x++){
				Spline.cubicBezierPoint(
					this.splineData.points[p],
					this.splineData.points[p+1],
					this.splineData.points[p+2],
					this.splineData.points[p+3],
					x*inc,pos);
				this.curveMesh.verts.push(pos.x,pos.y,pos.z);
			}

			this.lineMesh.verts.push(
				this.splineData.points[p][0],
				this.splineData.points[p][1],
				this.splineData.points[p][2],
				this.splineData.points[p+1][0],
				this.splineData.points[p+1][1],
				this.splineData.points[p+1][2],
				this.splineData.points[p+2][0],
				this.splineData.points[p+2][1],
				this.splineData.points[p+2][2],
				this.splineData.points[p+3][0],
				this.splineData.points[p+3][1],
				this.splineData.points[p+3][2]
			);
		}

		//Do the GPU push on the data
		this.lineMesh.update();	//Draw line between position and control point
		this.curveMesh.update();	//Visualize the bezier curves.
	}

	//On Pick down, find the point that was clicked plus additional points that will be modified
	//right along side it.
	onPickingDown(id,x,y){
		//Find the item being moved
		for(var i=0; i < this.pickList.length; i++){
			if(this.pickList[i].id == id){
				var x = 0,
					a = 0,
					b = 0;

				//Based on if its a Position point or an anchor, set the start/end range to save
				switch(i % 3){
					case 0: //Center Point
						a = (i > 0)? i-1 : i,						//Prev Conn
						b = (i < this.pickList.length -1)? i+1 : i;	//Next Conn
						this.pickTarget.mode = 0;
					break;				
					case 1: //Right Anchor
						a = Math.max(0,i-2);
						b = i;
						this.pickTarget.mode = 1;
					break;
					case 2: //Left Anchor
						a = i;
						b = Math.min(i+2, this.pickList.length -1);
						this.pickTarget.mode = 1;
					break;
				}

				//Save which points need to be used for dragging, center plus Left/Right anchor
				for(var c = a; c <= b; c++){
					this.pickTarget[x] = this.pickList[c];
					this.pickTarget[x].initpos.copy(this.pickTarget[x].position);
					x++;
				}

				this.pickTarget.fSize = x; //How much of the array is used.
				break;
			}
		}
	}

	onPickingMove(id,x,y,dx,dy){
		var v = [0,0,0];

		//Calculate how much movement is needed
		this.pickOffsetPos.set(0,0,0)
			.add(FungiApp.mainCamera.left(v,dx*this.moveRate))
			.add(FungiApp.mainCamera.up(v,-dy*this.moveRate));

		var p		= 0,											//position in the data array
			data	= new Float32Array(this.pickTarget.fSize * 3);	//data for subbuffer update

		//Loop through the points to apply changes while building a small data array
		//with the values needed to push to the GPU to do a subbuffer update.
		for(var i = 0; i < this.pickTarget.fSize; i++){
			p = i * 3;	//Mapping the index of the pickTarget array to what works for the subbuffer array

			//If moving position, move all. If only one anchor, just move that item alone.
			if(this.pickTarget.mode == 0 ||
				(this.pickTarget.mode == 1 && this.pickTarget.fSize == 2 && this.pickTarget[i].id == id)){
				this.pickTmpPos.copy(this.pickTarget[i].initpos).add(this.pickOffsetPos); //Add offset change to initial position.
				this.pickTarget[i].position.copy(this.pickTmpPos);	//Save back data.

			//Apply an Angle Mirror constraint when there is two anchors.
			//If moving anchor but there is a sister anchor available. Do it all in one go in the first loop.
			}else if(this.pickTarget.mode == 1 && this.pickTarget.fSize == 3 && i == 0){
				//Figure out which one is the main one.
				var ai,bi;
				if(this.pickTarget[0].id == id){	ai = 0;	bi = 2; }
				else{								ai = 2;	bi = 0; }
				
				//Move the selected anchor first.
				this.pickTmpPos.copy(this.pickTarget[ai].initpos).add(this.pickOffsetPos);
				this.pickTarget[ai].position.copy(this.pickTmpPos);

				//Get the delta from the center point to the new position of the selected anchor
				var delta = new Fungi.Maths.Vec3();
				this.pickTarget[1].position.sub(this.pickTmpPos,delta);

				/*To mirror the angle and distance, the following line is all we need.*/
				this.pickTarget[bi].position.copy( delta.add(this.pickTarget[1].position) ); 

				/*But we only want to mirror the angle but keep the original distance.
				var mag = this.pickTarget[1].position.magnitude( this.pickTarget[bi].position ); //Get Distance between center and anchor
				
				//change delta to direction vector, apply distance then add to center position as its origin.
				delta.normalize().multi(mag).add( this.pickTarget[1].position );
				this.pickTarget[bi].position.copy( delta );*/
			}

			//Save a copy of the data for gpu push
			data[p]		= this.pickTarget[i].position[0];
			data[p+1]	= this.pickTarget[i].position[1];
			data[p+2]	= this.pickTarget[i].position[2];
		}

		//Idea is to calculate all the changes in sequenced elements, then update 
		//all the points in one go instead of updating up to 3 times for each mouse move event.
		Fungi.Shaders.VAO.updateAryBufSubData(
			this.vao.buffers["vert"].buf,
			this.pickTarget[0].vecByteStart,
			data
		);

		this.updateDynamicMesh(); //Recreate the curve and line meshes
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


	getPointById(id){
		for(var i=0; i < this._points.length; i++){
			if(this._points[i].id == id) return i;
		}
		return -1;
	}

	updateCallback(o){
		//console.log(o);
		Fungi.Shaders.VAO.updateAryBufSubData(
			this.vao.buffers["vert"].buf,
			o.index * this._stride,
			o.position
		);
	}

	updatePositionById(id,x,y,z){
		var i = this.getPointById(id);
		if(i == -1){ console.log('point not found'); return; }

		Fungi.Shaders.VAO.updateAryBufSubData(
			this.vao.buffers["vert"].buf,
			i * this._stride,
			this._points[i].position.set(x,y,z)
		);
	}

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