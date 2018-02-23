import gl,{ UNI_MODEL_MAT_NAME,UNI_NORM_MAT_NAME } from "../gl.js";
import Shader		from "../util/Shader.js";
import Renderable	from "../entities/Renderable.js";

//http://prideout.net/blog/?tag=opengl-transform-feedback
//https://github.com/WebGLSamples/WebGL2Samples/blob/master/samples/transform_feedback_interleaved.html

//##################################################################
// OBJECT TO HANDLE FEEDBACK, PLUS MERGE DATA INTO INTERLEAVED BUFFERS
//##################################################################

class TransformFeedback{
	constructor(){
		this.vaoDraw			= new Array(2);		// VAOs for drawing
		this.readFeedback		= new Array(2);		// VAOs : What to read in during Feedback
		this.writeFeedback		= new Array(2);		// TransformFeedback : Where to write during feedback.

		//this.vertexIndexBuffer 	= null;			// Index buffer when available for meshes
		this.vertexBuffer		= null;				// The Points or Mesh to Render
		this.vertexDef			= null;				// Definition for the Vertex Buffer
		this.vertexCnt			= 0;				// How many vertices in the mesh to draw

		this.staticBuffer 		= null;				// Data used in Feedback / Draw that will not change
		this.staticBufferDef	= null;				//
		
		this.dynamicBuffers		= new Array(2);		// Alternating Buffers for Feedback for writing
		this.dynamicBuffersDef	= null;				// Definition for the feedback buffer

		this.runIndex 			= 0;				// Keep track of the index for alternating buffers for each feedback
	}


	interleavedFloatArray(vertCnt,fbData,fbInfo){
		var bFloat	= Float32Array.BYTES_PER_ELEMENT,	// Short for float byte size
			dLen	= fbData.length,					// Data array Length (how many parts make up an element)
			iFinal	= 0,								// Length of final array
			stride	= 0,								// Size of single chunk of vertex data
			fi		= 0,								// Final Index
			i, j, k;									// Loop Vars

		//-----------------------------------
		// Calc some values that helps build a buffer on the gpu
		for(i=0; i < fbData.length; i++){
			iFinal		+= fbData[i].length;
			stride		+= fbInfo[i].compCount * bFloat;
			
			fbInfo[i].offset = (i != 0) ? 
				fbInfo[i-1].compCount * bFloat + fbInfo[i-1].offset
				: 0; //use previous offset val to continue this i
		}

		//-----------------------------------
		//Build the final array with all the vertex attributes grouped together
		var final = new Float32Array(iFinal);		// Create a final array to hold all the data.
		for(i=0; i < vertCnt; i++)					// Loop based on total vertex data that exists
			for(j=0; j < fbData.length; j++)		// loop per stride of data
				for(k=0; k < fbInfo[j].compCount; k++)	// loop per element to put into final
					final[ fi++ ] = fbData[j][ (i*fbInfo[j].compCount) + k ];

		//-----------------------------------		
		return {
			data	:final,
			def		:structInterleavedDef(dLen,stride,fbInfo)
		};
	}

