import gl			from "/fungi/gl.js";
import Fbo			from "/fungi/Fbo.js";
import Fungi		from "/fungi/Fungi.js";
import Quad			from "/fungi/primitives/Quad.js";

class DeferredRendering{
	constructor(matName = "PostBasic", fbo = null){
		//......................................
		if(!fbo){
			let oFbo = new Fbo();

			//Create a Basic Frame buffer with a Color and Depth Texture
			this.fbo = oFbo.create()
				.texColorBuffer()
				.texDepthBuffer() //.bDepth
				.finalize();
			oFbo.cleanUp();
		}

		//......................................
		//Setup a quad used to render scene.
		this.quad = Quad(matName, "FungiPostQuad");
		let mat = this.quad.material;

		if(this.fbo.bColor && mat.shader.hasUniform("u_colorTex") )	mat.addUniform("u_colorTex", "tex", this.fbo.bColor.id);
		if(this.fbo.bDepth && mat.shader.hasUniform("u_depthTex") )	mat.addUniform("u_depthTex", "tex", this.fbo.bDepth.id);
	}

	activate(){ gl.ctx.bindFramebuffer(gl.ctx.FRAMEBUFFER, this.fbo.id); }

	render(){
		//TODO, May need to disable Depth Testing and Writing.
		Fungi.render
			.setFrameBuffer()					// Reset FrameBuffer to Display
			.clearActiveFrame()					// Clear Frame Buffer
			.loadMaterial(this.quad.material)	// Load Material & Shader, Apply Uniform
			.drawRenderable(this.quad);			// Draw Quad with scene as a Texture.
	}
}

export default DeferredRendering;