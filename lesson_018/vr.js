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