	// Setup the vertex data for a point OR mesh that will instanced as a particle
	setupVertexBuffer(vertCount,vertData, vertInfo, vertIdx=null){
		var info = this.interleavedFloatArray(vertCount, vertData, vertInfo);

		//...........................................
		//Create buffer, save how its defined and push data to it
		this.vertexCnt		= vertCount;
		this.vertexDef		= info.def;
		this.vertexBuffer	= gl.ctx.createBuffer();

		gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, this.vertexBuffer );
		gl.ctx.bufferData(gl.ctx.ARRAY_BUFFER, info.data, gl.ctx.STATIC_DRAW);
		gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, null );
		return this;
	}

	setupTransformBuffer(vertCnt, fbData, fbInfo){
		//...........................................
		//Filter out the list of data into Read and Write. To use interleaved data, we need to seperate the data
		//into two different buffers for use, because when I created a single buffer, Writing does not take
		//stride into account of the data, so it overwritten read data in the process. So to fix this issue,
		//interleaved write data must exist in its own buffer so the writing can be done one complete element
		//at a time without messing up read data.
		var itm,
			dLen			= fbData.length,
			aryStatic		= [],
			aryStaticInfo	= [],
			aryDynamic		= [],
			aryDynamicInfo	= [];

		for(var i=0; i < dLen; i++){
			itm = fbInfo[i];

			if( (itm.usedIn & FeedbackUseMode.Write) != 0 ){
				aryDynamic.push( fbData[i] );
				aryDynamicInfo.push( fbInfo[i] );
			}else{ // if( (itm.usedIn & FeedbackUseMode.Read) != 0 || (itm.usedIn & FeedbackUseMode.Draw) != 0 ){
				aryStatic.push( fbData[i] );
				aryStaticInfo.push( fbInfo[i] );
			}
		}

		//...........................................
		//Create a buffer of data that will only be read in by feedback
		if(aryStatic.length > 0){
			var info = this.interleavedFloatArray(vertCnt, aryStatic, aryStaticInfo);

			this.staticBufferDef = info.def;
			gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, this.staticBuffer = gl.ctx.createBuffer() );
			gl.ctx.bufferData(gl.ctx.ARRAY_BUFFER, info.data, gl.ctx.STATIC_DRAW);
		}

		//...........................................
		//Create a buffer of data that will be read and written to by feedback
		if(aryDynamic.length > 0){
			var info = this.interleavedFloatArray(vertCnt, aryDynamic, aryDynamicInfo);
			this.dynamicBuffersDef = info.def;

			for(var i=0; i < 2; i++){				
				gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, this.dynamicBuffers[i] = gl.ctx.createBuffer() );
				gl.ctx.bufferData(gl.ctx.ARRAY_BUFFER, info.data, gl.ctx.DYNAMIC_COPY);
			}
		}

		gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, null );
		return this;
	}

	setupFeedback(){
		var itm;
		for(var i = 0; i < 2; i++){
			//...................................
			// Create & Bind VAO
			this.readFeedback[i] = gl.ctx.createVertexArray();
			gl.ctx.bindVertexArray(this.readFeedback[i]);
			
			//...................................
			//Bind Read Only
			if(this.staticBuffer != null){
				gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, this.staticBuffer); //Bind Buffer

				for(var j=0; j < this.staticBufferDef.partCount; j++){
					itm = this.staticBufferDef.parts[j];
					if( (itm.usedIn & FeedbackUseMode.Read) == 0) continue;

					gl.ctx.enableVertexAttribArray( itm.feedbackLoc );
					gl.ctx.vertexAttribPointer( itm.feedbackLoc, itm.compCount, gl.ctx.FLOAT, false, this.staticBufferDef.stride, itm.offset );
				}
			}

			//Bind Write
			if(this.dynamicBuffers != null){
				gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, this.dynamicBuffers[i]); //Bind Buffer

				for(var j=0; j < this.dynamicBuffersDef.partCount; j++){
					itm = this.dynamicBuffersDef.parts[j];
					if( (itm.usedIn & FeedbackUseMode.Write) == 0) continue;

					gl.ctx.enableVertexAttribArray( itm.feedbackLoc );
					gl.ctx.vertexAttribPointer( itm.feedbackLoc, itm.compCount, gl.ctx.FLOAT, false, this.dynamicBuffersDef.stride, itm.offset );
				}
			}

			//...................................
			//End Creating vao.
			gl.ctx.bindVertexArray(null);			
			gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, null);

			//...................................
			//Create & Bind TransformFeedback.
			this.writeFeedback[i] = gl.ctx.createTransformFeedback();			
			gl.ctx.bindTransformFeedback(gl.ctx.TRANSFORM_FEEDBACK, this.writeFeedback[i]);			//Bind Feedback
			gl.ctx.bindBufferBase(gl.ctx.TRANSFORM_FEEDBACK_BUFFER, 0, this.dynamicBuffers[i] );	//Bind buffer to feedback
			gl.ctx.bindTransformFeedback(gl.ctx.TRANSFORM_FEEDBACK, null);
		}
		return this;
	}

	// Setup alternating VAOs for rendering data. Both VAOs will link to the same
	// vertex buffers, but each one will link to A or B buffers used in feedback.
	// So every draw call, we alternate which draw VAO to execute.
	// Draw A -> Feedback A, Draw B -> Feedback B.
	setupDraw(){
		var itm;

		for(var i=0; i < 2; i++){
			//-----------------------------------
			//Create and Bind VAO
			gl.ctx.bindVertexArray( this.vaoDraw[i] = gl.ctx.createVertexArray() );

			//-----------------------------------
			//Setup Vertex Attributes
			
			//TODO Bind Index if Available.

			//Bind Vertex, UI, Normal, etc.
			gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, this.vertexBuffer); //Bind Buffer
			for(var j=0; j < this.vertexDef.partCount; j++){
				itm = this.vertexDef.parts[j];
				gl.ctx.enableVertexAttribArray( itm.drawLoc );
				gl.ctx.vertexAttribPointer( itm.drawLoc, itm.compCount, gl.ctx.FLOAT, false, this.vertexDef.stride, itm.offset );
			}

			//-----------------------------------
			//If static data exists, bind whats assigned for drawing and make it instanced data
			if(this.staticBufferDef != null){
				gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, this.staticBuffer);

				for(var j=0; j < this.staticBufferDef.partCount; j++){
					itm = this.staticBufferDef.parts[j];
					if( (itm.usedIn & FeedbackUseMode.Draw) == 0) continue;

					gl.ctx.enableVertexAttribArray( itm.drawLoc );
					gl.ctx.vertexAttribPointer( itm.drawLoc, itm.compCount, gl.ctx.FLOAT, false, this.staticBufferDef.stride, itm.offset );
					gl.ctx.vertexAttribDivisor( itm.drawLoc, 1 );	// Make Attribute Instanced
				}
			}

			//If dynamic data exists, bind whats assigned for drawing and make it instanced data
			if(this.dynamicBuffers != null){
				gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, this.dynamicBuffers[i]);

				for(var j=0; j < this.dynamicBuffersDef.partCount; j++){
					itm = this.dynamicBuffersDef.parts[j];
					if( (itm.usedIn & FeedbackUseMode.Draw) == 0) continue;

					gl.ctx.enableVertexAttribArray( itm.drawLoc );
					gl.ctx.vertexAttribPointer( itm.drawLoc, itm.compCount, gl.ctx.FLOAT, false, this.dynamicBuffersDef.stride, itm.offset );
					gl.ctx.vertexAttribDivisor( itm.drawLoc, 1 );	// Make Attribute Instanced
				}
			}

			//-----------------------------------
			//Clean up
			gl.ctx.bindVertexArray(null);			
			gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, null);
		}
		return this;
	}


	// First we bind the shader that handles the feedback, then execute it with fragment disabled.
	// With the alternating write buffer updated from the shader, then we render on screen the mesh
	// with new data from transform feedback shader.
	run(drawMode, shaderFeedback, shaderDraw, instanceCnt){
		//Determine what to Read and Write to during this draw call
		var nextIndex	= (this.runIndex + 1) % 2,
			vaoTFRead	= this.readFeedback[this.runIndex],
			vaoTFWrite	= this.writeFeedback[nextIndex];

		//-----------------------------------
		//Execute the Transform Feedback
		gl.ctx.useProgram(shaderFeedback);

		gl.ctx.bindVertexArray( vaoTFRead );									//Set Buffer to Read From
		gl.ctx.bindTransformFeedback(gl.ctx.TRANSFORM_FEEDBACK, vaoTFWrite );	//Set Buffer to Write To
		gl.ctx.enable(gl.ctx.RASTERIZER_DISCARD);								//Disable Fragment Program (only need vertex for this)

			gl.ctx.beginTransformFeedback(gl.ctx.POINTS);						//Begin Feedback Process
	        	gl.ctx.drawArrays(gl.ctx.POINTS, 0, instanceCnt);				//Execute Feedback Shader.
	        gl.ctx.endTransformFeedback();	

		gl.ctx.disable(gl.ctx.RASTERIZER_DISCARD);								//Enable Fragment Program so we can draw to framebuffer
		gl.ctx.bindTransformFeedback(gl.ctx.TRANSFORM_FEEDBACK, null);
		
		//-----------------------------------
		//Execute the Transform Feedback
		gl.ctx.useProgram(shaderDraw);
		gl.ctx.bindVertexArray( this.vaoDraw[ nextIndex ] );					//Set which VAO to draw from
		//gl.ctx.drawArrays(this.drawMode, 0, 1); //Drawing Instance
		gl.ctx.drawArraysInstanced(drawMode, 0, this.vertexCnt, instanceCnt); 	//Draw!!

		//-----------------------------------
		//Clean up
		this.runIndex = nextIndex; //Next frame use the other feedback and render vao
		return this;
	}
}


