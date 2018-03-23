var ctx = null;

const ATTR_POSITION_LOC = 0;
const ATTR_NORM_LOC = 1;
const ATTR_UV_LOC = 2;
const UBO_TRANSFORM = "UBOTransform";
const UNI_MODEL_MAT_NAME = "uModalMatrix";
const UNI_NORM_MAT_NAME = "uNormalMatrix";



function init(canvas,bgColor,wp,hp){
	//........................................
	//Get Context
	if(typeof canvas == "string") canvas = document.getElementById(canvas);

	ctx = canvas.getContext("webgl2");
	if(!ctx){ console.error("WebGL context is not available."); return; }

	this.ctx = ctx;

	//........................................
	//Setup some defaults
	ctx.cullFace(ctx.BACK);								//Back is also default
	ctx.frontFace(ctx.CCW);								//Dont really need to set it, its ccw by default.
	ctx.enable(ctx.DEPTH_TEST);							//Shouldn't use this, use something else to add depth detection
	ctx.enable(ctx.CULL_FACE);							//Cull back face, so only show triangles that are created clockwise
	ctx.depthFunc(ctx.LEQUAL);							//Near things obscure far things
	ctx.blendFunc(ctx.SRC_ALPHA, ctx.ONE_MINUS_SRC_ALPHA);	//Setup default alpha blending
	//ctx.blendFunc(ctx.SRC_ALPHA, ctx.ONE_MINUS_SRC_ALPHA, ctx.ONE, ctx.ONE_MINUS_SRC_ALPHA);
	//ctx.blendFunc(ctx.ONE,ctx.ONE);
	
	fitScreen(wp || 1,hp || 1);							//Set the size of the canvas to a percent of the screen
	setClearColor(bgColor || "#ffffff");				//Set clear color
	clear();											//Clear the canvas

	//........................................
	//Globally Used Objects
	this.UBOTransform = createUBO(UBO_TRANSFORM,0,[ 
		{name:"matProjection",type:"mat4"}, 
		{name:"matCameraView",type:"mat4"}, 
		{name:"posCamera",type:"vec3"},
		{name:"fTime",type:"f"},
		{name:"screenRes",type:"vec2"}
	]);

	return this;
}

/*
const BLEND_ALPHA = 0;
function blendMode(m){
	switch(m){
		case BLEND_ALPHA: 			ctx.blendFunc(ctx.SRC_ALPHA, ctx.ONE_MINUS_SRC_ALPHA); break;
		case BLEND_ADDITIVE: 		ctx.blendFunc(ctx.ONE,ctx.ONE); break;
		case BLEND_ALPHA_ADDITIVE:	ctx.blendFunc(ctx.SRC_ALPHA,ctx.ONE); break;
	}
}
*/

//------------------------------------------------------
//State
//------------------------------------------------------
function clear(){ ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT); return this; };


//------------------------------------------------------
//Buffers
//------------------------------------------------------
//Create and fill our Array buffer.
function createArrayBuffer(floatAry,isStatic = true,isUnbind = true){
	var buf = ctx.createBuffer();
	ctx.bindBuffer(ctx.ARRAY_BUFFER,buf);
	ctx.bufferData(ctx.ARRAY_BUFFER, floatAry, (isStatic)? ctx.STATIC_DRAW : ctx.DYNAMIC_DRAW);

	if(isUnbind) ctx.bindBuffer(ctx.ARRAY_BUFFER,null);
	return buf;
};


//------------------------------------------------------
//Setters - Getters
//------------------------------------------------------
//Set the size of the canvas to fill a % of the total screen.
function fitScreen(wp,hp){ setSize(window.innerWidth * (wp || 1),window.innerHeight * (hp || 1)); return this; }

//Set the size of the canvas html element and the rendering view port
function setSize(w,h){

	//set the size of the canvas, on chrome we need to set it 3 ways to make it work perfectly.
	ctx.canvas.style.width = w + "px";
	ctx.canvas.style.height = h + "px";
	ctx.canvas.width = w;
	ctx.canvas.height = h;

	//when updating the canvas size, must reset the viewport of the canvas 
	//else the resolution webgl renders at will not change
	ctx.viewport(0,0,w,h);
	mod.width = w;	//Need to save Width and Height to resize viewport for WebVR
	mod.height = h;

	return this;
}

function setClearColor(hex){
	var a = (hex.length > 6)? rgbaArray(hex) : rgbArray(hex);
	ctx.clearColor(a[0],a[1],a[2],1.0);
	return this;
}


//------------------------------------------------------
//Misc
//------------------------------------------------------
function rgbArray(){
	if(arguments.length == 0) return null;
	var ary = (Array.isArray(arguments[0]))? arguments[0] : arguments;
	var rtn = [];

	for(var i=0,c,p; i < ary.length; i++){
		if(ary[i].length < 6) continue;
		c = ary[i];				//Just an alias(copy really) of the color text, make code smaller.
		p = (c[0] == "#")?1:0;	//Determine starting position in char array to start pulling from

		rtn.push(
			parseInt(c[p]	+c[p+1],16)	/ 255.0,
			parseInt(c[p+2]	+c[p+3],16)	/ 255.0,
			parseInt(c[p+4]	+c[p+5],16)	/ 255.0
		);
	}
	return rtn;
}

function rgbaArray(){
	if(arguments.length == 0) return null;
	var ary = (Array.isArray(arguments[0]))? arguments[0] : arguments;
	var rtn = [];

	for(var i=0,c,p; i < ary.length; i++){
		if(ary[i].length < 8) continue;
		c = ary[i];				//Just an alias(copy really) of the color text, make code smaller.
		p = (c[0] == "#")?1:0;	//Determine starting position in char array to start pulling from

		rtn.push(
			parseInt(c[p]	+c[p+1],16)	/ 255.0,
			parseInt(c[p+2]	+c[p+3],16)	/ 255.0,
			parseInt(c[p+4]	+c[p+5],16)	/ 255.0,
			parseInt(c[p+6]	+c[p+7],16)	/ 255.0
		);
	}
	return rtn;
}


