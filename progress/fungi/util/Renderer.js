import gl,{ UNI_MODEL_MAT_NAME, UNI_NORM_MAT_NAME } from "../gl.js";

//------------------------------------------------------
//Render and Call back
//------------------------------------------------------
let render = function(ary){
	if(render.onPreRender != null) render.onPreRender(render);

	processList(ary,false);

	if(render.onPostRender != null) render.onPostRender(render);

	//...................................
	//Cleanup
	gl.ctx.bindVertexArray(null); //After all done rendering, unbind VAO
}

render.onItemRendered	= null;	//Event After an Item has been rendered
render.onPreRender		= null;	//Before Rendering starts
render.onPostRender		= null;	//After Rendering is complete


//------------------------------------------------------
//Private
//------------------------------------------------------
let CULLING_STATE			= true;		//Global state if the feature is enabled
let BLENDING_STATE			= false;	//Same---
let DEPTHTEST_STATE			= true;
let SAMPLE_ALPHA_COV_STATE	= false;
let material				= null;
let shader					= null;


//process an array of transforms in a recursive fashion. Also forces world matrix update on items if needed
function processList(ary,forceWorldUpdate = false){
	let isUpdated = false;
	for(var i=0; i < ary.length; i++){
		if(ary[i].visible == false) continue;
		isUpdated = ary[i].updateMatrix(forceWorldUpdate);
		
		//if this transform is a renderable, start drawing
		if(ary[i].draw != undefined){
			prepareNext(ary[i]).draw();
			if(render.onItemRendered != null) render.onItemRendered(ary[i]);
		}

		//If transform has any children, then process that list next.
		if(ary[i].children.length > 0) processList(ary[i].children, isUpdated || forceWorldUpdate);
	}
}


//Prepares the shader for the next item for rendering by dealing with the shader and gl features
function prepareNext(itm){
	//Check if the next materal to use is different from the last
	if(material !== itm.material){
		material = itm.material;

		//Multiple materials can share the same shader, if new shader, turn it on.
		if(material.shader !== shader) shader = material.shader.activate();

		//Turn on/off any gl features
		if(material.useBlending != BLENDING_STATE)
			gl.ctx[ ( (BLENDING_STATE = (!BLENDING_STATE)) )?"enable":"disable" ](gl.ctx.BLEND);
		
		if(material.useSampleAlphaCoverage != SAMPLE_ALPHA_COV_STATE)
			gl.ctx[ ( (SAMPLE_ALPHA_COV_STATE = (!SAMPLE_ALPHA_COV_STATE)) )?"enable":"disable" ](gl.ctx.SAMPLE_ALPHA_TO_COVERAGE);

		material.applyUniforms();
	}

	//Prepare Buffers and Uniforms.
	if(shader.useModelMatrix)	shader.setUniforms(UNI_MODEL_MAT_NAME,itm.worldMatrix);
	if(shader.useNormalMatrix)	shader.setUniforms(UNI_NORM_MAT_NAME,itm.normalMatrix);
	
	if(itm.useCulling != CULLING_STATE)		gl.ctx[ ( (CULLING_STATE	= (!CULLING_STATE))  )	?"enable":"disable"	](gl.ctx.CULL_FACE);
	if(itm.useDepthTest != DEPTHTEST_STATE)	gl.ctx[ ( (DEPTHTEST_STATE	= (!DEPTHTEST_STATE)) )	?"enable":"disable"	](gl.ctx.DEPTH_TEST);

	return itm;
}


//------------------------------------------------------
//Export
//------------------------------------------------------
render.prepareNext = prepareNext;

export default render;