//##################################################################
// PARTICLE SYSTEM RENDERABLE
//##################################################################
class ParticleSystem extends Renderable{
	constructor(pCnt){
		super(null,null);
		this.particleCount		= pCnt;
		this.drawMode			= gl.ctx.POINTS;

		this.shaderDraw			= null;						// Shader used to render particles to the screen
		this.shaderFeedback		= null;						// Shader that will calculate values the draw shader needs
		
		this.transFeedback		= new TransformFeedback();

		this.modStack			= [];	//List of Modules currently in use (Maybe call it Modifiers??)

		this._attrCode_Feedback	= "";	//Attribute code for Feedback
		this._varyCode_Feedback	= "";	//Varyings ...
		this._mainCode_Feedback	= "";	//Code for Main Function
		
		this._attrCode_DrawVS	= "";	//Attribute code for Drawing Vertex Shader
		this._varyCode_DrawVS	= "";	//Varyings ...
		this._mainCode_DrawVS	= "";	//Code for the Main Function ...

		this._varyCode_DrawFS	= "";	//Varyings code for Drawing Fragment Shader
		this._mainCode_DrawFS	= "";	//Code for the Main Function ...

		this._locFeedback		= -1;	//Track the current Location for Attributes for Feedback Shader
		this._locDraw			= -1;	//Track the current location for Attribs in Drawing Shader
		this._fbShaderVarList	= [];	//List of OUT varyings needed for transform feedback shader before its linked.
	}