//------------------------------------------------------
//Shaders
//------------------------------------------------------
function createProgramFromText(vShaderTxt, fShaderTxt, doValidate, transFeedbackVars = null, transFeedbackInterleaved = true){
	var vShader		= createShader(vShaderTxt,ctx.VERTEX_SHADER);	if(!vShader)	return null;
	var fShader		= createShader(fShaderTxt,ctx.FRAGMENT_SHADER);	if(!fShader){	ctx.deleteShader(vShader); return null; }			
	return createProgram(vShader, fShader, true, transFeedbackVars, transFeedbackInterleaved);
}

//Create a shader by passing in its code and what type
function createShader(src,type){
	var shader = ctx.createShader(type);
	ctx.shaderSource(shader,src);
	ctx.compileShader(shader);

	//Get Error data if shader failed compiling
	if(!ctx.getShaderParameter(shader, ctx.COMPILE_STATUS)){
		console.error("Error compiling shader : " + src, ctx.getShaderInfoLog(shader));
		ctx.deleteShader(shader);
		return null;
	}

	return shader;
}

//Link two compiled shaders to create a program for rendering.
function createProgram(vShader, fShader, doValidate, transFeedbackVars = null, feedbackInterleaved = true){
	//Link shaders together
	var prog = ctx.createProgram();
	ctx.attachShader(prog,vShader);
	ctx.attachShader(prog,fShader);

	//Force predefined locations for specific attributes. If the attibute isn't used in the shader its location will default to -1
	//ctx.bindAttribLocation(prog,ATTR_POSITION_LOC,ATTR_POSITION_NAME);
	//ctx.bindAttribLocation(prog,ATTR_NORMAL_LOC,ATTR_NORMAL_NAME);
	//ctx.bindAttribLocation(prog,ATTR_UV_LOC,ATTR_UV_NAME);

	//Need to setup Transform Feedback Varying Vars before linking the program.
	if(transFeedbackVars != null){
		ctx.transformFeedbackVaryings(prog, transFeedbackVars,
			((feedbackInterleaved)? ctx.INTERLEAVED_ATTRIBS : ctx.SEPARATE_ATTRIBS)
		);
	}

	ctx.linkProgram(prog);

	//Check if successful
	if(!ctx.getProgramParameter(prog, ctx.LINK_STATUS)){
		console.error("Error creating shader program.",ctx.getProgramInfoLog(prog));
		ctx.deleteProgram(prog); return null;
	}

	//Only do this for additional debugging.
	if(doValidate){
		ctx.validateProgram(prog);
		if(!ctx.getProgramParameter(prog,ctx.VALIDATE_STATUS)){
			console.error("Error validating program", ctx.getProgramInfoLog(prog));
			ctx.deleteProgram(prog); return null;
		}
	}
	
	//Can delete the shaders since the program has been made.
	ctx.detachShader(prog,vShader); //TODO, detaching might cause issues on some browsers, Might only need to delete.
	ctx.detachShader(prog,fShader);
	ctx.deleteShader(fShader);
	ctx.deleteShader(vShader);

	return prog;
}


//------------------------------------------------------
//Textures
//------------------------------------------------------

//Textures
function loadTexture(name,img,doYFlip,useMips){ 
	var tex = mod.res.textures[name] = ctx.createTexture();  
	return updateTexture(name,img,doYFlip,useMips);
}
function updateTexture(name,img,doYFlip,useMips){ //can be used to pass video frames to gpu texture.
	var tex = mod.res.textures[name];	

	if(doYFlip == true) ctx.pixelStorei(ctx.UNPACK_FLIP_Y_WEBGL, true);	//Flip the texture by the Y Position, So 0,0 is bottom left corner.

	ctx.bindTexture(ctx.TEXTURE_2D, tex); //bind texture so we can start configuring it.
	ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, ctx.RGBA, ctx.UNSIGNED_BYTE, img);	//Push image to GPU.
	
	if(useMips == true){
		ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.LINEAR);					//Setup up scaling
		ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR_MIPMAP_NEAREST);	//Setup down scaling
		ctx.generateMipmap(ctx.TEXTURE_2D);	//Precalc different sizes of texture for better quality rendering.
	}else{
		//ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER,	ctx.NEAREST);
		//ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER,	ctx.NEAREST);
		ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER,	ctx.LINEAR);
		ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER,	ctx.LINEAR);
		//ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S,		ctx.CLAMP_TO_EDGE);
		//ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T,		ctx.CLAMP_TO_EDGE);
		ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S,		ctx.REPEAT); //TODO make this configurable on load.
		ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T,		ctx.REPEAT);
	}

	ctx.bindTexture(ctx.TEXTURE_2D,null); //Unbind
	
	if(doYFlip == true) ctx.pixelStorei(ctx.UNPACK_FLIP_Y_WEBGL, false);	//Stop flipping textures
	return tex;	
}
/*
//imgAry must be 6 elements long and images placed in the right order
//RIGHT,LEFT,TOP,BOTTOM,BACK,FRONT
ctx.fLoadCubeMap = function(name,imgAry){
	if(imgAry.length != 6) return null;

	//Cube Constants values increment, so easy to start with right and just add 1 in a loop
	//To make the code easier costs by making the imgAry coming into the function to have
	//the images sorted in the same way the constants are set.
	//	TEXTURE_CUBE_MAP_POSITIVE_X - Right	:: TEXTURE_CUBE_MAP_NEGATIVE_X - Left
	//	TEXTURE_CUBE_MAP_POSITIVE_Y - Top 	:: TEXTURE_CUBE_MAP_NEGATIVE_Y - Bottom
	//	TEXTURE_CUBE_MAP_POSITIVE_Z - Back	:: TEXTURE_CUBE_MAP_NEGATIVE_Z - Front

	var tex = this.createTexture();
	this.bindTexture(this.TEXTURE_CUBE_MAP,tex);

	//push image to specific spot in the cube map.
	for(var i=0; i < 6; i++){
		this.texImage2D(this.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, this.RGBA, this.RGBA, this.UNSIGNED_BYTE, imgAry[i]);
	}

	this.texParameteri(this.TEXTURE_CUBE_MAP, this.TEXTURE_MAG_FILTER, this.LINEAR);	//Setup up scaling
	this.texParameteri(this.TEXTURE_CUBE_MAP, this.TEXTURE_MIN_FILTER, this.LINEAR);	//Setup down scaling
	this.texParameteri(this.TEXTURE_CUBE_MAP, this.TEXTURE_WRAP_S, this.CLAMP_TO_EDGE);	//Stretch image to X position
	this.texParameteri(this.TEXTURE_CUBE_MAP, this.TEXTURE_WRAP_T, this.CLAMP_TO_EDGE);	//Stretch image to Y position
	this.texParameteri(this.TEXTURE_CUBE_MAP, this.TEXTURE_WRAP_R, this.CLAMP_TO_EDGE);	//Stretch image to Z position
	//this.generateMipmap(this.TEXTURE_CUBE_MAP);

	this.bindTexture(this.TEXTURE_CUBE_MAP,null);
	Fungi.Res.Textures[name] = tex;
	return tex;
};
*/


