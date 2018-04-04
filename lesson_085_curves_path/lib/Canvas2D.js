
class Canvas2D{
	constructor(elmName){
		this.canvas	= document.getElementById(elmName);
		this.ctx	= this.canvas.getContext("2d");
		this.width	= this.canvas.width = window.innerWidth;
		this.height	= this.canvas.height = window.innerHeight;

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

	style(cFill = "#ffffff", cStroke = "#606060", lWidth = 3){
		if(cFill != null) 	this.ctx.fillStyle		= cFill;
		if(cStroke != null) this.ctx.strokeStyle	= cStroke;
		if(lWidth != null) 	this.ctx.lineWidth		= lWidth;
		return this;
	}

	lineDash(ary = null){ 
		if(ary == null) ary = [0];
		this.ctx.setLineDash(ary);
		return this;
	}

	//===================================================
	// Canvas Methods
	clear(){ this.ctx.clearRect(this.clearX, this.clearY, this.width, this.height); return this; }


	//===================================================
	// Drawing
	circle(x, y, radius = 10, draw = "fill"){
		this.ctx.beginPath();
		this.ctx.arc(x, y, radius ,0, Math.PI*2, false);
		this.ctx[draw]();
		return this;
	}

	vecCircle(draw, radius, v){
		if(arguments.length > 3){
			for(var i=1; i < arguments.length; i++){
				this.ctx.beginPath();
				this.ctx.arc(arguments[i][0], arguments[i][1], radius ,0, Math.PI*2, false);
				this.ctx[draw]();
			}
		}else{
			this.ctx.beginPath();
			this.ctx.arc(v[0], v[1], radius ,0, Math.PI*2, false);
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
}

/*
			context.beginPath();
			context.moveTo(p0.x, p0.y);
			context.lineTo(pA.x, pA.y);
			context.lineTo(pB.x, pB.y);
			context.lineTo(pC.x, pC.y);
			context.lineTo(p1.x, p1.y);
			context.stroke();


context.save(); //Save state, so we can restore it later to redo transform and rotations
		context.translate(arrowX,arrowY); //Move the cord system to 0,0 is in the middle of the screen.
		context.rotate(angle); //Rotate the whole canvas

		context.beginPath();
		context.moveTo(20,0);
		context.lineTo(-20,0);
		context.moveTo(20,0);
		context.lineTo(10,-10);
		context.moveTo(20,0);
		context.lineTo(10,10);
		context.stroke();

		context.restore();

*/

export default Canvas2D;