	//++++++++++++++++++++++++++++++++++++++++++++++
	// Methods
	//++++++++++++++++++++++++++++++++++++++++++++++
	//set mesh that will be used as a particle.
	setMesh(aryVert, aryUV=null, aryNorm=null, anyIdx=null){
		//Vertex Position
		this.addDraw("position", "vec3"); //Add Position to Draw Shader, Need to call before creating StructElementChunk
		var vertCount	= aryVert.length / 3,
			vData		= [ aryVert ],
			vInfo		= [ structElementChunk("position", 3, -1, this._locDraw, FeedbackUseMode.Draw) ];		

		//Vertex UV
		if(aryUV != null){
			this.addDraw("uv", "vec2"); //Add UV to Draw Shader
			vData.push( aryUV );
			vInfo.push( structElementChunk("uv", 2, -1, this._locDraw, FeedbackUseMode.Draw) );
		}

		//Vertex Normal
		if(aryNorm != null){
			this.addDraw("norm", "vec3"); //Add Normal to Draw Shader
			vData.push( aryNorm );
			vInfo.push( structElementChunk("uv", 3, -1, this._locDraw, FeedbackUseMode.Draw) );
		}

		//Save data as interleaved data into a gl buffer.
		this.transFeedback.setupVertexBuffer(vertCount, vData, vInfo);
		return this;
	}

	//Overrides Renderable.draw
	draw(){
		this.transFeedback.run(this.drawMode, 
			this.shaderFeedback.program, 
			this.shaderDraw.program, 
			this.particleCount );
		return this;
	}

	//++++++++++++++++++++++++++++++++++++++++++++++
	// Handle Modules Applied to Particle System
	//++++++++++++++++++++++++++++++++++++++++++++++

	//Add Module to the stack, these are particle options/settings
	addMod(modName, modParam = null){
		//TODO Look at actuve modes, if it exists, just update the params

		var mod = ParticleSystem.modules[modName];
		if( mod === undefined ){ console.log("module not found:",modName); return this; }

		this.modStack.push({ name:modName, mod:mod, params:modParam });
		return this;
	}

	//Get an mod on the stack.
	getMod(modName){
		for(var i=0; i < this.modStack.length; i++){
			if(this.modStack[i].name == modName) return this.modStack[i];
		}
		return null;
	}