//------------------------------------------------------
//Classes
//------------------------------------------------------
//Uniform Buffer Object
function createUBO(blockName,blockPoint,ary){
	var bufSize = UBO.calculate(ary);
	mod.res.ubo[blockName] = new UBO(blockName,blockPoint,bufSize,ary);
	//UBO.debugVisualize(Fungi.Res.Ubo[blockName]);
	return mod.res.ubo[blockName];
}

class UBO{
	constructor(blockName,blockPoint,bufSize,aryCalc){
		//Build name indexed array of Buffer Components for quick access when updating.
		this.items = [];	//Key Indexed array of structs that define each component
		this.keys = [];		//The order is important for the struct, keep the order of the uniform names with this array.
		
		for(var i=0; i < aryCalc.length; i++){
			this.items[aryCalc[i].name]	= {offset: aryCalc[i].offset,dataLen: aryCalc[i].dataLen,chunkLen:aryCalc[i].chunkLen};
			this.keys[i]				= aryCalc[i].name;
		}
		
		//Save some extra bits of data
		this.blockName = blockName;
		this.blockPoint = blockPoint;

		//Create Buffer to store the struct data.
		this.buf = ctx.createBuffer();									//Create Standard Buffer
		ctx.bindBuffer(ctx.UNIFORM_BUFFER,this.buf);						//Bind it for work
		ctx.bufferData(ctx.UNIFORM_BUFFER,bufSize,ctx.DYNAMIC_DRAW);		//Allocate Space needed
		ctx.bindBuffer(ctx.UNIFORM_BUFFER,null);							//Unbind
		ctx.bindBufferBase(ctx.UNIFORM_BUFFER, blockPoint, this.buf);		//Assign to Block Point
	}

	update(name,data){
		//If not float32array, make it so
		//if(! (data instanceof Float32Array)){
		//	if(Array.isArray(data))	data = new Float32Array(data);		//already an array, just convert to float32
		//	else 					data = new Float32Array([data]);	//Single value most likely,Turn to -> Array -> Float32Ary
		//}

		ctx.bindBuffer(ctx.UNIFORM_BUFFER,this.buf);
		for(var i=0; i < arguments.length; i+=2){
			ctx.bufferSubData(ctx.UNIFORM_BUFFER, this.items[ arguments[i] ].offset, arguments[i+1], 0, null);
		}
		ctx.bindBuffer(ctx.UNIFORM_BUFFER,null);
		return this;
	}

	static getSize(type){ //[Alignment,Size]
		switch(type){
			case "f": case "i": case "b": return [4,4];
			case "mat4": return [64,64]; //16*4
			case "mat3": return [48,48]; //16*3
			case "vec2": return [8,8];
			case "vec3": return [16,12]; //Special Case
			case "vec4": return [16,16];
			default: return [0,0];
		}
	}

	static calculate(ary){
		var chunk = 16,	//Data size in Bytes, UBO using layout std140 needs to build out the struct in chunks of 16 bytes.
			tsize = 0,	//Temp Size, How much of the chunk is available after removing the data size from it
			offset = 0,	//Offset in the buffer allocation
			size;		//Data Size of the current type

		for(var i=0; i < ary.length; i++){
			//When dealing with arrays, Each element takes up 16 bytes regardless of type.
			if(!ary[i].arylen || ary[i].arylen == 0) size = UBO.getSize(ary[i].type);
			else size = [ary[i].arylen * 16,ary[i].arylen * 16];

			tsize = chunk-size[0];	//How much of the chunk exists after taking the size of the data.

			//Chunk has been overdrawn when it already has some data resurved for it.
			if(tsize < 0 && chunk < 16){
				offset += chunk;						//Add Remaining Chunk to offset...
				if(i > 0) ary[i-1].chunkLen += chunk;	//So the remaining chunk can be used by the last variable
				chunk = 16;								//Reset Chunk
			}else if(tsize < 0 && chunk == 16){
				//Do nothing incase data length is >= to unused chunk size.
				//Do not want to change the chunk size at all when this happens.
			}else if(tsize == 0){ //If evenly closes out the chunk, reset
				
				if(ary[i].type == "vec3" && chunk == 16) chunk -= size[1];	//If Vec3 is the first var in the chunk, subtract size since size and alignment is different.
				else chunk = 16;

			}else chunk -= size[1];	//Chunk isn't filled, just remove a piece

			//Add some data of how the chunk will exist in the buffer.
			ary[i].offset	= offset;
			ary[i].chunkLen	= size[1];
			ary[i].dataLen	= size[1];

			offset += size[1];
		}

		//Check if the final offset is divisiable by 16, if not add remaining chunk space to last element.
		//if(offset % 16 != 0){
			//ary[ary.length-1].chunkLen += 16 - offset % 16;
			//offset += 16 - offset % 16;
		//}

		//console.log("UBO Buffer Size ",offset);
		return offset;
	}

