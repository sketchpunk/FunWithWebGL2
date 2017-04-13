//MAD Thanks to Brandon Jones and his work on getting Vive / WebVR working in Chrome.
//http://www.datchley.name/es6-promises/
//https://webvr.rocks/chromium
function VRInit(gl){
	return new Promise(function(resolve,reject){
		if(!navigator.getVRDisplays) reject("No WEBVR Support");
		else{
			Promise.resolve(navigator.getVRDisplays()).then(
				(ary)=>{ VRInstance(gl,ary,resolve,reject); },
				(err)=>{ reject("Unable to get HMD Reference."); }
			);
		}
	});
}

//hmd.stageParameters
//onEvt(e){console.log("[" + e.type + "] VR Display: " + e.display.displayName + ", Reason: " + e.reason); }
function VRInstance(gl,dVR,resolve,reject){
	//Validate, Check if there is at least one HMD hooked up and if we're able to push frames to it.
	if(!dVR.length){ reject("No HMD Found."); return; }
	if(!dVR[0].capabilities.canPresent){ reject("HMD does not support Presenting"); return; }

	//...................................................
	//\\\ CUSTOM VRDISPLAY OBJECT \\\\\\\\\\\\\\\\\\\\\\\
	var hmd 			= dVR[0],							//You'll only have one HMD connected to the pc, just frame the first one
		leftEye			= hmd.getEyeParameters("left"),
		rightEye		= hmd.getEyeParameters("right");

	hmd.gl				= gl;								//Save reference to GL context, we need it for it for rendering.
	hmd.depthNear		= 0.1;								//How close things can be before getting clipped.
	hmd.depthFar		= 1024.0;							//How far things care visible before getting clipped.
	hmd.fFrameData		= new VRFrameData();				//Object that will hold the position information from the HMD on request.
	hmd.fRenderWidth	= Math.max(leftEye.renderWidth,rightEye.renderWidth) * 2; //Size of Eye Resolutions to change canvas rendering to match
	hmd.fRenderHeight	= Math.max(leftEye.renderHeight,rightEye.renderHeight);						

	//...................................................
	//\\\ METHODS \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

	//Call once per frame to get the latest position data from the HMD.
	hmd.fUpdate = function(){ this.getFrameData(this.fFrameData); };

	hmd.fTogglePresenting = function(){
		if(!this.isPresenting) this.fStartPresenting();
		else this.fStopPresenting();
	}
	
	hmd.fStartPresenting = function(){
		this.requestPresent([{source:this.gl.canvas}]).then(
			()=>{ console.log("VR Presenting request successful"); }, //will trigger onPresentChange Event
			(err)=>{ console.log("VR Presenting request failed"); if(err && err.message) console.log(err.message); }
		);
	}

	hmd.fStopPresenting = function(){
		if(!this.isPresenting) return;
		this.exitPresent().then(
			()=>{ console.log("VR Presenting is has ended.")},
			(err)=>{ console.log("Failure to end VR Presenting."); if(err && err.message) console.log(err.message); }
		);
	}

	//...................................................
	//\\\ EVENTS \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
	//TODO : Bunch of available events available for to tie in. Spend time at some point to see what works and is useful.
	//vrdisplayconnect,vrdisplaydisconnect,vrdisplayactivate,vrdisplaydeactivate,vrdisplayblur,vrdisplayfocus,vrdisplayactivate,vrdisplaydeactivate

	window.addEventListener("vrdisplaypresentchange", function(){ hmd.fOnPresentChange(); },false);
	hmd.fOnPresentChange = function(){
		if(hmd.isPresenting){
			if(hmd.capabilities.hasExternalDisplay){
				hmd.fGLWidth = this.gl.fWidth;
				hmd.fGLHeight = this.gl.fHeight;
				hmd.gl.fSetSize(hmd.fRenderWidth,hmd.fRenderHeight);
			}
		}else{
			if(hmd.capabilities.hasExternalDisplay) hmd.gl.fSetSize(hmd.fGLWidth,hmd.fGLWidth);
		}
	}

	//...................................................
	//\\\ Wrapping Up \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
	resolve(hmd);
}

class VRGrid{
	constructor(gl){
		this.transform = new Transform();
		this.gl = gl;
		this.createMesh(gl)
		this.createShader();
	}