	//Run all the modules on the stack, and use the results to build up
	//the transform feedback object and generate the shaders that'll do all the work.
	compile(){
		if(this.modStack.length == 0){ console.log("module stack is empty"); return this; }

		//................................................
		var fbData = new CompileData(),
			itm;

		for(var i=0; i < this.modStack.length; i++){
			itm = this.modStack[i];
			itm.mod.run( this, itm.params, fbData);
		}

		//................................................
		//Use all the data from 
		var vs_fb = vs_feedback_tmpl
			.replace("[[ATTRIBUTES]]"	,this._attrCode_Feedback)
			.replace("[[VARYINGS]]"		,this._varyCode_Feedback)
			.replace("[[MAINCODE]]"		,this._mainCode_Feedback);

		var vs_d = vs_draw_tmpl
			.replace("[[ATTRIBUTES]]"	,this._attrCode_DrawVS)
			.replace("[[VARYINGS]]"		,this._varyCode_DrawVS)
			.replace("[[MAINCODE]]"		,this._mainCode_DrawVS);

		var fs_d = fs_draw_tmpl
			.replace("[[VARYINGS]]"		,this._varyCode_DrawFS)
			.replace("[[MAINCODE]]"		,(this._mainCode_DrawFS != "")? this._mainCode_DrawFS : "FragColor = vec4(0.0,0.0,1.0,1.0);");


		console.log("FEEDBACK VERTEX SHADER============================\n",
			vs_fb,
			"\nDRAW VERTEX SHADER ===================================\n",
			vs_d,
			"\nDRAW FRAGMENT SHADER ===================================\n",
			fs_d);

		//................................................
		//Compile shader for transform feedback.
		this.shaderFeedback = Shader.create("fb",
					vs_fb, fs_feedback_tmpl,
					(this._fbShaderVarList.length > 0)? this._fbShaderVarList : null, 
					true //IsInterleaved
			).prepareUniformBlocks(gl.UBOTransform, 0);
		
		//................................................
		//Compile and setup shader needed to draw/render to the screen
		this.shaderDraw = Shader.create( "ps", vs_d, fs_d )
			.prepareUniforms( [UNI_MODEL_MAT_NAME,"mat4"] )
			.prepareUniformBlocks(gl.UBOTransform,0);

		//Fungi render needs a material setup, so set up a basic one tied to the render shader
		this.material			= new Shader.Material();
		this.material.shader	= this.shaderDraw;

		//................................................
		//Pass data to transform feedback to get things ready for rendering
		this.transFeedback
			.setupTransformBuffer(this.particleCount, fbData.data, fbData.info)
			.setupFeedback()
			.setupDraw();
	}

	//++++++++++++++++++++++++++++++++++++++++++++++
	// Build up code used in the shaders
	//++++++++++++++++++++++++++++++++++++++++++++++

	//How to handle Attributes set as READ
	addFeedbackRead(name, type, fbMainCode = null, dMainCode = null){
		var fLoc = ++this._locFeedback;

		this._attrCode_Feedback	+= `\n\rlayout(location=${fLoc}) in ${type} a_${name};`;
		if(fbMainCode != null)	this._mainCode_Feedback	+= "\n\r" + fbMainCode;
		if(dMainCode != null)	this._mainCode_DrawVS	+= "\n\r" + dMainCode;
	}

	//How to handle Attributes set as WRITE
	addFeedbackWrite(name, type, fbMainCode = null, dMainCode = null){
		var fLoc = ++this._locFeedback,
			dLoc = ++this._locDraw;

		this._fbShaderVarList.push(`v_${name}`);

		this._attrCode_Feedback	+= `\n\rlayout(location=${fLoc}) in ${type} a_${name};`;
		this._attrCode_DrawVS	+= `\n\rlayout(location=${dLoc}) in ${type} a_${name};`;
		this._varyCode_Feedback	+= `\n\rout ${type} v_${name};`;

		if(fbMainCode != null)	this._mainCode_Feedback	+= "\n\r" + fbMainCode;
		if(dMainCode != null)	this._mainCode_DrawVS	+= "\n\r" + dMainCode;
	}