	static debugVisualize(ubo){
		var str = "",
			chunk = 0,
			tchunk = 0,
			itm = null;

		for(var i=0; i < ubo.keys.length; i++){
			itm = ubo.items[ubo.keys[i]];
			//console.log(ubo.keys[i],itm);

			chunk = itm.chunkLen / 4;
			for(var x = 0; x < chunk; x++){
				str += (x==0 || x == chunk-1)? "|."+i+"." : "|...";	//Display the index
				tchunk++;
				if(tchunk % 4 == 0) str += "| ~ ";
			}
		}

		if(tchunk % 4 != 0) str += "|";

		//console.log(str);
		//for(var i=0; i < ary.length; i++) console.log(ary[i]);
	}
}


class VAO{
	static create(){
		var vao = { ptr:ctx.createVertexArray(), count:0,isIndexed:false };
		ctx.bindVertexArray(vao.ptr);
		return vao;
	}

	static finalize(out,name){
		if(out.count == 0 && out.bVertices !== undefined) out.count = out.bVertices.count;

		ctx.bindVertexArray(null);
		ctx.bindBuffer(ctx.ARRAY_BUFFER,null);
		ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER,null);
		mod.res.vao[name] = out;
	}

	static updateAryBufSubData(bufPtr,offset,data){
		ctx.bindBuffer(ctx.ARRAY_BUFFER, bufPtr);
		ctx.bufferSubData(ctx.ARRAY_BUFFER, offset, data, 0, null);
		ctx.bindBuffer(ctx.ARRAY_BUFFER, null);
	}


	//----------------------------------------------------------
	//Float Array Buffers
	static floatArrayBuffer(out,name,aryData,attrLoc,compLen=3,stride=0,offset=0,isStatic=true,isInstance=false){
		var rtn = {
			ptr:ctx.createBuffer(),
			compLen:compLen,
			stride:stride,
			offset:offset,
			count:aryData.length / compLen
		};

		var ary = (aryData instanceof Float32Array)? aryData : new Float32Array(aryData);

		ctx.bindBuffer(ctx.ARRAY_BUFFER, rtn.ptr);
		ctx.bufferData(ctx.ARRAY_BUFFER, ary, (isStatic != false)? ctx.STATIC_DRAW : ctx.DYNAMIC_DRAW );
		ctx.enableVertexAttribArray(attrLoc);
		ctx.vertexAttribPointer(attrLoc,compLen,ctx.FLOAT,false,stride || 0,offset || 0);

		if(isInstance == true) ctx.vertexAttribDivisor(attrLoc, 1);

		out[name] = rtn;
		return VAO;
	}


	static partitionFloatBuffer(attrLoc,compLen,stride,offset,isInstance){
		ctx.enableVertexAttribArray(attrLoc);
		ctx.vertexAttribPointer(attrLoc,compLen,ctx.FLOAT,false,stride,offset);

		if(isInstance == true) ctx.vertexAttribDivisor(attrLoc, 1);
		
		return VAO;		
	}

	static emptyFloatArrayBuffer(out,name,byteCount,attrLoc,compLen,stride,offset,isStatic,isInstance){
		var rtn = {
			ptr:ctx.createBuffer(),
			compLen:compLen,
			stride:stride,
			offset:offset,
			count:0
		};

		ctx.bindBuffer(ctx.ARRAY_BUFFER, rtn.ptr);
		ctx.bufferData(ctx.ARRAY_BUFFER,byteCount,(isStatic != false)? ctx.STATIC_DRAW : ctx.DYNAMIC_DRAW);		//Allocate Space needed
		ctx.enableVertexAttribArray(attrLoc);
		ctx.vertexAttribPointer(attrLoc,compLen,ctx.FLOAT,false,stride || 0,offset || 0);

		if(isInstance == true) ctx.vertexAttribDivisor(attrLoc, 1);
		
		out[name] = rtn;
		return VAO;
	}


	//----------------------------------------------------------
	//Matrix 4 Array Buffer
	static mat4ArrayBuffer(out,name,aryData,attrLoc,isStatic,isInstance){
		var rtn = {
			ptr:ctx.createBuffer(),
			compLen:4,
			stride:64,
			offset:0,
			count:aryFloat.length / 16
		};

		var ary = (aryData instanceof Float32Array)? aryData : new Float32Array(aryData);

		ctx.bindBuffer(ctx.ARRAY_BUFFER, rtn.ptr);
		ctx.bufferData(ctx.ARRAY_BUFFER, ary, (isStatic != false)? ctx.STATIC_DRAW : ctx.DYNAMIC_DRAW );
		
		//Matrix is treated like an array of vec4, So there is actually 4 attributes to setup that
		//actually makes up a single mat4.
		ctx.enableVertexAttribArray(attrLoc);
		ctx.vertexAttribPointer(attrLoc,4,ctx.FLOAT,false,64,0);

		ctx.enableVertexAttribArray(attrLoc+1);
		ctx.vertexAttribPointer(attrLoc+1,4,ctx.FLOAT,false,64,16);
		
		ctx.enableVertexAttribArray(attrLoc+2);
		ctx.vertexAttribPointer(attrLoc+2,4,ctx.FLOAT,false,64,32);
		
		ctx.enableVertexAttribArray(attrLoc+3);
		ctx.vertexAttribPointer(attrLoc+3,4,ctx.FLOAT,false,64,48);
		
		if(isInstance == true){
			ctx.vertexAttribDivisor(attrLoc, 1);
			ctx.vertexAttribDivisor(attrLoc+1, 1);
			ctx.vertexAttribDivisor(attrLoc+2, 1);
			ctx.vertexAttribDivisor(attrLoc+3, 1);
		}

		out[name] = rtn;
		return VAO;
	}


	//----------------------------------------------------------
	//Indexes
	static indexBuffer(out,name,aryData,isStatic=true){
		var rtn = { ptr:ctx.createBuffer(), count:aryData.length },
			ary = (aryData instanceof Uint16Array)? aryData : new Uint16Array(aryData);

		ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, rtn.ptr );  
		ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, ary, (isStatic != false)? ctx.STATIC_DRAW : ctx.DYNAMIC_DRAW );

		out[name] = rtn;
		out.isIndexed = true;
		out.count = aryData.length;

		return VAO;
	}

	static emptyIndexBuffer(out,name,aryCount,isStatic){
		var rtn = { ptr:ctx.createBuffer(), count:0 };

		ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, rtn.ptr );  
		ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, aryCount, (isStatic != false)? ctx.STATIC_DRAW : ctx.DYNAMIC_DRAW );

		out[name] = rtn;
		out.isIndexed = true;

		return VAO;
	}


	//----------------------------------------------------------
	//Templates
	static standardRenderable(name,vertCompLen,aryVert,aryNorm,aryUV,aryInd){
		var rtn = VAO.create();
		VAO.floatArrayBuffer(rtn,"bVertices",aryVert,ATTR_POSITION_LOC,vertCompLen,0,0,true);

		if(aryNorm)	VAO.floatArrayBuffer(rtn,	"bNormal",	aryNorm,	ATTR_NORM_LOC,	3,0,0,true);
		if(aryUV)	VAO.floatArrayBuffer(rtn,	"bUV",		aryUV,		ATTR_UV_LOC,	2,0,0,true);
		if(aryInd)	VAO.indexBuffer(rtn,		"bIndex",	aryInd, true);

		VAO.finalize(rtn,name);

		return rtn;
	}

	static standardEmpty(name,vertCompLen=3,vertCnt=4,normLen=0,uvLen=0,indexLen=0){
		var rtn = VAO.create();
		VAO.emptyFloatArrayBuffer(rtn,"bVertices",Float32Array.BYTES_PER_ELEMENT * vertCompLen * vertCnt,ATTR_POSITION_LOC,vertCompLen,0,0,false);
	

		//if(aryNorm)	VAO.floatArrayBuffer(rtn,	"bNormal",	aryNorm,	ATTR_NORM_LOC,	3,0,0,true);
		//if(aryUV)	VAO.floatArrayBuffer(rtn,	"bUV",		aryUV,		ATTR_UV_LOC,	2,0,0,true);
		if(indexLen > 0) VAO.emptyIndexBuffer(rtn, "bIndex", Uint16Array.BYTES_PER_ELEMENT * indexLen, false);

		VAO.finalize(rtn,name);

		return rtn;
	}
}

