/*##################################################################
This handles generating all the wave forms, then pushes the data to the
canvas to be visualized into something more understandable.
##################################################################*/
//http://flafla2.github.io/2014/08/09/perlinnoise.html
//http://devmag.org.za/2009/04/25/perlin-noise/
//http://gamelogic.co.za/2014/06/17/cloudy-noise-on-a-hex-grid/
//http://www.redblobgames.com/grids/hexagons/
//http://libnoise.sourceforge.net/docs/classnoise_1_1module_1_1Perlin.html
class PerlinOctaves{
	constructor(){
		this.octave			= 3;
		this.sampleCnt		= 15;
		this.freq			= 0.035;
		this.freqOffset		= 0.0;
		this.aptitude		= 150;
		this.lacunarity		= 2; //Control how freq gets increased per octave
		this.persistance	= 0.4; //Control How aptitude decreases per octave
		this.weight			= 0.8;

		/*
		xOffset : Starting X
		yOffset : Starting Y
		xFreq : How much to move in the X Direction
		yFreq :

		Octaves - Change between noise
		Lacunarity : How Freq changes per Octave : best results, set the lacunarity to a number between 1.5 and 3.5.
		Persistance
		*/

	}

	getWaveSamples(){
		var ary = [];
		for(var i=0; i <= this.octave; i++) ary.push(new Array(this.sampleCnt));

		var o,f,a,n,nAvg;

		for(var s=0; s < this.sampleCnt; s++){
			nAvg = 0;
			for(o=0; o < this.octave; o++){
				f = this.freqOffset + (this.freq * s * Math.pow(this.lacunarity,o));
				a = this.aptitude * Math.pow(this.persistance,o);
				n = noise.perlin2(f,f) * a;
				nAvg += (o != 0)? n * Math.pow(this.weight,o) : n;
				ary[o][s] = n;
			}
			
			ary[this.octave][s] = nAvg;// / this.octave;
		}
		//console.log(ary);
		return ary;
	}

	getXY(x,y){
		var nx = this.freqOffset + (this.freq * x), //* Math.pow(this.lacunarity,o)
			ny = this.freqOffset + (this.freq * y),
			n = noise.perlin2(nx,ny);

		var nx,ny,nAvg = 0,n,
		nMax = -1000,nMin = 1000;

		for(var o=0; o < this.octave; o++){
			nx = this.freqOffset + (this.freq * x * Math.pow(this.lacunarity,o));
			ny = this.freqOffset + (this.freq * y * Math.pow(this.lacunarity,o));
			n = noise.perlin2(nx,ny) * (this.aptitude * Math.pow(this.persistance,o));
			if(o != 0) n *= Math.pow(this.weight,o);

			if(n < nMin) nMin = n;
			if(n > nMax) nMax = n;

			nAvg += n;
		}

		nAvg /= this.octave; //TODO Averaging not the best, it gives a different effect. Need to just Add up all the octaves
		//But to get a normalized value, need to process the whole
		return (nAvg - nMin) / (nMax - nMin);

		//return (n+1)/2;
	}

	processXY(xLen,yLen){

	}

	static getWaveSample(out,sampleCnt,freq,apt,oct){
		var f = 0.0;

		//freq = 0.05 * Math.pow(2,0);
		//apt = 100 * Math.pow(0.5,0);

		//sampleCnt = 30;

		for(var i=0; i < sampleCnt; i++){
			f += freq;
			out.push(noise.perlin2(f,f) * apt);
		}
	}
}


class WaveView{
	constructor(canvasID){
		this.canvas = document.getElementById(canvasID);	//Save Canvas Ref for future use.
		this.context = this.canvas.getContext("2d");

		//var box = this.canvas.getBoundingClientRect();
		//this.width = this.canvas.width;
		//this.height = this.canvas.height;

		this.context.translate(0,this.canvas.height/2);		//Move cords so y is centered
		//console.log(this.canvas.width,this.canvas.clientWidth);

		/*
					this.canvas.style.width = w + "px";
			this.canvas.style.height = h + "px";
			this.canvas.width = w;
			this.canvas.height = h;

			//when updating the canvas size, must reset the viewport of the canvas 
			//else the resolution webgl renders at will not change
			this.viewport(0,0,w,h);
			this.fWidth = w;	//Need to save Width and Height to resize viewport for WebVR
			this.fHeight = h;
			*/

		this.drawCenter();

	}

	drawCenter(){
		this.context.beginPath();
		this.context.moveTo(0,0);
		this.context.lineTo(this.canvas.width,0);		
		this.context.strokeStyle = "#999999";
		this.context.lineWidth = 1;
      	this.context.stroke();
      	return this;
	}

	drawArray(ary){
		var c		= this.context,
			step	= this.canvas.width / (ary.length - 1),
			x		= 0,
			rng		= 100,
			hRng	= rng * -0.5;

		c.clearRect(0,this.canvas.height/-2,this.canvas.width,this.canvas.height);
		this.drawCenter();

      	c.beginPath();
		c.moveTo(0,ary[0]);
		
		for(var i = 1; i < ary.length; i++){
			x += step;
			c.lineTo(x,ary[i]);
		}

		c.strokeStyle = "#ff0000";
		c.lineWidth = 2;
		c.stroke();
	}

	clear(){ this.context.clearRect(0,this.h2,this.canvas.width,this.canvas.height); }
}