	//How to handle Attributes set as DRAW
	addDraw(name, type, vsMainCode=null, fsMainCode=null, toFrag=false){
		var dLoc = ++this._locDraw;
		this._attrCode_DrawVS += `\n\rlayout(location=${dLoc}) in ${type} a_${name};`;

		//Does this attribute need to be passed to fragment shader
		if(toFrag){
			this._varyCode_DrawVS += `\n\r out ${type} v_${name};`;
			this._mainCode_DrawVS += `\n\r v_${name} = a_${name};`;
			this._varyCode_DrawFS += `\n\r in ${type} v_${name};`;
		}

		if(vsMainCode != null) this._mainCode_DrawVS += vsMainCode;
		if(fsMainCode != null) this._mainCode_DrawFS += fsMainCode;
	}
}


//TODO Think of a better way to do modules if possible.
ParticleSystem.modules = {};


//========================================================
ParticleSystem.modules.Position = class{
	static run(psys, params, fbData){ console.log("mod position run");
		var mPos = ParticleSystem.modules.Position;

		if(params == null){ console.log("Position Module needs params"); return false; }
		if(params.placement == undefined){ console.log("Position Module needs params.placement"); return false; }

		psys.addFeedbackWrite(mPos.varName,"vec3", mPos.mainCodeFeedback, mPos.mainCodeDraw);

		fbData.add("Position",
			mPos.placement[ params.placement ]( psys, params, fbData ),
			structElementChunk(mPos.varName, 3, psys._locFeedback, psys._locDraw, FeedbackUseMode.WriteDraw)
		);

		return true;
	}
}

ParticleSystem.modules.Position.varName = "particlePos";
ParticleSystem.modules.Position.mainCodeFeedback = "v_particlePos = a_particlePos;";
ParticleSystem.modules.Position.mainCodeDraw = "localPos += a_particlePos;";
ParticleSystem.modules.Position.placement = {
	//...........................................
	circleSegment : function(psys, params){
		var aLen	= psys.particleCount * 3, //Three floats per particle (x,y,z)
			ary		= new Array(aLen),
			radInc	= Math.PI * 2 / psys.particleCount,
			radius 	= params.radius || 1;

		var ii,rad;
		for(var i=0; i < psys.particleCount; i++){
			rad	= i * radInc;
			ii	= i * 3;
			ary[ii]		= radius * Math.cos(rad);
			ary[ii+1]	= 0;
			ary[ii+2]	= radius * Math.sin(rad);
		}

		return ary;
	},
	//...........................................
	test : function(psys, params){
		var aLen	= psys.particleCount * 3, //Three floats per particle (x,y,z)
			ary		= new Array(aLen),
			v		= 1 / 3 * 0.4;

		//For test data just move the vertices on the x axis
		for(var i=0; i < aLen; i += 3){
			ary[i] = i * v;
			ary[i+1] = ary[i+2] = 0;
		}

		return ary;
	}
}

//========================================================
ParticleSystem.modules.Velocity = class{
	static run(psys, params, fbData, fbInfo){ console.log("Velocity run");
		var mPos = ParticleSystem.modules.Velocity;

		psys.addFeedbackRead(mPos.varName,"vec3",mPos.mainCodeFeedback,mPos.mainCodeDraw);

		fbData.add("Velocity",
			mPos.placement[ params.placement ]( psys, params, fbData ),
			structElementChunk(mPos.varName, 3, psys._locFeedback, -1, FeedbackUseMode.Read)
		);

		return true;
	}
}

ParticleSystem.modules.Velocity.varName = "particleVelocity";
ParticleSystem.modules.Velocity.mainCodeFeedback = "v_particlePos += a_particleVelocity;";
ParticleSystem.modules.Velocity.placement = {
	//...........................................
	test : function(psys, params){
		var aLen	= psys.particleCount * 3, //Three floats per particle (x,y,z)
			ary		= new Array(aLen),
			v		= 1 / 3 * (params.speed || 0.001);

		//For test data just move the vertices on the x axis
		for(var i=0; i < aLen; i += 3){
			ary[i+1] = (i+3) * v;
			ary[i] = ary[i+2] = 0;
		}

		return ary;
	},
	//...........................................
	normalizePos : function(psys, params, fbData){
		var aLen	= psys.particleCount * 3, //Three floats per particle (x,y,z)
			ary		= new Array(aLen),
			pos 	= fbData.getData("Position"),
			t 		= 0,
			speed 	= params.speed || 0.01;

		for(var i=0; i < aLen; i += 3){
			t = 1 / ( pos[i] * pos[i] + pos[i+1] * pos[i+1] + pos[i+2] * pos[i+2] ) * speed;
 
			ary[i]		= pos[i] * t;
			ary[i+1]	= pos[i+1] * t;
			ary[i+2]	= pos[i+2] * t;
		}

		return ary;
	},
}

