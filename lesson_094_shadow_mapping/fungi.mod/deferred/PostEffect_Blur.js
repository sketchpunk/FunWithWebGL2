import Fungi	from "/fungi/Fungi.js";
import gl		from "/fungi/gl.js";
import Fbo		from "/fungi/Fbo.js";


//http://dev.theomader.com/gaussian-kernel-calculator/
class PostEffect_Blur{
	constructor(whScale = 1.0, shader){
		this.finalTexture	= null;
		this.fbo			= new Array(2);
		this.whScale		= whScale;
		this.shader			= shader; //Fungi.getShader("FungiBlur");
		
		this.dir			= [ new Float32Array([1,0]), new Float32Array([0,1]) ]; //Vert/Hori Blur
		this.startOptions	= { depthTest:false, depthMask:false };
		this.endOptions		= { depthTest:true, depthMask:true };

		//-----------------------------------------------------
		// Blur Setting
		// [0.382925, 0.24173, 0.060598, 0.005977, 0.000229, 0.000003]
		// [0.44198, 0.27901]
		this.kernel		= new Float32Array([0.38774, 0.24477, 0.06136]); //
		this.kernelLen	= this.kernel.length;
		this.applyCount = 3;

		//-----------------------------------------------------
		//Setup Frame buffers for Ping-Pong Rendering
		var w	= Math.floor(gl.width * whScale),
			h 	= Math.floor(gl.height * whScale),
			fbo	= new Fbo();

		this.fbo[0] = fbo.create(w,h).texColorBuffer().finalize("blurPS_01");
		this.fbo[1] = fbo.create(w,h).texColorBuffer().finalize("blurPS_02");		
	}

	render(initialTexture, quad){
		Fungi.render.clearMaterial()
			.loadShader( this.shader )
			.loadOptions( this.startOptions );
		
		//If temp framebuffers are smaller then scene texture, then we need to change the view port before drawing.
		if(this.whScale != 1.0) gl.ctx.viewport(0, 0, this.fbo[0].frameWidth, this.fbo[0].frameHeight);


		//-----------------------------------------------------
		var i=0, ii=1, tex;
		for(var x=0; x < 6; x++){
			i	= x % 2;		//Current Index : Draw Into
			ii	= (i+1) % 2;	//Next Index : Draw From
			tex = (x == 0)? initialTexture : this.fbo[ii].bColor.id;

			this.shader.resetTextureSlot().setUniforms(
				"u_colorTex",	tex,
				"u_dir",		this.dir[i],
				"u_kernelLen",	this.kernelLen,
				"u_kernel",		this.kernel
			);
			
			Fbo.clear(this.fbo[i],false); //Switch to new Frame Buffer and clear it out.
			Fungi.render.drawRenderable( quad );
		}


		//-----------------------------------------------------
		//CLEAN UP
		this.finalTexture = this.fbo[i].bColor.id;	// Save Frame Buffer Texture that was last rendered to
		Fbo.deactivate();							// Switch back to Display Frame Buffer
		
		if(this.whScale != 1.0) gl.ctx.viewport(0, 0, gl.width, gl.height); // Fix ViewPort

		Fungi.render.clearShader().loadOptions( this.endOptions );
	}
}

export default PostEffect_Blur;