	createShader(){
		var vShader = '#version 300 es\n' +
			'in vec3 a_position;' +
			//'layout(location=4) in float a_color;' +
			'uniform mat4 uPMatrix;' +
			'uniform mat4 uMVMatrix;' +
			'uniform mat4 uCameraMatrix;' +
			//'uniform vec3 uColorAry[4];' +
			//'out lowp vec4 color;' +
			'void main(void){' +
				//'color = vec4(uColorAry[ int(a_color) ],1.0);' +
				'gl_Position = uPMatrix * uCameraMatrix * uMVMatrix * vec4(a_position, 1.0);' +
			'}';
		var fShader = '#version 300 es\n' +
			'precision mediump float;' +
			//'in vec4 color;' +
			'out vec4 finalColor;' +
			'const float xMax = 1.7;' +
			'const float zMax = 1.7;' +
			'const float borderSize = 0.8;' +
			'void main(void){ ' +
			'float xAlpha = smoothstep(xMax-borderSize,xMax,1.2); ' +
			'finalColor = vec4(0.0,0.0,0.0,xAlpha); '+
			'}';

		//........................................
		this.mShader		= ShaderUtil.createProgramFromText(this.gl,vShader,fShader,true);
		//this.mUniformColor	= this.gl.getUniformLocation(this.mShader,"uColorAry");
		this.mUniformProj	= this.gl.getUniformLocation(this.mShader,"uPMatrix");
		this.mUniformCamera	= this.gl.getUniformLocation(this.mShader,"uCameraMatrix");
		this.mUniformModelV	= this.gl.getUniformLocation(this.mShader,"uMVMatrix");

		//........................................
		//Save colors in the shader. Should only need to render once.
		//this.gl.useProgram(this.mShader);
		//this.gl.uniform3fv(this.mUniformColor, new Float32Array([ 0.8,0.8,0.8,  1,0,0,  0,1,0,  0,0,1 ]));
		//this.gl.useProgram(null);
	}

	render(camera){
		//Update Transform Matrix (Modal View)
		this.transform.updateMatrix();

		//Prepare Shader
		this.gl.useProgram(this.mShader);
		this.gl.bindVertexArray(this.mesh.vao);

		//Push Uniforms
		this.gl.uniformMatrix4fv(this.mUniformProj, false, camera.projectionMatrix); 
		this.gl.uniformMatrix4fv(this.mUniformCamera, false, camera.viewMatrix);
		this.gl.uniformMatrix4fv(this.mUniformModelV, false, this.transform.getViewMatrix()); 
	
		//Draw Grid
		//this.gl.drawElements(this.mesh.drawMode, this.mesh.indexCount, this.gl.UNSIGNED_SHORT, 0);
		this.gl.enable(this.gl.BLEND);
		this.gl.drawArrays(this.mesh.drawMode, 0, this.mesh.vertexCount);
		this.gl.disable(this.gl.BLEND);

		//Cleanup
		this.gl.bindVertexArray(null);
		this.gl.useProgram(null);
	}

	renderVR(vr){
		//Update Transform Matrix (Modal View)
		this.transform.updateMatrix();

		//Prepare Shader
		this.gl.useProgram(this.mShader);
		this.gl.bindVertexArray(this.mesh.vao);

		//Push Uniforms
		this.gl.uniformMatrix4fv(this.mUniformModelV, false, this.transform.getViewMatrix()); 

		//Draw Left Side
		this.gl.viewport(0,0,this.gl.fWidth * 0.5,this.gl.fHeight);
		this.gl.uniformMatrix4fv(this.mUniformProj, false, vr.fFrameData.leftProjectionMatrix); 
		this.gl.uniformMatrix4fv(this.mUniformCamera, false, vr.fFrameData.leftViewMatrix);
		this.gl.drawArrays(this.mesh.drawMode, 0, this.mesh.vertexCount);

		//Draw Right Side
		gl.viewport(this.gl.fWidth * 0.5, 0,this.gl.fWidth * 0.5, this.gl.fHeight);
		this.gl.uniformMatrix4fv(this.mUniformProj, false, vr.fFrameData.rightProjectionMatrix); 
		this.gl.uniformMatrix4fv(this.mUniformCamera, false, vr.fFrameData.rightViewMatrix);
		this.gl.drawArrays(this.mesh.drawMode, 0, this.mesh.vertexCount);

		//Cleanup
		this.gl.bindVertexArray(null);
	}