//FrameBuffer Object
class FBO{
	constructor(){
		this.fbo = null;
		this.aryDrawBuf = [];
	}

	//-------------------------------------------------
	// START AND COMPLETE CREATING FRAME BUFFER
	//-------------------------------------------------
	create(w=null, h=null){
		if(w == null) w = mod.width;
		if(h == null) h = mod.height;

		this.fbo = { frameWidth:w, frameHeight:h, ptr:ctx.createFramebuffer() };
		this.aryDrawBuf.length = 0;

		ctx.bindFramebuffer(ctx.FRAMEBUFFER, this.fbo.ptr);
		return this;
	}

	finalize(name){
		//Assign which buffers are going to be written too
		ctx.drawBuffers(this.aryDrawBuf);

		//Check if the Frame has been setup Correctly.
		switch(ctx.checkFramebufferStatus(ctx.FRAMEBUFFER)){
			case ctx.FRAMEBUFFER_COMPLETE: break;
			case ctx.FRAMEBUFFER_INCOMPLETE_ATTACHMENT: console.log("FRAMEBUFFER_INCOMPLETE_ATTACHMENT"); break;
			case ctx.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT: console.log("FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT"); break;
			case ctx.FRAMEBUFFER_INCOMPLETE_DIMENSIONS: console.log("FRAMEBUFFER_INCOMPLETE_DIMENSIONS"); break;
			case ctx.FRAMEBUFFER_UNSUPPORTED: console.log("FRAMEBUFFER_UNSUPPORTED"); break;
			case ctx.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE: console.log("FRAMEBUFFER_INCOMPLETE_MULTISAMPLE"); break;
			case ctx.RENDERBUFFER_SAMPLES: console.log("RENDERBUFFER_SAMPLES"); break;
		}
		
		//Cleanup
		ctx.bindFramebuffer(ctx.FRAMEBUFFER, null);
		ctx.bindRenderbuffer(ctx.RENDERBUFFER, null);
		ctx.bindTexture(ctx.TEXTURE_2D, null);

		mod.res.fbo[name] = this.fbo;

		//Return final struct
		return this.fbo;
	}


