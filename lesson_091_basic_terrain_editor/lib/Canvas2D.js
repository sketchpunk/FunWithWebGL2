
class Canvas2D{
	constructor(elmName, w = null, h = null){
		this.canvas	= document.getElementById(elmName);
		this.ctx	= this.canvas.getContext("2d");

		this.offsetX = 0;
		this.offsetY = 0;
		
		if(w && h) 	this.size(w,h);
		else 		this.size(window.innerWidth, window.innerHeight);

		this.clearX	= 0;
		this.clearY	= 0;
	}

	//===================================================
	// Canvas Settings
		center(){
			this.ctx.translate(this.width * 0.5, this.height * 0.5);
			this.clearX = -this.width * 0.5;
			this.clearY = -this.height * 0.5;
			return this;
		}

		flipY(){ this.ctx.scale(1,-1); return this; }

		bottomLeft(){
			this.ctx.translate(0, this.height);
			this.ctx.scale(1,-1);
			this.clearX = 0;
			this.clearY = 0;
			return this;
		}

		lineWidth(v){ this.ctx.lineWidth = v; return this; }
		fill(v){ this.ctx.fillStyle = v; return this; }
		stroke(v){ this.ctx.strokeStyle = v; return this; }
		style(cFill = "#ffffff", cStroke = "#505050", lWidth = 3){
			if(cFill != null) 	this.ctx.fillStyle		= cFill;
			if(cStroke != null) this.ctx.strokeStyle	= cStroke;
			if(lWidth != null) 	this.ctx.lineWidth		= lWidth;
			return this;
		}

		lineDash(ary = null, lineWidth = null){ 
			if(!ary) ary = [0];
			this.ctx.setLineDash(ary);

			if(lineWidth != null) this.ctx.lineWidth = lineWidth;
			return this;
		}

		font(font = "12px verdana", textAlign="left"){
			if(font)		this.ctx.font		= font;
			if(textAlign)	this.ctx.textAlign	= textAlign;
			return this;
		}


		//Set the size of the canvas html element and the rendering view port
		size(w = 500, h = 500){
			//set the size of the canvas, on chrome we need to set it 3 ways to make it work perfectly.
			this.canvas.style.width		= w + "px";
			this.canvas.style.height	= h + "px";
			this.canvas.width			= w;
			this.canvas.height			= h;

			this.width = w;
			this.height = h;

			var box			= this.canvas.getBoundingClientRect();
			this.offsetX	= box.left;	//Help get X,Y in relation to the canvas position.
			this.offsetY	= box.top;

			return this;
		}

		mouseEvents(onDown=null, onMove=null, onUp=null){
			if(onDown){
				this.canvas.addEventListener("mousedown", (e)=>{
					e.preventDefault(); e.stopPropagation();
					onDown(e, e.clientX - this.offsetX, e.clientY - this.offsetY);
				});
			}
			if(onMove){
				this.canvas.addEventListener("mousemove", (e)=>{
					e.preventDefault(); e.stopPropagation();
					onMove(e, e.clientX - this.offsetX, e.clientY - this.offsetY);
				});
			}
			
			if(onUp){
				this.canvas.addEventListener("mouseup", (e)=>{
					e.preventDefault(); e.stopPropagation();
					onUp(e, e.clientX - this.offsetX, e.clientY - this.offsetY);
				});
			}
			return this;
		}

	//===================================================
	// Canvas Methods
		clearWithColor(c){ return this.fill(c).rect(); }
		clear(){ this.ctx.clearRect(this.clearX, this.clearY, this.width, this.height); return this; }

		restoreTransform(){ this.ctx.restore(); return this; }
		saveTransform(vpos = null, ang = null, vscale = null){
			this.ctx.save();
			if(vpos)		this.ctx.translate(vpos[0],vpos[1]);
			if(ang != null)	this.ctx.rotate(ang);
			if(vscale)		this.ctx.scale(vscale[0], vscale[1]);
			return this;
		}


	//===================================================
	// Drawing
		circle(x, y, radius = 10, draw = "fill"){
			this.ctx.beginPath();
			this.ctx.arc(x, y, radius ,0, Math.PI*2, false);
			this.ctx[draw]();
			return this;
		}

		rect(x=0, y=0, w=0, h=0, draw = "fill"){
			if(!w) w = this.width;
			if(!h) h = this.height;

			this.ctx.rect(x, y, w, h);
			this.ctx[draw]();
			return this;
		}

		vecCircle(draw, radius, v = null){
			if(arguments.length > 3){
				for(var i=1; i < arguments.length; i++){
					this.ctx.beginPath();
					this.ctx.arc(arguments[i][0], arguments[i][1], radius ,0, Math.PI*2, false);
					this.ctx[draw]();
				}
			}else{
				this.ctx.beginPath();
				if(v)	this.ctx.arc(v[0], v[1], radius ,0, Math.PI*2, false);
				else	this.ctx.arc(0, 0, radius ,0, Math.PI*2, false);
				this.ctx[draw](); //this.ctx.fill();
			}
			return this;
		}

		vecEllipse(v, xRadius = 5, yRadius = 10, draw = "stroke"){
			this.ctx.beginPath();
			this.ctx.ellipse(v[0], v[1], xRadius, yRadius , 0, Math.PI*2, false);
			this.ctx[draw]();
			return this;
		}

		vecLine(draw, p0, p1){
			this.ctx.beginPath();
			this.ctx.moveTo( p0[0], p0[1] );

			if(arguments.length > 3){
				for(var i=2; i < arguments.length; i++)
					this.ctx.lineTo( arguments[i][0], arguments[i][1] );

			}else this.ctx.lineTo( p1[0], p1[1] );

			this.ctx[draw]();
			return this;
		}

		vecTri(draw, wh, hh, offsetX = 0, offsetY = 0){
			this.ctx.beginPath();
			this.ctx.moveTo(offsetX,		offsetY + hh );
			this.ctx.lineTo(offsetX - wh,	offsetY - hh );
			this.ctx.lineTo(offsetX + wh,	offsetY - hh );
			this.ctx[draw]();
			return this;
		}

		text(x, y, txt){
			this.ctx.fillText(txt, x, y);
			return this;
		}
}

export default Canvas2D;