import gl from "./gl.js";


class Fbo{
	constructor(){
		this.fbo = null;
		this.aryDrawBuf = [];
	}

	//-------------------------------------------------
	// START AND COMPLETE CREATING FRAME BUFFER
	//-------------------------------------------------
		create(w=null, h=null){
			if(w == null) w = gl.width;
			if(h == null) h = gl.height;

			this.fbo = { frameWidth:w, frameHeight:h, id:gl.ctx.createFramebuffer() };
			this.aryDrawBuf.length = 0;

			gl.ctx.bindFramebuffer(gl.ctx.FRAMEBUFFER, this.fbo.id);
			return this;
		}

		finalize(name){
			//Assign which buffers are going to be written too
			//https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/drawBuffers
			//https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/readBuffer
			if(this.aryDrawBuf.length > 0)	gl.ctx.drawBuffers(this.aryDrawBuf);
			else{
				gl.ctx.drawBuffers([gl.ctx.NONE]);	//No Color Buffers Available to Draw into
				gl.ctx.readBuffer(gl.ctx.NONE);
			}

			//Check if the Frame has been setup Correctly.
			switch(gl.ctx.checkFramebufferStatus(gl.ctx.FRAMEBUFFER)){
				case gl.ctx.FRAMEBUFFER_COMPLETE: break;
				case gl.ctx.FRAMEBUFFER_INCOMPLETE_ATTACHMENT: console.log("FRAMEBUFFER_INCOMPLETE_ATTACHMENT"); break;
				case gl.ctx.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT: console.log("FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT"); break;
				case gl.ctx.FRAMEBUFFER_INCOMPLETE_DIMENSIONS: console.log("FRAMEBUFFER_INCOMPLETE_DIMENSIONS"); break;
				case gl.ctx.FRAMEBUFFER_UNSUPPORTED: console.log("FRAMEBUFFER_UNSUPPORTED"); break;
				case gl.ctx.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE: console.log("FRAMEBUFFER_INCOMPLETE_MULTISAMPLE"); break;
				case gl.ctx.RENDERBUFFER_SAMPLES: console.log("RENDERBUFFER_SAMPLES"); break;
			}
			
			//Cleanup
			gl.ctx.bindFramebuffer(gl.ctx.FRAMEBUFFER, null);
			gl.ctx.bindRenderbuffer(gl.ctx.RENDERBUFFER, null);
			gl.ctx.bindTexture(gl.ctx.TEXTURE_2D, null);

			//Return final struct
			return this.fbo;
		}

		cleanUp(){
			this.fbo = null;
			return this;
		}
	//endregion

	//-------------------------------------------------
	// COLOR BUFFERS
	//-------------------------------------------------
		texColorBuffer(name="bColor",cAttachNum=0, config=0){
			//Up to 16 texture attachments 0 to 15
			let buf = { id: gl.ctx.createTexture() };
			let c = Fbo[config];
			
			gl.ctx.bindTexture(gl.ctx.TEXTURE_2D, buf.id);

			switch(config){
				case Fbo.RGBA_UBYTE : 
					gl.ctx.texImage2D(gl.ctx.TEXTURE_2D, 0, gl.ctx.RGBA, this.fbo.frameWidth, this.fbo.frameHeight, 0, gl.ctx.RGBA, gl.ctx.UNSIGNED_BYTE, null);
					break;

				case Fbo.RGBA_F16 : 
					gl.ctx.texImage2D(gl.ctx.TEXTURE_2D, 0, gl.ctx.RGBA16F, this.fbo.frameWidth, this.fbo.frameHeight, 0, gl.ctx.RGBA, gl.ctx.FLOAT, null);
					break;

				case Fbo.RGBA_F32 : 
					gl.ctx.texImage2D(gl.ctx.TEXTURE_2D, 0, gl.ctx.RGBA32F, this.fbo.frameWidth, this.fbo.frameHeight, 0, gl.ctx.RGBA, gl.ctx.FLOAT, null);
					break;

				case Fbo.RGB_F16 : //TODO, Does not work, cant figure out why
					gl.ctx.texImage2D(gl.ctx.TEXTURE_2D, 0, gl.ctx.RGB16F, this.fbo.frameWidth, this.fbo.frameHeight, 0, gl.ctx.RGB, gl.ctx.FLOAT, null);
					break;
			}

			gl.ctx.texParameteri(gl.ctx.TEXTURE_2D, gl.ctx.TEXTURE_MAG_FILTER, gl.ctx.NEAREST);
			gl.ctx.texParameteri(gl.ctx.TEXTURE_2D, gl.ctx.TEXTURE_MIN_FILTER, gl.ctx.NEAREST);
			gl.ctx.texParameteri(gl.ctx.TEXTURE_2D, gl.ctx.TEXTURE_WRAP_S, gl.ctx.CLAMP_TO_EDGE);
			gl.ctx.texParameteri(gl.ctx.TEXTURE_2D, gl.ctx.TEXTURE_WRAP_T, gl.ctx.CLAMP_TO_EDGE);

			gl.ctx.framebufferTexture2D(gl.ctx.FRAMEBUFFER, gl.ctx.COLOR_ATTACHMENT0 + cAttachNum, gl.ctx.TEXTURE_2D, buf.id, 0);

			//Save Attachment to enable on finalize
			this.aryDrawBuf.push(gl.ctx.COLOR_ATTACHMENT0 + cAttachNum);
			this.fbo[name] = buf;
			return this;
		}

