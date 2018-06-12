import gl			from "../../fungi/gl.js";
import Fungi		from "../../fungi/Fungi.js";
import Fbo			from "../../fungi/Fbo.js";
import Mat4 		from "../../fungi/maths/Mat4.js";
import Shader 		from "../../fungi/Shader.js";

const m_VertShader = `#version 300 es
	layout (location = 0) in vec3 a_position;
	uniform mat4 u_lightProj;
	uniform mat4 u_modelMatrix;
	void main(){ gl_Position = u_lightProj * u_modelMatrix * vec4(a_position, 1.0); }`;

const m_FragShader = `#version 300 es
	void main(){ }`; //gl_FragDepth = gl_FragCoord.z;

/*
https://www.gamedev.net/forums/topic/505893-orthographic-projection-for-shadow-mapping/

https://learnopengl.com/Advanced-Lighting/Shadows/Shadow-Mapping

http://www.opengl-tutorial.org/intermediate-tutorials/tutorial-16-shadow-mapping

https://lwjglgamedev.gitbooks.io/3d-game-development-with-lwjgl/content/chapter18/chapter18.html

http://ogldev.atspace.co.uk/www/tutorial47/tutorial47.html

https://msdn.microsoft.com/en-us/library/windows/desktop/ee416324(v=vs.85).aspx

https://www.youtube.com/watch?v=o6zDfDkOFIc

https://www.youtube.com/watch?v=EsccgeUpdsM
https://www.youtube.com/watch?v=yn5UJzMqxj0
https://www.youtube.com/watch?v=LqIl--GgfDA
*/

/*TODO
- Send Blending to One-One
- DepthMask false		then back to true
- DepthFunc gl_equal  then back to GL_LESS
- Change Backface rendering.
*/

class ShadowMap{
	constructor(cam, size = 1024){
		this.shader	= this.createShader();
		this.camera = cam;

		//-----------------------------------------------------
		// Setup Framebuffer to create the shadow texture
		let oFbo = new Fbo();
		this.fbo = oFbo.create(size, size).texDepthBuffer().finalize();
		oFbo.cleanUp();
	}

	renderScene(){
		//Get List of items to render
		let i, items = Fungi.scene.renderItems || Fungi.scene.items;

		//-----------------------------------------------------
		//Resize Viewport and Bind Framebuffer
		Fungi.render
			.setViewPort( this.fbo.frameWidth, this.fbo.frameHeight )
			.setFrameBuffer( this.fbo.id )
			.clearDepth();

		//gl.blendMode( gl.BLEND_OVERRIDE );

		//-----------------------------------------------------
		//Get Shader Ready
		Fungi.render.clearMaterial().loadShader(this.shader);
		this.shader.setUniform("u_lightProj", this.camera.getProjectionViewMatrix());

		Fungi.render.loadOptions({ depthTest:true, blend:false });
		//Fungi.render.loadOptions({ cullFace:false }); //Render Both Front and Back Faces
		//gl.ctx.cullFace( gl.ctx.FRONT );

		//-----------------------------------------------------
		//Ignore items that are not visible, has no verts OR has a custom draw function
		for(i of items){
			if(!i.visible || i.vao.elmCount == 0 || i.draw) continue;

			//Send World matrix to shader
			i.updateMatrix();
			this.shader.setUniform(Shader.UNIFORM_MODELMAT, i.worldMatrix);

			//Draw Item
			Fungi.render.drawRenderable(i);
		}

		//-----------------------------------------------------
		//Reset Viewport back
		Fungi.render.setViewPort().setFrameBuffer();
		//gl.ctx.cullFace( gl.ctx.BACK );
		//Fungi.render.loadOptions({ cullFace:true });  //Render Only Front Faces
	}

	createShader(){
		return new Shader("shadowMap", m_VertShader, m_FragShader)
			.prepareUniform("u_lightProj", "mat4")
			.prepareUniform(Shader.UNIFORM_MODELMAT, "mat4")
			.unbind();
	}
}

export default ShadowMap;