	createMesh(gl){
		var OPT_TOP			= 1,
			OPT_TOP_GRID	= 2,
			OPT_SIDE		= 4,
			OPT_SIDE_GRID	= 8,
			OPT_BOT_GRID	= 16;

		var opt = OPT_SIDE | OPT_BOT_GRID | OPT_TOP; //OPT_SIDE | OPT_BOT_GRID | OPT_SIDE_GRID | OPT_TOP | OPT_TOP_GRID;

		var xSize = 2.4,					//X Width Size
			zSize = 1.6,					//Z Width Size
			ySize = 1.0,					//Y Height Size
			incSize = 0.2,					//Space between lines
			xHalf = xSize / 2.0,			//Calc Half way points in our sizes
			zHalf = zSize / 2.0,
			yHalf = ySize / 2.0,
			xIncLen = xHalf / incSize,		//How many lines from the center can be made
			zIncLen = zHalf / incSize,
			yIncLen = yHalf / incSize;

		//If no remainder, need to subtract one else the grid will overlap the rect
		xIncLen = ( (xIncLen % 1) == 0 )? Math.floor(xIncLen)-1 : Math.floor(xIncLen);
		zIncLen = ( (zIncLen % 1) == 0 )? Math.floor(zIncLen)-1 : Math.floor(zIncLen);
		yIncLen = ( (yIncLen % 1) == 0 )? Math.floor(yIncLen)-1 : Math.floor(yIncLen);
		var tIncLen = Math.max(Math.max(xIncLen,zIncLen),yIncLen);

		var opt_top			= ((opt & OPT_TOP) == OPT_TOP),
			opt_top_grid	= ((opt & OPT_TOP_GRID) == OPT_TOP_GRID),
			opt_bot_grid	= ((opt & OPT_BOT_GRID) == OPT_BOT_GRID),
			opt_side		= ((opt & OPT_SIDE) == OPT_SIDE),
			opt_side_grid	= ((opt & OPT_SIDE_GRID) == OPT_SIDE_GRID);

		var p, verts = [];

		//-----------------------------------		
		//Create Center Cross
		if(opt_bot_grid){
			verts.push(-xHalf,0,0,		xHalf,0,0);			//Center Horizontal Line Bottom
			verts.push(0,0,-zHalf,		0,0,zHalf);			//Center Vertical Line Bottom
		}

		if(opt_top_grid){
			verts.push(-xHalf,ySize,0,	xHalf,ySize,0);		//Repeat for top.
			verts.push(0,ySize,-zHalf,	0,ySize,zHalf);		
		}

		if(opt_side_grid){
			verts.push(0,0,-zHalf,	0,ySize,-zHalf);	//Back Vertical
			verts.push(0,0,zHalf,	0,ySize,zHalf);		//Front
			verts.push(-xHalf,0,0,	-xHalf,ySize,0);	//Left
			verts.push(xHalf,0,0,	xHalf,ySize,0);		//Right

			verts.push(-xHalf,yHalf,-zHalf,	xHalf,yHalf,-zHalf);	//Back Border
			verts.push(-xHalf,yHalf,zHalf,	xHalf,yHalf,zHalf);		//Front Border
			verts.push(-xHalf,yHalf,-zHalf,	-xHalf,yHalf,zHalf);	//Left Border
			verts.push(xHalf,yHalf,-zHalf,	xHalf,yHalf,zHalf);		//Right Border
		}

		//-----------------------------------
		//Build Bottom Rect
		verts.push(-xHalf,0,-zHalf,	xHalf,0,-zHalf);	//Back Border
		verts.push(-xHalf,0,zHalf,	xHalf,0,zHalf);		//Front Border
		verts.push(-xHalf,0,-zHalf,	-xHalf,0,zHalf);	//Left Border
		verts.push(xHalf,0,-zHalf,	xHalf,0,zHalf);		//Right Border

		if(opt_top){
			verts.push(-xHalf,ySize,-zHalf,	xHalf,ySize,-zHalf);	//Repeat for the top
			verts.push(-xHalf,ySize,zHalf,	xHalf,ySize,zHalf);
			verts.push(-xHalf,ySize,-zHalf,	-xHalf,ySize,zHalf);
			verts.push(xHalf,ySize,-zHalf,	xHalf,ySize,zHalf);
		}

		if(opt_side){	//Vertical Border Lines
			verts.push(-xHalf,0,-zHalf,	-xHalf,ySize,-zHalf,);	//Left Back
			verts.push(xHalf,0,-zHalf,	xHalf,ySize,-zHalf,);	//Right Back
			verts.push(-xHalf,0,zHalf,	-xHalf,ySize,zHalf,);	//Left Front
			verts.push(xHalf,0,zHalf,	xHalf,ySize,zHalf,);	//Right Front
		}

		//-----------------------------------
		//Build Grid.
		for(var i=1; i <= tIncLen; i++){
			p = incSize*i;

			if(i <= xIncLen){
				if(opt_bot_grid){
					verts.push(p,0,-zHalf,	p,0,zHalf);		//Vertical Going Right BOTTOM
					verts.push(-p,0,-zHalf,	-p,0,zHalf);	//Vertical Going Left
				}
				if(opt_top_grid){
					verts.push(p,ySize,-zHalf,	p,ySize,zHalf);		//Vertical Going Right TOP
					verts.push(-p,ySize,-zHalf,	-p,ySize,zHalf);	//Vertical Going Left
				}
				if(opt_side_grid){
					verts.push(p,0,-zHalf,	p,ySize,-zHalf);	//Vert Going Right Back
					verts.push(-p,0,-zHalf,	-p,ySize,-zHalf);	//Vert Going Left Back
					verts.push(p,0,zHalf,	p,ySize,zHalf);		//Vert Going Right front
					verts.push(-p,0,zHalf,	-p,ySize,zHalf);	//Vert Going Left front
				}
			}

			if(i <= zIncLen){
				if(opt_bot_grid){
					verts.push(-xHalf,0,p,		xHalf,0,p);		//Horizontal Going Forward BOTTOM
					verts.push(-xHalf,0,-p,		xHalf,0,-p);	//Horizontal Going Backwards
				}
				if(opt_top_grid){
					verts.push(-xHalf,ySize,p,		xHalf,ySize,p);		//Horizontal Going Forward TOP
					verts.push(-xHalf,ySize,-p,		xHalf,ySize,-p);	//Horizontal Going Backwards
				}
				if(opt_side_grid){
					verts.push(-xHalf,0,-p,	-xHalf,ySize,-p);	//Left Going Back
					verts.push(-xHalf,0,p,	-xHalf,ySize,p);	//Left Going Forward
					verts.push(xHalf,0,-p,	xHalf,ySize,-p);	//Right Going Back
					verts.push(xHalf,0,p,	xHalf,ySize,p);		//Right Going Forward
				}
			}

			if(opt_side_grid && i <= yIncLen){
				verts.push(-xHalf,yHalf+p,-zHalf,	xHalf,yHalf+p,-zHalf);	//Back Up
				verts.push(-xHalf,yHalf-p,-zHalf,	xHalf,yHalf-p,-zHalf);	//Back Down
				verts.push(-xHalf,yHalf+p,zHalf,	xHalf,yHalf+p,zHalf);	//Front Up
				verts.push(-xHalf,yHalf-p,zHalf,	xHalf,yHalf-p,zHalf);	//Front Down

				verts.push(-xHalf,yHalf+p,-zHalf,	-xHalf,yHalf+p,zHalf);	//Left Up
				verts.push(-xHalf,yHalf-p,-zHalf,	-xHalf,yHalf-p,zHalf);	//Left Down
				verts.push(xHalf,yHalf+p,-zHalf,	xHalf,yHalf+p,zHalf);	//Right Up
				verts.push(xHalf,yHalf-p,-zHalf,	xHalf,yHalf-p,zHalf);	//Right Up
			}
		}

		
		//Setup
		var //attrColorLoc = 4,
			strideLen,
			mesh = { drawMode:gl.LINES, vao:gl.createVertexArray() };

		//Do some math
		mesh.vertexComponentLen = 3;//4;
		mesh.vertexCount = verts.length / mesh.vertexComponentLen;
		//strideLen = Float32Array.BYTES_PER_ELEMENT * mesh.vertexComponentLen; //Stride Length is the Vertex Size for the buffer in Bytes

		//Setup our Buffer
		mesh.bufVertices = gl.createBuffer();
		gl.bindVertexArray(mesh.vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.bufVertices);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(ATTR_POSITION_LOC);
		//gl.enableVertexAttribArray(attrColorLoc);
		
		gl.vertexAttribPointer(ATTR_POSITION_LOC,3,gl.FLOAT,false,0,0);
		//gl.vertexAttribPointer(attrColorLoc,1,gl.FLOAT,false,strideLen,Float32Array.BYTES_PER_ELEMENT * 3);

		//Cleanup and Finalize
		gl.bindVertexArray(null);
		gl.bindBuffer(gl.ARRAY_BUFFER,null);
		gl.mMeshCache["vrgrid"] = mesh;
		this.mesh = mesh;
	}
}