		multiSampleColorBuffer(name="bColor", cAttachNum=0, sampleSize=4){ //NOTE, Only sampleSize of 4 works, any other value crashes.
			var buf = { id: gl.ctx.createRenderbuffer() };

			gl.ctx.bindRenderbuffer(gl.ctx.RENDERBUFFER, buf.id); //Bind Buffer

			//Set Data Size
			gl.ctx.renderbufferStorageMultisample(gl.ctx.RENDERBUFFER, sampleSize, gl.ctx.RGBA8, this.fbo.frameWidth, this.fbo.frameHeight); 
			
			//Bind buf to color attachment
			gl.ctx.framebufferRenderbuffer(gl.ctx.FRAMEBUFFER, gl.ctx.COLOR_ATTACHMENT0 + cAttachNum, gl.ctx.RENDERBUFFER, buf.id);

			//Save Attachment to enable on finalize
			this.aryDrawBuf.push(gl.ctx.COLOR_ATTACHMENT0 + cAttachNum);
			this.fbo[name] = buf;
			return this;
		}
	//endregion


	//-------------------------------------------------
	// DEPTH BUFFERS
	//-------------------------------------------------
		depthBuffer(isMultiSample = false){
			this.fbo.bDepth = gl.ctx.createRenderbuffer();
			gl.ctx.bindRenderbuffer(gl.ctx.RENDERBUFFER, this.fbo.bDepth);
			
			//Regular render Buffer
			if(!isMultiSample){
				gl.ctx.renderbufferStorage(gl.ctx.RENDERBUFFER, gl.ctx.DEPTH_COMPONENT16,
					this.fbo.frameWidth, this.fbo.frameHeight);
			
			//Set render buffer to do multi samples
			}else{
				gl.ctx.renderbufferStorageMultisample(gl.ctx.RENDERBUFFER, 4,
					gl.ctx.DEPTH_COMPONENT16, 
					this.fbo.frameWidth, this.fbo.frameHeight ); //DEPTH_COMPONENT24
			}

			//Attach buffer to frame
			gl.ctx.framebufferRenderbuffer(gl.ctx.FRAMEBUFFER, gl.ctx.DEPTH_ATTACHMENT, gl.ctx.RENDERBUFFER, this.fbo.bDepth);
			return this;
		}

		texDepthBuffer(){
			//Up to 16 texture attachments 0 to 15
			var buf = { id:gl.ctx.createTexture() };
			
			gl.ctx.bindTexture(gl.ctx.TEXTURE_2D, buf.id);
			//ctx.pixelStorei(ctx.UNPACK_FLIP_Y_WEBGL, false);
			gl.ctx.texStorage2D(gl.ctx.TEXTURE_2D, 1, gl.ctx.DEPTH_COMPONENT16, this.fbo.frameWidth, this.fbo.frameHeight);
			gl.ctx.texParameteri(gl.ctx.TEXTURE_2D, gl.ctx.TEXTURE_MAG_FILTER, gl.ctx.NEAREST);
			gl.ctx.texParameteri(gl.ctx.TEXTURE_2D, gl.ctx.TEXTURE_MIN_FILTER, gl.ctx.NEAREST);
			gl.ctx.texParameteri(gl.ctx.TEXTURE_2D, gl.ctx.TEXTURE_WRAP_S, gl.ctx.CLAMP_TO_EDGE);
			gl.ctx.texParameteri(gl.ctx.TEXTURE_2D, gl.ctx.TEXTURE_WRAP_T, gl.ctx.CLAMP_TO_EDGE);
			

			gl.ctx.framebufferTexture2D(gl.ctx.FRAMEBUFFER, gl.ctx.DEPTH_ATTACHMENT, gl.ctx.TEXTURE_2D, buf.id, 0);

			this.fbo.bDepth = buf
			return this;
		}
	//endregion


	//-------------------------------------------------
	// STATIC FUNCTIONS
	//-------------------------------------------------
		static screenFBO(){ return { frameWidth:gl.width, frameHeight:gl.height, id:null }; }


