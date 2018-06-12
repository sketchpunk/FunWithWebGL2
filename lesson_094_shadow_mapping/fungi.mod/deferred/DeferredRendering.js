import gl		from "../../fungi/gl.js";
import Fbo		from "../../fungi/Fbo.js";
import Fungi	from "../../fungi/Fungi.js";
import Quad		from "../../fungi/primitives/Quad.js";

//https://github.com/tiansijie/Tile_Based_WebGL_DeferredShader
//https://hacks.mozilla.org/2014/01/webgl-deferred-shading/
//https://github.com/tsherif/webgl2examples/blob/master/deferred.html

class DeferredRendering{
	constructor(matName = "PostBasic"){
		this.shadowMap = null;

		//......................................
		let oFbo = new Fbo();

		//Create a frame buffer with textures for each bit needed for Deferred Lighting
		this.fbo = oFbo.create()
			.texColorBuffer("bColor",		0,	Fbo.RGBA_UBYTE)
			.texColorBuffer("bPosition",	1, 	Fbo.RGBA_F16)
			.texColorBuffer("bNormal",		2, 	Fbo.RGBA_F16)
			.texColorBuffer("bEmission",	3,	Fbo.RGBA_UBYTE)
			.texDepthBuffer() //.bDepth
			.finalize();
		oFbo.cleanUp();

		//......................................
		//Setup a quad used to render scene.
		this.quad = Quad(matName, "FungiPostQuad");
		let mat = this.quad.material;

		//Save reference to textures to uniforms for the post shader	
		if(mat.shader.hasUniform("u_colorTex"))		mat.addUniform("u_colorTex",	"tex", this.fbo.bColor.id);
		if(mat.shader.hasUniform("u_positionTex"))	mat.addUniform("u_positionTex",	"tex", this.fbo.bPosition.id);
		if(mat.shader.hasUniform("u_normalTex"))	mat.addUniform("u_normalTex",	"tex", this.fbo.bNormal.id);
		if(mat.shader.hasUniform("u_emissionTex"))	mat.addUniform("u_emissionTex",	"tex", this.fbo.bEmission.id);
		if(mat.shader.hasUniform("u_depthTex"))		mat.addUniform("u_depthTex",	"tex", this.fbo.bDepth.id);
	}

	addShadowMap( m ){
		this.shadowMap = m;
		this.quad.material.addUniform("u_shadowTex", "tex", m.fbo.bDepth.id); //Apply Shadow
		this.quad.material.addUniform("u_lightProjMatrix", "mat4", m.camera.getProjectionViewMatrix()); //Need Light Space Projection View Matrix
		return this;
	}

	activate(){ gl.ctx.bindFramebuffer(gl.ctx.FRAMEBUFFER, this.fbo.id); }

	render(fbo = null){
		//TODO, May need to disable Depth Testing and Writing.

		//................................
		//Send Light Space Matrix which is needed to read the shadow map.
		if(this.shadowMap){
			this.quad.material.updateUniform("u_lightProjMatrix", this.shadowMap.camera.getProjectionViewMatrix());
		}

		//................................
		Fungi.render.setFrameBuffer(fbo);				// Set FrameBuffer to Render To
		Fungi.render.clearActiveFrame();				// Clear Frame Buffer
		Fungi.render.loadMaterial(this.quad.material);	// Load Material & Shader, Apply Uniform
		Fungi.render.drawRenderable(this.quad);			// Draw Quad with scene as a Texture.
	}
}

export default DeferredRendering;