	//-------------------------------------------------
	// COLOR BUFFERS
	//-------------------------------------------------
	texColorBuffer(name,cAttachNum){
		//Up to 16 texture attachments 0 to 15
		var buf = { texture:ctx.createTexture() };
		
		ctx.bindTexture(ctx.TEXTURE_2D, buf.texture);
		ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, this.fbo.frameWidth, this.fbo.frameHeight, 0, ctx.RGBA, ctx.UNSIGNED_BYTE, null);
		ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.LINEAR); //NEAREST
		ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR); //NEAREST

		//ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR);
		//ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.LINEAR);
		//ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);	//Stretch image to X position
		//ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);	//Stretch image to Y position

		ctx.framebufferTexture2D(ctx.FRAMEBUFFER, ctx.COLOR_ATTACHMENT0 + cAttachNum, ctx.TEXTURE_2D, buf.texture, 0);

		//Save Attachment to enable on finalize
		this.aryDrawBuf.push(ctx.COLOR_ATTACHMENT0 + cAttachNum);
		this.fbo[name] = buf;
		return this;
	}

	multiSampleColorBuffer(name, cAttachNum, sampleSize=4){ //NOTE, Only sampleSize of 4 works, any other value crashes.
		var buf = { ptr: ctx.createRenderbuffer() };

		ctx.bindRenderbuffer(ctx.RENDERBUFFER, buf.ptr); //Bind Buffer

		//Set Data Size
		ctx.renderbufferStorageMultisample(ctx.RENDERBUFFER, sampleSize, ctx.RGBA8, this.fbo.frameWidth, this.fbo.frameHeight); 
		
		//Bind buf to color attachment
		ctx.framebufferRenderbuffer(ctx.FRAMEBUFFER, ctx.COLOR_ATTACHMENT0 + cAttachNum, ctx.RENDERBUFFER, buf.ptr);

		//Save Attachment to enable on finalize
		this.aryDrawBuf.push(ctx.COLOR_ATTACHMENT0 + cAttachNum);
		this.fbo[name] = buf;
		return this;
	}


	//-------------------------------------------------
	// DEPTH BUFFERS
	//-------------------------------------------------
	depthBuffer(isMultiSample = false){
		this.fbo.bDepth = ctx.createRenderbuffer();
		ctx.bindRenderbuffer(ctx.RENDERBUFFER, this.fbo.bDepth);
		
		//Regular render Buffer
		if(!isMultiSample){
			ctx.renderbufferStorage(ctx.RENDERBUFFER, ctx.DEPTH_COMPONENT16,
				this.fbo.frameWidth, this.fbo.frameHeight);
		
		//Set render buffer to do multi samples
		}else{
			ctx.renderbufferStorageMultisample(ctx.RENDERBUFFER, 4,
				ctx.DEPTH_COMPONENT16, 
				this.fbo.frameWidth, this.fbo.frameHeight ); //DEPTH_COMPONENT24
		}

		//Attach buffer to frame
		ctx.framebufferRenderbuffer(ctx.FRAMEBUFFER, ctx.DEPTH_ATTACHMENT, ctx.RENDERBUFFER, this.fbo.bDepth);
		return this;
	}

	texDepthBuffer(){
		//Up to 16 texture attachments 0 to 15
		var buf = { texture:ctx.createTexture() };
		
		ctx.bindTexture(ctx.TEXTURE_2D, buf.texture);
		//ctx.pixelStorei(ctx.UNPACK_FLIP_Y_WEBGL, false);
		ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.NEAREST);
		ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.NEAREST);
		ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
		ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
		ctx.texStorage2D(ctx.TEXTURE_2D, 1, ctx.DEPTH_COMPONENT16, this.fbo.frameWidth, this.fbo.frameHeight);

		ctx.framebufferTexture2D(ctx.FRAMEBUFFER, ctx.DEPTH_ATTACHMENT, ctx.TEXTURE_2D, buf.texture, 0);

		this.fbo.bDepth = buf
		return this;
	}


	//-------------------------------------------------
	// STATIC FUNCTIONS
	//-------------------------------------------------
	static readPixel(fbo,x,y,cAttachNum){
		var p = new Uint8Array(4);
		ctx.bindFramebuffer(ctx.READ_FRAMEBUFFER, fbo.ptr);
		ctx.readBuffer(ctx.COLOR_ATTACHMENT0 + cAttachNum);
		ctx.readPixels(x, y, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, p);
		ctx.bindFramebuffer(ctx.READ_FRAMEBUFFER, null);
		return p;
	}

	static activate(fbo){ ctx.bindFramebuffer(ctx.FRAMEBUFFER,fbo.ptr); return this; }
	static deactivate(){ ctx.bindFramebuffer(ctx.FRAMEBUFFER,null); return this; }
	static clear(fbo, unbind = true){
		ctx.bindFramebuffer(ctx.FRAMEBUFFER,fbo.ptr);
		ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT); 
		if(unbind) ctx.bindFramebuffer(ctx.FRAMEBUFFER,null);
	}


	static blit(fboRead,fboWrite){
		//bind the two Frame Buffers
		ctx.bindFramebuffer(ctx.READ_FRAMEBUFFER, fboRead.ptr);
		ctx.bindFramebuffer(ctx.DRAW_FRAMEBUFFER, fboWrite.ptr);

		//Clear Frame buffer being copied to.
		ctx.clearBufferfv(ctx.COLOR, 0, [0.0, 0.0, 0.0, 1.0]); 

		//Transfer Pixels from one FrameBuffer to the Next
		ctx.blitFramebuffer(
			0, 0, fboRead.frameWidth, fboRead.frameHeight,
			0, 0, fboWrite.frameWidth, fboWrite.frameHeight,
			ctx.COLOR_BUFFER_BIT, ctx.NEAREST);

		//Unbind
		ctx.bindFramebuffer(ctx.READ_FRAMEBUFFER, null);
		ctx.bindFramebuffer(ctx.DRAW_FRAMEBUFFER, null);
	}



	/*

	static multiSampleDepthBuffer(out,sampleSize=4){
		out.bDepth = ctx.createRenderbuffer();

		ctx.bindRenderbuffer(ctx.RENDERBUFFER, out.bDepth);

		//ctx.renderbufferStorage(ctx.RENDERBUFFER, ctx.DEPTH_COMPONENT16, out.wSize, out.hSize);
		ctx.renderbufferStorageMultisample(ctx.RENDERBUFFER, sampleSize,  ctx.DEPTH_COMPONENT16, out.wSize, out.hSize); //DEPTH_COMPONENT24

		ctx.framebufferRenderbuffer(ctx.FRAMEBUFFER, ctx.DEPTH_ATTACHMENT, ctx.RENDERBUFFER, out.bDepth);

		return this;
	}


	static build(name,colorCnt,useDepth = true,wSize = null,hSize = null){
		if(wSize == null) wSize = mod.width;
		if(hSize == null) hSize = mod.height;

		var rtn = { wSize:wSize, hSize:hSize };

		//..................................
		//Create and Set Depth
		FBO.create(rtn);
		if(useDepth == true) FBO.depthBuffer(rtn,wSize,hSize);

		//..................................
		//Build color buffers
		var cBufAry = [];
		for(var i=0; i < colorCnt; i++){
			cBufAry.push( ctx.COLOR_ATTACHMENT0 + i );
			FBO.texColorBuffer(rtn,i,wSize,hSize);
		}
		if(cBufAry.length > 1) ctx.drawBuffers(cBufAry);
		
		//..................................
		//All Done.
		FBO.finalize(rtn,name);
		return rtn;
	}

	static create(wSize=null,hSize=null){
		if(wSize == null) wSize = mod.width;
		if(hSize == null) hSize = mod.height;

		var rtn = { wSize:wSize, hSize:hSize, ptr:ctx.createFramebuffer() };
		//out.colorBuf = [];
		
		ctx.bindFramebuffer(ctx.FRAMEBUFFER, rtn.ptr);
		return rtn;
	}

	static texColorBuffer(out,name,cAttachNum){
		//Up to 16 texture attachments 0 to 15
		var buf = { texture:ctx.createTexture() };
		
		ctx.bindTexture(ctx.TEXTURE_2D, buf.texture);
		ctx.texImage2D(ctx.TEXTURE_2D,0, ctx.RGBA, out.wSize, out.hSize, 0, ctx.RGBA, ctx.UNSIGNED_BYTE, null);
		ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.LINEAR); //NEAREST
		ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR); //NEAREST

		//ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR);
		//ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.LINEAR);
		//ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);	//Stretch image to X position
		//ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);	//Stretch image to Y position

		ctx.framebufferTexture2D(ctx.FRAMEBUFFER, ctx.COLOR_ATTACHMENT0 + cAttachNum, ctx.TEXTURE_2D, buf.texture, 0);

		out[name] = buf;
		return this;
	}

	//http://webglsamples.org/WebGL2Samples/#fbo_multisample
	//https://github.com/WebGLSamples/WebGL2Samples/blob/master/samples/fbo_multisample.html#L183-L245
	//https://github.com/tsherif/webgl2examples/blob/master/deferred.html
	//https://github.com/tiansijie/Tile_Based_WebGL_DeferredShader/blob/master/src/deferred.js
	//https://www.khronos.org/opengl/wiki/Framebuffer_Object_Extension_Examples#MSAA

	static multiSampleColorBuffer(out, name, cAttachNum, sampleSize=4){
		var buf = { ptr: ctx.createRenderbuffer() };

		ctx.bindRenderbuffer(ctx.RENDERBUFFER, buf.ptr); //Bind Buffer

		//Set Data Size
		ctx.renderbufferStorageMultisample(ctx.RENDERBUFFER, sampleSize, ctx.RGBA8, out.wSize, out.hSize); 
		
		//Bind buf to color attachment
		ctx.framebufferRenderbuffer(ctx.FRAMEBUFFER, ctx.COLOR_ATTACHMENT0 + cAttachNum, ctx.RENDERBUFFER, buf.ptr);

 		//ctx.drawBuffers([
        //    ctx.COLOR_ATTACHMENT0
            //gl.COLOR_ATTACHMENT1,
            //gl.COLOR_ATTACHMENT2
        //]);

		out[name] = buf;
		return this;
	}

	static multiSampleColorBufferx(out,name,cAttachNum){
		//Main FrameBuffer.

		//When All Done, 
		//Render to Texture Frame Buffer.
		

		var cAttach = gl.COLOR_ATTACHMENT0 + cAttachNum;

		var buf = { texture			:ctx.createTexture(),
					samples			:ctx.createRenderbuffer(),
					renderSamples	:ctx.createRenderbuffer(),
					renderTexture	:ctx.createRenderbuffer()
				};
		ctx.texImage2D(ctx.TEXTURE_2D,0, ctx.RGBA, out.wSize, out.hSize, 0, ctx.RGBA, ctx.UNSIGNED_BYTE, null);
		ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.NEAREST);
		ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.NEAREST);

		//Create a buffer to hold all the sample data.
		ctx.bindRenderbuffer(ctx.RENDERBUFFER, buf.samples);
        ctx.renderbufferStorageMultisample(ctx.RENDERBUFFER, 4, ctx.RGBA8, out.wSize, out.hSize);

        //Create Main Render Buffer pointing to the sample buffer data.
        ctx.bindFramebuffer(ctx.FRAMEBUFFER, buf.renderSamples);
        ctx.framebufferRenderbuffer(ctx.FRAMEBUFFER, cAttach, ctx.RENDERBUFFER, buf.samples);
 
        //Create another render buffer that points to the texture for storage.
		ctx.bindFramebuffer(ctx.FRAMEBUFFER, buf.renderTexture);
		ctx.framebufferTexture2D(ctx.FRAMEBUFFER, cAttach, ctx.TEXTURE_2D, buf.texture, 0);

		
		//var FRAMEBUFFER_SIZE = {
         //   x: canvas.width,
         //   y: canvas.height
        //};
        //var texture = gl.createTexture();
        //gl.bindTexture(gl.TEXTURE_2D, texture);
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, FRAMEBUFFER_SIZE.x, FRAMEBUFFER_SIZE.y, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        //gl.bindTexture(gl.TEXTURE_2D, null);


		// -- Init Frame Buffers
        var FRAMEBUFFER = {
            RENDERBUFFER: 0,
            COLORBUFFER: 1
        };
        var framebuffers = [
            gl.createFramebuffer(),
            gl.createFramebuffer()
        ];

 		var colorRenderbuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, colorRenderbuffer);
        gl.renderbufferStorageMultisample(gl.RENDERBUFFER, 4, gl.RGBA8, FRAMEBUFFER_SIZE.x, FRAMEBUFFER_SIZE.y);

        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[FRAMEBUFFER.RENDERBUFFER]);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, colorRenderbuffer);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[FRAMEBUFFER.COLORBUFFER]);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);



        // Pass 1
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[FRAMEBUFFER.RENDERBUFFER]);
        gl.clearBufferfv(gl.COLOR, 0, [0.0, 0.0, 0.0, 1.0]);
        
	        gl.useProgram(programs[PROGRAM.TEXTURE]);
	        gl.bindVertexArray(vertexArrays[PROGRAM.TEXTURE]);
	        var IDENTITY = mat4.create();
	        gl.uniformMatrix4fv(mvpLocationTexture, false, IDENTITY);
	        gl.drawArrays(gl.LINE_LOOP, 0, vertexCount);
        
        // Blit framebuffers, no Multisample texture 2d in WebGL 2
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffers[FRAMEBUFFER.RENDERBUFFER]);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, framebuffers[FRAMEBUFFER.COLORBUFFER]);
        gl.clearBufferfv(gl.COLOR, 0, [0.0, 0.0, 0.0, 1.0]);
        gl.blitFramebuffer(
            0, 0, FRAMEBUFFER_SIZE.x, FRAMEBUFFER_SIZE.y,
            0, 0, FRAMEBUFFER_SIZE.x, FRAMEBUFFER_SIZE.y,
            gl.COLOR_BUFFER_BIT, gl.NEAREST
        );
	}

	static multiSampleDepthBuffer(out,sampleSize=4){
		out.bDepth = ctx.createRenderbuffer();

		ctx.bindRenderbuffer(ctx.RENDERBUFFER, out.bDepth);

		//ctx.renderbufferStorage(ctx.RENDERBUFFER, ctx.DEPTH_COMPONENT16, out.wSize, out.hSize);
		ctx.renderbufferStorageMultisample(ctx.RENDERBUFFER, sampleSize,  ctx.DEPTH_COMPONENT16, out.wSize, out.hSize); //DEPTH_COMPONENT24

		ctx.framebufferRenderbuffer(ctx.FRAMEBUFFER, ctx.DEPTH_ATTACHMENT, ctx.RENDERBUFFER, out.bDepth);

		return this;
	}


	static depthBuffer(out){
		out.bDepth = ctx.createRenderbuffer();

		ctx.bindRenderbuffer(ctx.RENDERBUFFER, out.bDepth);
		ctx.renderbufferStorage(ctx.RENDERBUFFER, ctx.DEPTH_COMPONENT16, out.wSize, out.hSize);
		ctx.framebufferRenderbuffer(ctx.FRAMEBUFFER, ctx.DEPTH_ATTACHMENT, ctx.RENDERBUFFER, out.bDepth);

		return this;
	}

	static finalize(out,name){
		ctx.drawBuffers([
            ctx.COLOR_ATTACHMENT0
            //gl.COLOR_ATTACHMENT1,
            //gl.COLOR_ATTACHMENT2
        ]);

		switch(ctx.checkFramebufferStatus(ctx.FRAMEBUFFER)){
			case ctx.FRAMEBUFFER_COMPLETE: break;
			case ctx.FRAMEBUFFER_INCOMPLETE_ATTACHMENT: console.log("FRAMEBUFFER_INCOMPLETE_ATTACHMENT"); break;
			case ctx.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT: console.log("FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT"); break;
			case ctx.FRAMEBUFFER_INCOMPLETE_DIMENSIONS: console.log("FRAMEBUFFER_INCOMPLETE_DIMENSIONS"); break;
			case ctx.FRAMEBUFFER_UNSUPPORTED: console.log("FRAMEBUFFER_UNSUPPORTED"); break;
			case ctx.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE: console.log("FRAMEBUFFER_INCOMPLETE_MULTISAMPLE"); break;
			case ctx.RENDERBUFFER_SAMPLES: console.log("RENDERBUFFER_SAMPLES"); break;
		}
		
		ctx.bindTexture(ctx.TEXTURE_2D, null);
		ctx.bindRenderbuffer(ctx.RENDERBUFFER, null);
		ctx.bindFramebuffer(ctx.FRAMEBUFFER, null);
		mod.res.fbo[name] = out;

		return out;
	}

	static colorDepthFBO(name){
		var rtn = {};
		return FBO.create(rtn)
			.texColorBuffer(rtn,0)
			.depthBuffer(rtn)
			.finalize(rtn,name);
	}


	static delete(fbo){
		//TODO, Delete using the Cache name, then remove it from cache.
		ctx.deleteRenderbuffer(fbo.depth);
		ctx.deleteTexture(fbo.texColor);
		ctx.deleteFramebuffer(fbo.ptr);
	}

	*/
}



