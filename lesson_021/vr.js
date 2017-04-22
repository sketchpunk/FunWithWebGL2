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

	//Cache Matrix needed to move the Left/Right ViewModal Matrix into Standing/Sitting Space (move head above y=0)
	hmd.fStageViewMatrixInv = Matrix4.identity();
	if(hmd.stageParameters){
		Matrix4.invert(hmd.fStageViewMatrixInv, hmd.stageParameters.sittingToStandingTransform);
	}else{
		//If no stage information exists, pretend the user is some average height in meters for the view matrix.
		Matrix4.translate(hmd.fStageViewMatrixInv,0,1.65,0); //1.65 meters = 5' 4" Feet Tall
		Matrix4.invert(hmd.fStageViewMatrixInv);
	}

	//...................................................
	//\\\ METHODS \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

	//Call once per frame to get the latest position data from the HMD.
	hmd.fUpdate = function(){ this.getFrameData(this.fFrameData); return this; }; //NEW------- Just Return This

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

	hmd.fGetStageSize = function(){
		if(this.stageParameters) return [this.stageParameters.sizeX,this.stageParameters.sizeZ];
		return [0,0];
	}

	hmd.fGetEyeMatrix = function(eye){
		var m = new Float32Array(16);

		if(eye == 0) Matrix4.mult(m, this.fFrameData.leftViewMatrix, this.fStageViewMatrixInv);	//Left Eye ViewMatrix
		else Matrix4.mult(m, this.fFrameData.rightViewMatrix, this.fStageViewMatrixInv);		//Right Eye ViewMatrix

		return m;
	}

	//Transform Position
	hmd.getPoseMatrix = function(){
		var mat = new Float32Array(16);

		var rot = (this.fFrameData.pose.orientation)? this.fFrameData.pose.orientation : [0,0,0,1],  //Rotation is in quaternion;
			pos = (this.fFrameData.pose.position)? this.fFrameData.pose.position : [0,0,0];

		Matrix4.fromRotationTranslation(mat, rot, pos); //Create Head Tracking Matrix in the local space from when the device turned on.
        //Matrix4.invert(mat);							//Turn it into like a Camera matrix
		//Matrix4.mult(mat, mat, this.fStageViewMatrixInv);	//Move to Sitting/Standing Space
		//Matrix4.mult(mat, mat, this.stageParameters.sittingToStandingTransform);	//Move to Sitting/Standing Space BAD
		Matrix4.mult(mat, this.stageParameters.sittingToStandingTransform, mat);	//Move to Sitting/Standing Space		
        //Matrix4.invert(mat);							//Turn everything back from a Camera Matrix

        return mat;
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



class VRPad{
	constructor(vr){
		this.RightPad =	{ref:null, trackPad_Touched:false,trackPad_Pressed:false,trig_Value:0,grip:false,btn:false};
		this.LeftPad =	{ref:null, trackPad_Touched:false,trackPad_Pressed:false,trig_Value:0,grip:false,btn:false};
		this.vr = vr;
	}

	isLeftAvailable(){ return (this.LeftPad.ref != null); }
	isRightAvailable(){ return (this.RightPad.ref != null); }

	update(){
		this.RightPad.ref = null;
		this.LeftPad.ref = null;

		var ary = navigator.getGamepads();
		for(var i=0; i < ary.length; i++){
			if(ary[i] && ary[i].pose){
				if(ary[i].index == 0)	this.RightPad.ref	= ary[i];
				else 					this.LeftPad.ref	= ary[i];
			}
		}
		this.testButtons(0);
	}

	testButtons(i){
		var btn = null, val = 0,
			pad = (i==0)? this.RightPad : this.LeftPad;

		if(pad.ref == null) return;

		//..............................................
		//Trackpad
		btn = pad.ref.buttons[0];
		if(btn.touched != pad.trackPad_Touched){
			pad.trackPad_Touched = btn.touched;
			console.log(i, (pad.trackPad_Touched)? "Touchpad Touched" : "Touchpad Untouched" );
		}

		if(pad.trackPad_Touched){ //If on the touchpad, output position.
			var x = pad.ref.axes[0],
				y = pad.ref.axes[1];

			//Set up a large deadzone for testing. Maybe make this a changeable setting.
			if(Math.abs(x) > 0.5 || Math.abs(y) > 0.5) console.log("Trackpad Position (x,y) ",x,y);
		}

		if(btn.pressed != pad.trackPad_Pressed){
			pad.trackPad_Pressed = btn.pressed;
			console.log(i,  (pad.trackPad_Pressed)? "Touchpad Pressed" : "Touchpad Unpressed" );
		} 

		//..............................................
		//Trigger
		val = (pad.ref.buttons[1].value > 0.05)? pad.ref.buttons[1].value: 0;
		if(val != pad.trig_Value){
			pad.trig_Value = val;

			if(pad.ref.hapticActuators && pad.ref.hapticActuators.length > 0)
				pad.ref.hapticActuators[0].pulse(val, 5); //intensity?

			if(val == 0)		console.log(i, "Trigger at 0");
			else if(val == 1)	console.log(i, "Trigger at full");
			else				console.log(i, "Trigger holding at " + val);
		}

		//..............................................
		//Grip
		btn = pad.ref.buttons[2];
		if(btn.touched != pad.grip){
			pad.grip = btn.touched;			
			console.log(i, (pad.grip)? "Gripping" : "ungripped" );
		}

		//..............................................
		//Menu Btn
		btn = pad.ref.buttons[3];
		if(btn.touched != pad.btn){
			pad.btn = btn.touched;			
			console.log(i, (pad.btn)? "Home Button Down" : "Home Button Up" );
		}
	}

	getMatrix(i){
		var pad	= (i == 0)?					this.RightPad.ref			: this.LeftPad.ref;
		if(pad == null) return null;
		
		var rot	= (pad.pose.orientation)?	pad.pose.orientation	: [0,0,0,1],
			pos	= (pad.pose.position)?		pad.pose.position		: [0,0,-0.5], //If no position, put in front of camera.
			mat = new Float32Array(16);

		Matrix4.fromRotationTranslation(mat,rot,pos);
		Matrix4.mult(mat, this.vr.stageParameters.sittingToStandingTransform, mat);	//Move to Sitting/Standing Space
		return mat;
	}
}


var OPT_TOP			= 1,
	OPT_TOP_GRID	= 2,
	OPT_SIDE		= 4,
	OPT_SIDE_GRID	= 8,
	OPT_BOT_GRID	= 16;

class VRGrid{
	constructor(gl,xSize,zSize){
		var opt = OPT_SIDE | OPT_BOT_GRID | OPT_TOP; //OPT_SIDE | OPT_BOT_GRID | OPT_SIDE_GRID | OPT_TOP | OPT_TOP_GRID;

		this.transform = new Transform();
		this.gl = gl;
		
		this.createMesh(gl,xSize,zSize,opt);
		this.createShader();

		this.StageFadeRange = 0.5;
		this.StageXSize = xSize;
		this.StageZSize = zSize;
		this.StageXSizeHalf = xSize / 2;	//Use this for math in each frame, so just cache the values for less work
		this.StageZSizeHalf = zSize / 2;
		this.StageXRange = this.StageXSizeHalf * this.StageFadeRange;
		this.StageZRange = this.StageZSizeHalf * this.StageFadeRange;
	}

	createShader(){
		var vShader = '#version 300 es\n' +
			'in vec3 a_position;' +
			'uniform mat4 uPMatrix;' +
			'uniform mat4 uMVMatrix;' +
			'uniform mat4 uCameraMatrix;' +
			'void main(void){' +
				'gl_Position = uPMatrix * uCameraMatrix * uMVMatrix * vec4(a_position, 1.0);' +
			'}';
		var fShader = '#version 300 es\n' +
			'precision mediump float;' +
			'out vec4 finalColor;' +
			'uniform float uAlpha;' +
			'void main(void){ ' +
			'finalColor = vec4(0.0,0.0,0.0,uAlpha); '+
			'}';

		//........................................
		this.mShader		= ShaderUtil.createProgramFromText(this.gl,vShader,fShader,true);
		this.mUniformAlpha	= this.gl.getUniformLocation(this.mShader,"uAlpha");
		this.mUniformProj	= this.gl.getUniformLocation(this.mShader,"uPMatrix");
		this.mUniformCamera	= this.gl.getUniformLocation(this.mShader,"uCameraMatrix");
		this.mUniformModelV	= this.gl.getUniformLocation(this.mShader,"uMVMatrix");

		this.gl.useProgram(this.mShader);
		this.gl.uniform1f(this.mUniformAlpha,"1.0");
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

		//Get the current position of the Hmd related to the center of the stage
		var pos = [0,0,0]; //xyz
		Matrix4.getTranslation(pos,gVR.getPoseMatrix());

		var x = this.StageXSizeHalf - Math.abs(pos[0]), //How Far from the edges of the stage are we.
			z = this.StageZSizeHalf - Math.abs(pos[2]),
			a = 0;

		if(x > z) a = MathUtil.smoothStep(this.StageXSizeHalf,this.StageXRange, x);
		else if(z > x) a = MathUtil.smoothStep(this.StageZSizeHalf, this.StageZRange, z);
		//console.log(a);

		//Prepare Shader
		this.gl.useProgram(this.mShader);
		this.gl.bindVertexArray(this.mesh.vao);
		this.gl.enable(this.gl.BLEND);

		//Push Uniforms
		this.gl.uniformMatrix4fv(this.mUniformModelV, false, this.transform.getViewMatrix()); 
		this.gl.uniform1f(this.mUniformAlpha,a);

		//Draw Left Side
		this.gl.viewport(0,0,this.gl.fWidth * 0.5,this.gl.fHeight);
		this.gl.uniformMatrix4fv(this.mUniformProj, false, vr.fFrameData.leftProjectionMatrix); 
		this.gl.uniformMatrix4fv(this.mUniformCamera, false, vr.fGetEyeMatrix(0)); //vr.fFrameData.leftViewMatrix
		this.gl.drawArrays(this.mesh.drawMode, 0, this.mesh.vertexCount);

		//Draw Right Side
		gl.viewport(this.gl.fWidth * 0.5, 0,this.gl.fWidth * 0.5, this.gl.fHeight);
		this.gl.uniformMatrix4fv(this.mUniformProj, false, vr.fFrameData.rightProjectionMatrix); 
		this.gl.uniformMatrix4fv(this.mUniformCamera, false, vr.fGetEyeMatrix(1)); //vr.fFrameData.rightViewMatrix
		this.gl.drawArrays(this.mesh.drawMode, 0, this.mesh.vertexCount);

		//Cleanup
		this.gl.bindVertexArray(null);
		this.gl.disable(this.gl.BLEND);
	}

	createMesh(gl,xSize,zSize,opt){
		xSize = xSize || 1.0;
		zSize = zSize || 1.0;

		var ySize = 1.8288,					//Y Height Size - 1.8288 meters = 6 Feet
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
			verts.push(-xHalf,0,-zHalf,	-xHalf,ySize,-zHalf);	//Left Back
			verts.push(xHalf,0,-zHalf,	xHalf,ySize,-zHalf);	//Right Back
			verts.push(-xHalf,0,zHalf,	-xHalf,ySize,zHalf);	//Left Front
			verts.push(xHalf,0,zHalf,	xHalf,ySize,zHalf);	//Right Front
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


