/*NOTES:
Tutorial on how to control FPS :: http://codetheory.in/controlling-the-frame-rate-with-requestanimationframe/

EXAMPLE:
rloop = new RenderLoop(function(dt){ 
	console.log(rloop.fps + " " + dt);
},10).start();
*/

class RenderLoop{
	constructor(callback,fps){
		var oThis = this;
		this.msLastFrame = null;	//The time in Miliseconds of the last frame.
		this.callBack = callback;	//What function to call for each frame
		this.isActive = false;		//Control the On/Off state of the render loop
		this.fps = 0;				//Save the value of how fast the loop is going.

		//if(!fps && fps > 0){ //Build a run method that limits the framerate
		if(fps != undefined && fps > 0){ //Build a run method that limits the framerate
			this.msFpsLimit = 1000/fps; //Calc how many milliseconds per frame in one second of time.
			this.run = function(){
				//Calculate Deltatime between frames and the FPS currently.
				var msCurrent	= performance.now(),
					msDelta		= (msCurrent - oThis.msLastFrame),
					deltaTime	= msDelta / 1000.0;		//What fraction of a single second is the delta time
				
				if(msDelta >= oThis.msFpsLimit){ //Now execute frame since the time has elapsed.
					oThis.fps			= Math.floor(1/deltaTime);
					oThis.msLastFrame	= msCurrent;
					oThis.callBack(deltaTime);
				}

				if(oThis.isActive) window.requestAnimationFrame(oThis.run);
			}
		}else{ //Else build a run method thats optimised as much as possible.
			this.run = function(){
				//Calculate Deltatime between frames and the FPS currently.
				var msCurrent	= performance.now(),	//Gives you the whole number of how many milliseconds since the dawn of time :)
					deltaTime	= (msCurrent - oThis.msLastFrame) / 1000.0;	//ms between frames, Then / by 1 second to get the fraction of a second.

				//Now execute frame since the time has elapsed.
				oThis.fps			= Math.floor(1/deltaTime); //Time it took to generate one frame, divide 1 by that to get how many frames in one second.
				oThis.msLastFrame	= msCurrent;

				oThis.callBack(deltaTime);
				if(oThis.isActive) window.requestAnimationFrame(oThis.run);
			}
		}
	}

	start(){
		this.isActive = true;
		this.msLastFrame = performance.now();
		window.requestAnimationFrame(this.run);
		return this;
	}

	stop(){ this.isActive = false; }
}