//========================================================
ParticleSystem.modules.Color = class{
	static run(psys, params, fbData, fbInfo){ console.log("Color run");
		var mPos = ParticleSystem.modules.Color;

		psys.addDraw(mPos.varName, "vec3", null, mPos.mainCodeDrawFrag, true);

		fbData.add("Color",
			mPos.placement[ params.placement ]( psys, params, fbData ),
			structElementChunk(mPos.varName, 3, -1, psys._locDraw, FeedbackUseMode.Draw)
		);

		return true;
	}
}

ParticleSystem.modules.Color.varName = "particleColor";
ParticleSystem.modules.Color.mainCodeDrawFrag = "FragColor = vec4(v_particleColor,1.0);";
ParticleSystem.modules.Color.placement = {
	//...........................................
	test : function(psys, params){
		var aLen	= psys.particleCount * 3, //Three floats per particle (x,y,z)
			ary		= new Array(aLen);

		//For test data just move the vertices on the x axis
		var ii,j;
		for(var i=0; i < psys.particleCount; i++){
			ii = i * 3;
			j = i % 3;
			ary[ii]		= (j == 0)? 1:0;
			ary[ii+1]	= (j == 1)? 1:0;
			ary[ii+2]	= (j == 2)? 1:0;
		}

		console.log(ary);
		return ary;
	},
}


//========================================================
/*
	var fbData = [ p_curPosition, p_velocity, p_color ];
	var fbInfo = [
		structElementChunk("curPosition", 3, 1, 1, FeedbackUseMode.WriteDraw),
		structElementChunk("velocity", 3, 0, -1, FeedbackUseMode.Read),
		structElementChunk("color", 3, -1, 2, FeedbackUseMode.Draw),
	];
*/

//Only way I can think of keeping all the data together as a package that can
//be passed to all modules and even have the data recalled since some modules will
//used data from other modules.
class CompileData{
	constructor(){
		this.info = [];
		this.data = [];
		this.name = [];
	}

	add(name,data,info){
		this.name.push(name);
		this.info.push(info);
		this.data.push(data);
	}

	getData(name){
		for(var i=0; i < this.name.length; i++){
			if(this.name[i] == name) return this.data[i];
		}
		return null;
	}
}


//##################################################################
// PRIVATE FUNCTIONS AND STRUCTS
//##################################################################

//Helps define how/where each array of data will be used in the feedback.
const FeedbackUseMode = { Read:1, Write:2, Draw:4, All:7, ReadDraw:5, WriteDraw:6 };

//Create structure that contains information on how a Interleaved Buffer is Defined.
function structInterleavedDef(partCnt, stride, parts){
	return {
		stride			: stride,		// How many bytes makes up one element
		partCount		: partCnt,		// How many chunks of data exist in one element
		parts 			: parts
	};
}

function structElementChunk(name=null, compCnt=0, fbLoc=-1, drawLoc=-1, usedIn=0){
	return { 	
		name		: name,
		compCount	: compCnt,
		feedbackLoc	: fbLoc,
		drawLoc		: drawLoc,
		usedIn 		: usedIn,
		offset 		: 0
	};
}