		static readPixel(fbo,x,y,cAttachNum){
			var p = new Uint8Array(4);
			gl.ctx.bindFramebuffer(gl.ctx.READ_FRAMEBUFFER, fbo.id);
			gl.ctx.readBuffer(gl.ctx.COLOR_ATTACHMENT0 + cAttachNum);
			gl.ctx.readPixels(x, y, 1, 1, gl.ctx.RGBA, gl.ctx.UNSIGNED_BYTE, p);
			gl.ctx.bindFramebuffer(gl.ctx.READ_FRAMEBUFFER, null);
			return p;
		}

		static activate(fbo){ gl.ctx.bindFramebuffer(gl.ctx.FRAMEBUFFER,fbo.id); return this; }
		static deactivate(){ gl.ctx.bindFramebuffer(gl.ctx.FRAMEBUFFER,null); return this; }
		static clear(fbo, unbind = true){
			gl.ctx.bindFramebuffer(gl.ctx.FRAMEBUFFER,fbo.id);
			gl.ctx.clear(gl.ctx.COLOR_BUFFER_BIT | gl.ctx.DEPTH_BUFFER_BIT); 
			if(unbind) gl.ctx.bindFramebuffer(gl.ctx.FRAMEBUFFER,null);
		}


		static blit(fboRead, fboWrite){
			//bind the two Frame Buffers
			gl.ctx.bindFramebuffer(gl.ctx.READ_FRAMEBUFFER, fboRead.id);
			gl.ctx.bindFramebuffer(gl.ctx.DRAW_FRAMEBUFFER, fboWrite.id);

			//Clear Frame buffer being copied to.
			gl.ctx.clearBufferfv(gl.ctx.COLOR, 0, [0.0, 0.0, 0.0, 1.0]); 

			//Transfer Pixels from one FrameBuffer to the Next
			gl.ctx.blitFramebuffer(
				0, 0, fboRead.frameWidth, fboRead.frameHeight,
				0, 0, fboWrite.frameWidth, fboWrite.frameHeight,
				gl.ctx.COLOR_BUFFER_BIT, gl.ctx.NEAREST);

			//Unbind
			gl.ctx.bindFramebuffer(gl.ctx.READ_FRAMEBUFFER, null);
			gl.ctx.bindFramebuffer(gl.ctx.DRAW_FRAMEBUFFER, null);
		}

		static blitDepth(fboRead, fboWrite){
			//bind the two Frame Buffers
			gl.ctx.bindFramebuffer(gl.ctx.READ_FRAMEBUFFER, fboRead.id);
			gl.ctx.bindFramebuffer(gl.ctx.DRAW_FRAMEBUFFER, fboWrite.id);

			//Clear Frame buffer being copied to.
			gl.ctx.clearBufferfv(gl.ctx.DEPTH, 0, [0.0, 0.0, 0.0, 0.0]); 

			//Transfer Pixels from one FrameBuffer to the Next
			gl.ctx.blitFramebuffer(
				0, 0, fboRead.frameWidth, fboRead.frameHeight,
				0, 0, fboWrite.frameWidth, fboWrite.frameHeight,
				gl.ctx.DEPTH_BUFFER_BIT, gl.ctx.NEAREST);

			//Unbind
			gl.ctx.bindFramebuffer(gl.ctx.READ_FRAMEBUFFER, null);
			gl.ctx.bindFramebuffer(gl.ctx.DRAW_FRAMEBUFFER, null);
		}

		/* BLIT Depth Buffer
		glBindFramebuffer(GL_READ_FRAMEBUFFER, gBuffer);
		glBindFramebuffer(GL_DRAW_FRAMEBUFFER, 0); // write to default framebuffer
		glBlitFramebuffer(
		  0, 0, SCR_WIDTH, SCR_HEIGHT, 0, 0, SCR_WIDTH, SCR_HEIGHT, GL_DEPTH_BUFFER_BIT, GL_NEAREST
		);
		glBindFramebuffer(GL_FRAMEBUFFER, 0);
		*/

		static basicTextureFrameBuffer(){
			var oFbo = new Fbo();
			var fbo = oFbo.create()
				.texColorBuffer()
				.texDepthBuffer()
				.finalize();
			oFbo.cleanUp();
			return fbo;
		}
	//endregion

	/*


	static delete(fbo){
		//TODO, Delete using the Cache name, then remove it from cache.
		ctx.deleteRenderbuffer(fbo.depth);
		ctx.deleteTexture(fbo.texColor);
		ctx.deleteFramebuffer(fbo.ptr);
	}

	*/
}

Fbo.RGBA_UBYTE	= 0;
Fbo.RGBA_F16	= 1;
Fbo.RGBA_F32	= 2;
Fbo.RGB_F16		= 3;

export default Fbo;