//------------------------------------------------------
//Export
//------------------------------------------------------
var mod = {
	set:init,		//Set the canvas for gl to get its context
	ctx:null,		//Reference to gl context
	width:0,
	height:0,

	clear:clear,

	//.........................................
	createArrayBuffer:createArrayBuffer,
	createUBO:createUBO,

	//.........................................
	fitScreen:fitScreen,
	setSize:setSize,
	setClearColor:setClearColor,

	//.........................................
	rgbArray:rgbArray,
	rgbaArray:rgbaArray,

	//.........................................
	createShader:createShader,
	createProgram:createProgram,
	createProgramFromText:createProgramFromText,
	
	//.........................................
	loadTexture:loadTexture,
	updateTexture:updateTexture,

	//.........................................	
	res:{ textures:[], videos:[], images:[], shaders:[], ubo:[], vao:[], fbo:[], materials:[],
		getMaterial:function(matName){
			if(matName === undefined || matName == null) return null;
			if(this.materials[matName] === undefined){ console.log("Material Not Found :", matName); return null; }
			return this.materials[matName];
		}
	},

	//.........................................
	UBOTransform: null
};
export default mod;

//Named Exports
export {
		//Classes
		VAO,
		UBO,
		FBO,

		//Constants
		ATTR_POSITION_LOC,	
		ATTR_NORM_LOC,
		ATTR_UV_LOC,UBO_TRANSFORM,
		UNI_MODEL_MAT_NAME,
		UNI_NORM_MAT_NAME
}