/*
//Combiles and interleaves a collection of arrays, then calc stride, offsets of the data for applying to buffers.
function interleavedFloatArray(vertCnt,aryData,aryCompLen){
	var bFloat	= Float32Array.BYTES_PER_ELEMENT,	// Short for float byte size
		dLen	= aryData.length,					// Data array Length
		offsets	= new Array(dLen),					// Offset for each array in bytes
		iFinal	= 0,								// Length of final array
		stride	= 0,								// Size of single chunk of vertex data
		fi		= 0,								// Final Index
		i, j, k;									// Loop Vars

	//-----------------------------------
	// Calc some values that helps build a buffer on the gpu
	for(i=0; i < aryData.length; i++){
		iFinal		+= aryData[i].length;
		stride		+= aryCompLen[i] * bFloat;
		offsets[i]	= (i != 0)? aryCompLen[i-1] * bFloat + offsets[i-1]: 0; //use previous offset val to continue this i
	}

	//-----------------------------------
	//Build the final array with all the vertex attributes grouped together
	var final = new Float32Array(iFinal);		// Create a final array to hold all the data.
	for(i=0; i < vertCnt; i++)					// Loop based on total vertex data that exists
		for(j=0; j < aryData.length; j++)		// loop per stride of data
			for(k=0; k < aryCompLen[j]; k++)	// loop per element to put into final
				final[ fi++ ] = aryData[j][ (i*aryCompLen[j]) + k ];

	//-----------------------------------
	return {
		data	:final,
		def		:structInterleavedDef(dLen,stride,offsets,aryCompLen)
	};
}

//Interleaves an existing buffer
function interleavedFloatBuffer(buf,dat,attrLoc,isInstanced=false){
	gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER,buf); //Bind Buffer

	// Define how to read the data in the buffer.
	var aLoc;
	for(var i=0; i < dat.elementCount; i++){
		aLoc = attrLoc + i;
		gl.ctx.enableVertexAttribArray( aLoc );
		gl.ctx.vertexAttribPointer( aLoc, dat.compCounts[i], gl.ctx.FLOAT, false, dat.stride, dat.offsets[i] );
		if(isInstanced) gl.ctx.vertexAttribDivisor( aLoc, 1 );
	}

	return buf;
}

//Creates a new buffer then applies interleaved information

function createInterleavedFloatBuffer(dat,attrLoc,isInstanced=false){
	// Create GL Buffer
	var buf = gl.ctx.createBuffer();
	gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER,buf);
	gl.ctx.bufferData(gl.ctx.ARRAY_BUFFER, dat.ary, gl.ctx.STATIC_DRAW); //gl.ctx.DYNAMIC_DRAW

	// Define how to read the data in the buffer.
	var aLoc;
	for(var i=0; i < dat.elementCount; i++){
		aLoc = attrLoc + i;
		gl.ctx.enableVertexAttribArray( aLoc );
		gl.ctx.vertexAttribPointer( aLoc, dat.compCounts[i], gl.ctx.FLOAT, false, dat.stride, dat.offsets[i] );
		if(isInstanced) gl.ctx.vertexAttribDivisor( aLoc, 1 );
	}
	
	return buf;
}
*/

//##################################################################
// SHADER TEMPLATES
//##################################################################

const vs_draw_tmpl = `#version 300 es
	[[ATTRIBUTES]]

	uniform UBOTransform{
		mat4 matProjection;
		mat4 matCameraView;
		vec3 posCamera;
		float fTime;
	};

	uniform mat4 uModalMatrix;

	[[VARYINGS]]

	void main(void){
		vec3 localPos = a_position;
		
		[[MAINCODE]]

		gl_PointSize = 8.0; //a_size + 2.0;
		gl_Position	= matProjection * matCameraView * uModalMatrix * vec4(localPos,1.0);
	}`;

const fs_draw_tmpl = `#version 300 es
	precision mediump float;
	
	[[VARYINGS]]

	out vec4 FragColor;
	void main(void){
		[[MAINCODE]]
	}`;

const vs_feedback_tmpl = `#version 300 es
	[[ATTRIBUTES]]

	[[VARYINGS]]

	uniform UBOTransform{
		mat4 matProjection;
		mat4 matCameraView;
		vec3 posCamera;
		float fTime;
	};

	void main(void){
		[[MAINCODE]]
	}`;

const fs_feedback_tmpl = `#version 300 es
	precision mediump float; out vec4 outColor; 
	void main(void){ outColor = vec4(1.0); }`;


//##################################################################
export { TransformFeedback, ParticleSystem, FeedbackUseMode }