class WaveData{
	constructor(apt,scale,freq,can){
		this.ary = [];
		
		this.scale = scale;
		this.freq = freq;
		this.y = 0;
		this.z = 0;

		this.lacunarity = 2;
		this.persistance = 0.5;

		this.sampleCnt = 30;
		this.height = 200;
		this.aptitude = 100 * Math.pow(this.persistance,0);
		this.freq = 0.05 * Math.pow(this.lacunarity,0);


		this.canvas = can;

		//Freq == X, Amp = Y
	}
	//static map(x, xMin,xMax, zMin,zMax){ return (x - xMin) / (xMax - xMin) * (zMax-zMin) + zMin; }
	setY(v){ this.y = parseFloat(v); return this; }
	setZ(v){ this.z = parseFloat(v); return this; }
	setScale(v){ this.scale = parseFloat(v); return this; }
	setAptitude(v){ this.aptitude = parseFloat(v); return this; }
	setFreq(v){ this.freq = parseFloat(v); this.canvas.reset(); return this; }

	gen(doPush){
		this.genPerlin();
		if(doPush == true) this.push();
		return this;
	}

	genPerlin(){
		var f = 0.0,
			min = this.aptitude / -2;

		this.ary = [];
		var n;
		for(var i=0; i <= this.sampleCnt; i++){
			f += this.freq;
			
			n = noise.perlin2(f,f);
			//console.log(f,n);


			//console.log(f,n);
			
			this.ary.push(n * this.aptitude);
			//this.ary.push(min + PerlinNoise.noise(x,this.y,this.z) * this.aptitude);
		}	
	}

	push(){ this.canvas.setData(this.ary,false); return this; }
}


/*##################################################################
This object just handles drawing and animating on the canvas.
##################################################################*/
class CanvasWave{
	constructor(cID,aptID,scaleID){
		this._can = document.getElementById(cID);	//Save Canvas Ref for future use.
		this._c = this._can.getContext("2d");		//Save Context, its how we draw
		this._c.translate(0,this._can.height/2);		//Move cords so y is centered

		this.h2 = this._can.height / -2;

		this.lerpStep = 0.1;
		this.lerpPos = 0;
		this.lerpAry = null;
		this.ary = null;
		
		this.lineWidth = 2;
		this.lineColor = "#ff0000";
		this.barColor = "#999999";

		this.anim = new Animator(35,()=>{return this.draw();});
	}

	setData(ary,doReset){
		this.lerpAry = ary;

		if(doReset){
			this.ary = null;	
			this.draw();
		}else{
			this.lerpPos = 0;
			this.anim.start();
		}
	}

	reset(){ this.ary = null; this.lerpAry = null; }
	clear(){ this._c.clearRect(0,this.h2,this._can.width,this._can.height); }

	drawCenter(){
		var c = this._c;
		c.beginPath();
		c.moveTo(0,0);
		c.lineTo(this._can.width,0);		
		c.strokeStyle = this.barColor;
      	c.stroke();
	}

	draw(){
		var c = this._c,
			x = 0,
			step = this._can.width / (this.lerpAry.length-1),
			state = true;
		
		this.clear();
		this.drawCenter();
		
      	c.beginPath();
		

		if(this.anim.active && this.ary != null){
			let y = easeInOutQuad(this.lerpPos, this.ary[0],this.lerpAry[0]-this.ary[0], 1); 
			c.moveTo(0,y);

			for(let i=1; i < this.lerpAry.length; i++){
				x += step;
				y = easeInOutQuad(this.lerpPos, this.ary[i],this.lerpAry[i]-this.ary[i], 1); 
				c.lineTo(x,y);
			}

			this.lerpPos += this.lerpStep;
			if(this.lerpPos <= 1) state = false; //Not done drawing the animation
		}else{
			this.anim.stop();
			c.moveTo(0,this.lerpAry[0]);
			for(let i=1; i < this.lerpAry.length; i++){
				x += step;
				c.lineTo(x,this.lerpAry[i]);
			}
		}

		c.strokeStyle = this.lineColor;
		c.lineWidth = this.lineWidth;
		c.stroke();

		//When done drawing, save lerp data for next call.
		if(state){
			this.ary = this.lerpAry;
			this.lerpAry = null;
		}

		return state;
	}
}






/*##################################################################
Built it like a task that can take in a runnable. It keeps looping
using animation frame till the runnable returns true.

ex: this.anim = new Animator(35,()=>{return this.draw();});
##################################################################*/
class Animator{
	constructor(t,func){
		this.active = false;		//State if the object is busy animating something
		this.interval = t;			//How much time before calling the func again
		this.lastFrame = null;		//Track time of last func call.
		this.func = func;			//Just a delegate reference, so the object reference can be kept

		this.run = ()=>{
			if(!this.active) return;

			var now = window.performance.now(),
				delta = now - this.lastFrame;
			
			if(delta >= this.interval){
				this.lastFrame = now;
				if(this.func()){ this.stop(); return; }
			}

			requestAnimationFrame(this.run);
		}
	}

	stop(){ this.active = false; }
	start(){
		this.active = true;
		this.lastFrame = window.performance.now();
		this.run();
	}
}

/*##################################################################
Just some functions to help create a smooth animation.
##################################################################*/

function lerp(norm,min,max){ return (max-min) * norm + min }
function easeInOutQuad(t, b, c, d){
	t /= d/2;
	if (t < 1) return c/2*t*t + b;
	t--;
	return -c/2 * (t*(t-2) - 1) + b;
}