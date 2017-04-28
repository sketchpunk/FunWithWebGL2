var Fungi = (function(){
	/*>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
	<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<*/
	var gl = null;

	function Init(canvasID){
		if(Fungi.gl != null) return Fungi.gl;

		var canvas = document.getElementById(canvasID);
		gl = canvas.getContext("webgl2");
		if(!gl){ console.error("WebGL context is not available."); return null; }

		//...................................................
		//Setup GL, Set all the default configurations we need.
		gl.cullFace(gl.BACK);								//Back is also default
		gl.frontFace(gl.CCW);								//Dont really need to set it, its ccw by default.
		gl.enable(gl.DEPTH_TEST);							//Shouldn't use this, use something else to add depth detection
		gl.enable(gl.CULL_FACE);							//Cull back face, so only show triangles that are created clockwise
		gl.depthFunc(gl.LEQUAL);							//Near things obscure far things
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);	//Setup default alpha blending
		gl.clearColor(1.0,1.0,1.0,1.0);	//Set clear color

		//...................................................
		//Methods
		//Reset the canvas with our set background color.	
		gl.fClear = function(){ this.clear(this.COLOR_BUFFER_BIT | this.DEPTH_BUFFER_BIT); return this; };

		//Create and fill our Array buffer.
		gl.fCreateArrayBuffer = function(floatAry,isStatic,isUnbind){
			if(isStatic === undefined) isStatic = true; //So we can call this function without setting isStatic

			var buf = this.createBuffer();
			this.bindBuffer(this.ARRAY_BUFFER,buf);
			this.bufferData(this.ARRAY_BUFFER, floatAry, (isStatic)? this.STATIC_DRAW : this.DYNAMIC_DRAW );
			if(isUnbind != false) this.bindBuffer(this.ARRAY_BUFFER,null);
			return buf;
		};

		//Textures
		gl.fLoadTexture = function(name,img,doYFlip,noMips){ var tex = Fungi.Res.Textures[name] = this.createTexture();  return this.fUpdateTexture(name,img,doYFlip,noMips); };
		gl.fUpdateTexture = function(name,img,doYFlip,noMips){
			var tex = this.mTextureCache[name];	
			if(doYFlip == true) this.pixelStorei(this.UNPACK_FLIP_Y_WEBGL, true);	//Flip the texture by the Y Position, So 0,0 is bottom left corner.

			this.bindTexture(this.TEXTURE_2D, tex);														//Set text buffer for work
			this.texImage2D(this.TEXTURE_2D, 0, this.RGBA, this.RGBA, this.UNSIGNED_BYTE, img);			//Push image to GPU.
			
			if(noMips === undefined || noMips == false){
				this.texParameteri(this.TEXTURE_2D, this.TEXTURE_MAG_FILTER, this.LINEAR);					//Setup up scaling
				this.texParameteri(this.TEXTURE_2D, this.TEXTURE_MIN_FILTER, this.LINEAR_MIPMAP_NEAREST);	//Setup down scaling
				this.generateMipmap(this.TEXTURE_2D);	//Precalc different sizes of texture for better quality rendering.
			}else{
				this.texParameteri(this.TEXTURE_2D, this.TEXTURE_MAG_FILTER, this.NEAREST);
				this.texParameteri(this.TEXTURE_2D, this.TEXTURE_MIN_FILTER, this.NEAREST);
				this.texParameteri(this.TEXTURE_2D, this.TEXTURE_WRAP_S, this.CLAMP_TO_EDGE);
				this.texParameteri(this.TEXTURE_2D, this.TEXTURE_WRAP_T, this.CLAMP_TO_EDGE);
			}

			this.bindTexture(this.TEXTURE_2D,null);									//Unbind
			
			if(doYFlip == true) this.pixelStorei(this.UNPACK_FLIP_Y_WEBGL, false);	//Stop flipping textures
			return tex;	
		}

		//imgAry must be 6 elements long and images placed in the right order
		//RIGHT,LEFT,TOP,BOTTOM,BACK,FRONT
		gl.fLoadCubeMap = function(name,imgAry){
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

		//...................................................
		//Setters - Getters

		//Set the size of the canvas html element and the rendering view port
		gl.fSetSize = function(w,h){
			//set the size of the canvas, on chrome we need to set it 3 ways to make it work perfectly.
			this.canvas.style.width = w + "px";
			this.canvas.style.height = h + "px";
			this.canvas.width = w;
			this.canvas.height = h;

			//when updating the canvas size, must reset the viewport of the canvas 
			//else the resolution webgl renders at will not change
			this.viewport(0,0,w,h);
			this.fWidth = w;	//Need to save Width and Height to resize viewport for WebVR
			this.fHeight = h;
			return this;
		}

		//Set the size of the canvas to fill a % of the total screen.
		gl.fFitScreen = function(wp,hp){ return this.fSetSize(window.innerWidth * (wp || 1),window.innerHeight * (hp || 1)); }

		return Fungi.gl = gl;
	}


	/*>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
	
	<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<*/
	class Util{
		//Convert Hex colors to float arrays, can batch process a list into one big array.
		//example : Fungi.Util.rgbArray("#FF0000","00FF00","#0000FF");
		static rgbArray(){
			if(arguments.length == 0) return null;
			var rtn = [];

			for(var i=0,c,p; i < arguments.length; i++){
				if(arguments[i].length < 6) continue;
				c = arguments[i];		//Just an alias(copy really) of the color text, make code smaller.
				p = (c[0] == "#")?1:0;	//Determine starting position in char array to start pulling from

				rtn.push(
					parseInt(c[p]	+c[p+1],16)	/ 255.0,
					parseInt(c[p+2]	+c[p+3],16)	/ 255.0,
					parseInt(c[p+4]	+c[p+5],16)	/ 255.0
				);
			}
			return rtn;
		}
	}




	/*>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
	
	<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<*/
	class Transform{
		constructor(){
			//Transformation Data
			this.position = new Vec3(0);
			this.scale = new Vec3(1);
			this.rotation = new Quaternion();
			this.localMatrix = new Matrix4();

			//Parent / Child Relations
			this.children = [];
			this._parent = null;
		}

		//----------------------------------------------
		//region Setters/Getters
			//R  T  F  T    
			//00 04 08 12
			//01 05 09 13
			//02 06 10 14
			//03 07 11 15
			right(d){	return this._getDirection(0,1,2,d);	}
			top(d){		return this._getDirection(4,5,6,d);	}
			forward(d){	return this._getDirection(8,9,10,d);}
			_getDirection(xi,yi,zi,d){
				this.updateMatrix();
				d = d || 1; //Distance
				var x = this.localMatrix[xi], y = this.localMatrix[yi], z = this.localMatrix[zi],
					m =  Math.sqrt( x*x + y*y + z*z );
				return [ x/m*d, y/m*d, z/m*d ];
			}

			get parent(){ this._parent; }
			set parent(p){
				if(this._parent != null){
					//this._parent.removeChild(this);
				}

				this._parent = p;
				//this._parent.addChild(this);
			}

			//Chaining functions, useful for initializing 
			setPosition(x,y,z){ this.position.set(x,y,z); return this; }
			setScale(x,y,z){ this.scale.set(x,y,z); return this; }
			setRotation(x,y,z){ return this; }
		//endregion

		//----------------------------------------------
		//region Methods
			updateMatrix(){
				//Only Update the Matrix if its needed.
				if(!this.position.isModified && !this.scale.isModified && !this.rotation.isModified) return this;

				this.localMatrix.reset()
					.translate(this.position.x,this.position.y,this.position.z)
					.rotateQuaternion(this.rotation)
					.scale(this.scale.x,this.scale.y,this.scale.z);

				//Set the modified indicator to false on all the transforms.
				this.position.isModified	= false;
				this.scale.isModified		= false;
				this.rotation.isModified	= false;
				return this;
			}

			addChild(c){ c.parent = this; this.children.push(c); return this; }

			removeChild(c){ return this; }
		//endregion
	}


	class Renderable extends Transform{
		constructor(){
			this.mesh = null;
		}
	}


	class Camera extends Transform{
		constructor(){

		}
	}


	class LightSource extends Transform{
		constructor(){

		}
	}


	/*>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
	Fungi.Maths
	<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<*/
	class Vec3 extends Float32Array{
		constructor(ini){
			super(3);
			this[0] = this[1] = this[2] = ini;
			this.isModified = true;
		}

		//----------------------------------------------
		//region XYZ Setters
			set(x,y,z){ this[0] = x; this[1] = y; this[2] = z; return this; this.isModified = true; }

			get x(){ return this[0]; }	set x(val){ this[0] = val; this.isModified = true; }
			get y(){ return this[1]; }	set y(val){ this[1] = val; this.isModified = true; }
			get z(){ return this[2]; }	set z(val){ this[2] = val; this.isModified = true; }
		//endregion

		//----------------------------------------------
		//region Methods
			magnitude(v){
				//Only get the magnitude of this vector
				if(v === undefined) return Math.sqrt( this[0]*this[0] + this[1]*this[1] + this[2]*this[2] );

				//Get magnitude based on another vector
				var x = v[0] - this[0],
					y = v[1] - this[1],
					z = v[2] - this[2];

				return Math.sqrt( x*x + y*y + z*z );
			}

			normalize(){
				var mag = Math.sqrt( this[0]*this[0] + this[1]*this[1] + this[2]*this[2] );
				this[0] /= mag;
				this[1] /= mag;
				this[2] /= mag;
				this.isModified = true;
				return this;
			}

			multi(v){
				this[0] *= v;
				this[1] *= v;
				this[2] *= v;
				this.isModified = true;
				return this;
			}
		//endregion
	}


	class Quaternion extends Float32Array{
		constructor(){
			super(4);
			this[0] = this[1] = this[2] = 0;
			this[3] = 1;
			this.isModified = false;
		}

		//----------------------------------------------
		//region Setter/Getters
			get x(){ return this[0]; }	set x(val){ this[0] = val; this.isModified = true;}
			get y(){ return this[1]; }	set y(val){ this[1] = val; this.isModified = true;}
			get z(){ return this[2]; }	set z(val){ this[2] = val; this.isModified = true;}
			get w(){ return this[3]; }	set w(val){ this[3] = val; this.isModified = true;}
		//endregion
	}


	class Matrix4 extends Float32Array{
		constructor(){ super(16); this[0] = this[5] = this[10] = this[15] = 1; }  //Setup Identity

		//----------------------------------------------
		//region Methods
			//reset data back to identity.
			reset(){ 
				for(var i=0; i <= this.length; i++) this[i] = (i % 5 == 0)? 1 : 0; //only positions 0,5,10,15 need to be 1 else 0
				return this;
			}
		//endregion

		//----------------------------------------------
		//region Static


		//endregion
	}


	/*>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
	Fungi.Shaders
	<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<*/
	class ShaderBuilder{
		constructor(){

		}
	}


	class ShaderUtil{
		//get the text of a script tag that are storing shader code.
		static domShaderSrc(elmID){
			var elm = document.getElementById(elmID);
			if(!elm || elm.text == ""){ console.log(elmID + " shader not found or no text."); return null; }
			
			return elm.text;
		}

		//Create a shader by passing in its code and what type
		static createShader(src,type){
			var shader = gl.createShader(type);
			gl.shaderSource(shader,src);
			gl.compileShader(shader);

			//Get Error data if shader failed compiling
			if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
				console.error("Error compiling shader : " + src, gl.getShaderInfoLog(shader));
				gl.deleteShader(fungi.shader);
				return null;
			}

			return shader;
		}

		//Link two compiled shaders to create a program for rendering.
		static createProgram(vShader,fShader,doValidate){
			//Link shaders together
			var prog = gl.createProgram();
			gl.attachShader(prog,vShader);
			gl.attachShader(prog,fShader);

			//Force predefined locations for specific attributes. If the attibute isn't used in the shader its location will default to -1
			//gl.bindAttribLocation(prog,ATTR_POSITION_LOC,ATTR_POSITION_NAME);
			//gl.bindAttribLocation(prog,ATTR_NORMAL_LOC,ATTR_NORMAL_NAME);
			//gl.bindAttribLocation(prog,ATTR_UV_LOC,ATTR_UV_NAME);

			gl.linkProgram(prog);

			//Check if successful
			if(!gl.getProgramParameter(prog, gl.LINK_STATUS)){
				console.error("Error creating shader program.",gl.getProgramInfoLog(prog));
				gl.deleteProgram(prog); return null;
			}

			//Only do this for additional debugging.
			if(doValidate){
				gl.validateProgram(prog);
				if(!gl.getProgramParameter(prog,gl.VALIDATE_STATUS)){
					console.error("Error validating program", gl.getProgramInfoLog(prog));
					gl.deleteProgram(prog); return null;
				}
			}
			
			//Can delete the shaders since the program has been made.
			gl.detachShader(prog,vShader); //TODO, detaching might cause issues on some browsers, Might only need to delete.
			gl.detachShader(prog,fShader);
			gl.deleteShader(fShader);
			gl.deleteShader(vShader);

			return prog;
		}

		//-------------------------------------------------
		// Helper functions
		//-------------------------------------------------
		
		//Pass in Script Tag IDs for our two shaders and create a program from it.
		static domShaderProgram(vectID,fragID,doValidate){
			var vShaderTxt	= ShaderUtil.domShaderSrc(vectID);							if(!vShaderTxt)	return null;
			var fShaderTxt	= ShaderUtil.domShaderSrc(fragID);							if(!fShaderTxt)	return null;
			var vShader		= ShaderUtil.createShader(vShaderTxt,gl.VERTEX_SHADER);		if(!vShader)	return null;
			var fShader		= ShaderUtil.createShader(fShaderTxt,gl.FRAGMENT_SHADER);	if(!fShader){	gl.deleteShader(vShader); return null; }
			return ShaderUtil.createProgram(vShader,fShader,true);
		}

		static createProgramFromText(vShaderTxt,fShaderTxt,doValidate){
			var vShader		= ShaderUtil.createShader(vShaderTxt,gl.VERTEX_SHADER);		if(!vShader)	return null;
			var fShader		= ShaderUtil.createShader(fShaderTxt,gl.FRAGMENT_SHADER);	if(!fShader){	gl.deleteShader(vShader); return null; }			
			return ShaderUtil.createProgram(vShader,fShader,true);
		}
	}

	class UBO{ constructor(){} }


	class VAO{
		static create(out,dMode){
			out.drawMode = dMode || gl.TRIANGLES;
			out.vao = gl.createVertexArray();
			gl.bindVertexArray(out.vao);
			return VAO;
		}

		static floatArrayBuffer(out,name,aryFloat,attrLoc,size,stride,offset,isStatic){
			var nameBuf = name + "Buffer";
			out[nameBuf]		= gl.createBuffer();
			out[name+"Size"]	= size;
			out[name+"Count"]	= aryFloat.length / size;

			gl.bindBuffer(gl.ARRAY_BUFFER, out[nameBuf]);
			gl.bufferData(gl.ARRAY_BUFFER, aryFloat, (isStatic != false)? gl.STATIC_DRAW : gl.DYNAMIC_DRAW );
			gl.enableVertexAttribArray(attrLoc);
			gl.vertexAttribPointer(attrLoc,size,gl.FLOAT,false,stride || 0,offset || 0);

			return VAO;
		}

		static vertexBuffer(out,aryFloat,vSize,isStatic){
			out.vertBuffer = gl.createBuffer();								//Create buffer...
			out.vertSize = vSize;											//How many floats make up a vertex
			out.vertCount = aryFloat.length / out.vertSize;					//How many vertices in the array

			gl.bindBuffer(gl.ARRAY_BUFFER, out.vertBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, aryFloat, (isStatic != false)? gl.STATIC_DRAW : gl.DYNAMIC_DRAW );	//then push array into it.
			gl.enableVertexAttribArray(Fungi.ATTR_LOC_POSITION);						//Enable Attribute location
			gl.vertexAttribPointer(Fungi.ATTR_LOC_POSITION,vSize,gl.FLOAT,false,0,0);	//Put buffer at location of the vao
		
			return VAO;
		}

		static normalBuffer(out,aryFloat,attrLoc,isStatic){
			out.normBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, out.normBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, aryFloat, (isStatic != false)? gl.STATIC_DRAW : gl.DYNAMIC_DRAW );
			gl.enableVertexAttribArray(Fungi.ATTR_LOC_NORM);
			gl.vertexAttribPointer(Fungi.ATTR_LOC_NORM,3,gl.FLOAT,false,0,0);
		
			return VAO;
		}

		static uvBuffer(out,aryFloat,attrLoc,isStatic){
			out.uvBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, out.uvBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, aryFloat, (isStatic != false)? gl.STATIC_DRAW : gl.DYNAMIC_DRAW );
			gl.enableVertexAttribArray(Fungi.ATTR_UV_LOC);
			gl.vertexAttribPointer(Fungi.ATTR_UV_LOC,2,gl.FLOAT,false,0,0);
		
			return VAO;
		}

		static indexBuffer(out,aryUInt,isStatic){
			out.indBuffer = gl.createBuffer();
			rtn.indCount = aryUInt.length;
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, out.indBuffer );  
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, aryUInt, gl.STATIC_DRAW);

			return VAO;
		}

		static standardMesh(name,vertSize,aryVert,aryNorm,aryUV,aryInd,dMode,keepData){
			//TODO, Replace vert,nom,uv with floatArrayBuff calls
			//Maybe Object Holds an array of buffers
		}

		static finalize(out,name){
			gl.bindVertexArray(null);
			gl.bindBuffer(gl.ARRAY_BUFFER,null);
			if(out.indBuffer) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,null);
			fungi.Res.Meshes[name] = out;
		}
	}


	/*>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
	
	TODO, See if I can get rid of the RUN Func Building by just having
	runLimit and runFull then have this.run point to the correct run;

	<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<*/
	class RenderLoop{
		constructor(callback,fps){
			var oThis = this;
			this.msLastFrame	= null;		//The time in Miliseconds of the last frame.
			this.callBack		= callback;	//What function to call for each frame
			this.isActive		= false;	//Control the On/Off state of the render loop
			this.fps			= 0;		//Save the value of how fast the loop is going.
			this._frameCaller	= window;	//Normally we'll call window's requestAnimationFrame, but for VR we need to use its HMD reference for that call.

			if(fps != undefined && fps > 0){ //Build a run method that limits the framerate
				this.msFpsLimit = 1000/fps; //Calc how many milliseconds per frame in one second of time.
				this.run = function(){
					//Calculate Deltatime between frames and the FPS currently.
					var msCurrent	= performance.now(),
						msDelta		= (msCurrent - oThis.msLastFrame),
						deltaTime	= msDelta / 1000.0;		//What fraction of a single second is the delta time
					
					if(msDelta >= oThis.msFpsLimit){ //Now execute frame since the time has elapsed.
						oThis.fps			= Math.floor(1/deltaTime);
						oThis.msLastFrame	= msCurrent;
						oThis.callBack(deltaTime);
					}

					if(oThis.isActive) oThis._frameCaller.requestAnimationFrame(oThis.run);
				}
			}else{ //Else build a run method thats optimised as much as possible.
				this.run = function(){
					//Calculate Deltatime between frames and the FPS currently.
					var msCurrent	= performance.now(),	//Gives you the whole number of how many milliseconds since the dawn of time :)
						deltaTime	= (msCurrent - oThis.msLastFrame) / 1000.0;	//ms between frames, Then / by 1 second to get the fraction of a second.

					//Now execute frame since the time has elapsed.
					oThis.fps			= Math.floor(1/deltaTime); //Time it took to generate one frame, divide 1 by that to get how many frames in one second.
					oThis.msLastFrame	= msCurrent;

					oThis.callBack(deltaTime);
					if(oThis.isActive) oThis._frameCaller.requestAnimationFrame(oThis.run);
				}
			}
		}

		start(){
			this.isActive = true;
			this.msLastFrame = performance.now();
			this.frameCaller.requestAnimationFrame(this.run);
			return this;
		}

		stop(){ this.isActive = false; }

		setFrameCaller(fc){ this.frameCaller = fc; return this; }
	}


	/*>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
	Final Build
	<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<*/
	return{
		Init:Init, gl:null, Util:Util,
		
		//RESOURCE CACHE
		Res:{ Textures:[], Meshes:[], Videos:[], Images:[], Shaders:[], Ubo:[] },

		//MATH OBJECTS
		Maths:{ Vec3:Vec3, Quaternion:Quaternion, Matrix4:Matrix4 },

		//SHADERS
		Shaders:{ Builder:ShaderBuilder, Util:ShaderUtil, VAO:VAO, VBO:VBO },
		
		//TRANSFORM AND ITS EXTENTIONS
		Transform:Transform, Renderable:Renderable, Camera:Camera, LightSource:LightSource,

		//OTHER OBJECTS
		RenderLoop:RenderLoop,

		//.........................................
		//CONSTANTS
		ATTR_LOC_POSITION:0,
		ATTR_LOC_NORM:1,
		ATTR_LOC_UV:2
	};
})();