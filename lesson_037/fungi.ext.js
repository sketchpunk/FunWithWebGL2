FungiExt = {};

FungiExt.Mesh = class{
	static triangleStrip(rLen,cLen,indAry,isLoop,doClose){ //isLoop ties the left to the right, doClose is for paths that are closed shapes like a square
		var iLen = (rLen-1) * cLen,		//How many indexes do we need
			iEnd = (cLen*(rLen-1))-1,	//What the final index for triangle strip
			iCol = cLen - 1,			//Index of Last col
			posA = 0,					//Top Index
			posB = posA + cLen,			//Bottom Index
			c = 0;						//Current Column : 0 to iCol

		for(var i=0; i < iLen; i++){
			c = i % cLen;
			indAry.push(posA+c,posB+c);

			//Create degenerate triangles, The last then the first index of the current bottom row.
			if(c == iCol){
				if(i == iEnd && isLoop == true){
					if(doClose == true) indAry.push(posA,posB);
					indAry.push(posB+cLen-1,posB);
					iLen += cLen; //Make loop go overtime for one more row that connects the final row to the first.
					posA += cLen;
					posB = 0;
				}else if(i >= iEnd && doClose == true){
					indAry.push(posA,posB);
				}else if(i < iEnd){ //if not the end, then skip to next row
					if(doClose == true) indAry.push(posA,posB);
					indAry.push(posB+cLen-1, posB);
					posA += cLen;
					posB += cLen;
				}
			}
		}
	}

	static lathe(pathAry,steps,rotAxis,outVert){
		var len = pathAry.length,		//Length of Vertices array
			origin = Math.PI/-2,		//Starting Rotation Angle
			inc = (Math.PI*2) / steps,	//360 divided in increments
			rad = 0,					//Rotation Angle in radians
			sin,cos,					//Trig values of the radian angle
			x,z,y,						//Pre Rotation Values
			rx,ry,rz,					//New Rotation Values
			v;							//Index of the vert array

		//Loop through how many divisions we're making
		for(var i=0; i < steps; i++){
			rad = origin + (inc*i);
			cos = Math.cos(rad);
			sin = Math.sin(rad);

			//Now rotate all the verts in the path to the new angle
			//then add it to our final vert array.
			for(v = 0; v < len; v+=3){
				x = pathAry[v];
				y = pathAry[v+1];
				z = pathAry[v+2];

				switch(rotAxis){ // https://www.siggraph.org/education/materials/HyperGraph/modeling/mod_tran/3drota.htm#Y-Axis%20Rotation
					case "y": ry = y; rx = z*sin + x*cos; rz = z*cos - x*sin; break;
					case "x": rx = x; ry = y*cos - z*sin; rz = y*sin + z*cos; break;
					case "z": rz = z; rx = x*cos - y*sin; ry = x*sin + y*cos; break;
				}
				outVert.push(rx,ry,rz);
			}
		}
	}

	static vertexOffset(ary,aryOffset){
		var oLen = aryOffset.length;
		for(var i=0; i < ary.length; i++) ary[i] += aryOffset[i%oLen];
	}

	static triangulateTriStrip(aVert,aIndex,out){ //Used mostly to wireframe a mesh that is setup in a traingle strip pattern.
		//console.log(aIndex);
		var j,bi,qi,skip,
			ind = [0,0,0,0];
		for(var i=0; i < aIndex.length-2; i+=2){
			if(aIndex[i+1] == aIndex[i+2]) continue; //Skip degenerate triangles
			
			//console.log("xxxx",aIndex[i],aIndex[i+1],aIndex[i+2],aIndex[i+3]);

			//Tri-Strip has a upside down N like shape, swop 2 & 3 to make it a square shape
			ind[0] = aIndex[i];
			ind[1] = aIndex[i+1];
			ind[3] = aIndex[i+2];
			ind[2] = aIndex[i+3];
			skip = false;			//Reset skip var
			bi = 0;					//Reset barycentric index

			//loop quat pattern 0,1,2 - 2,3,0
			for(j=0; j <= 4; j++){		//Loop quad path
				if(j == 3 && !skip){	//Begin Second Triangle
					skip = true;
					bi = 0;
					j--;
				}

				qi = (j!=4)?j:0;		//What quad index are we on.
				p = ind[qi]*3;			//Get starting index of float vertice.

				//console.log(qi,p);
				//console.log(aVert[p],aVert[p+1],aVert[p+2]);
				out.push(aVert[p],aVert[p+1],aVert[p+2],bi);
				//var p = (i + j) * 3
				bi++;
			}
			//console.log(aIndex[i],aIndex[i+1],aIndex[i+3],aIndex[i+2]);
		}
	}
}



FungiExt.DynamicMesh = class extends Fungi.Renderable{
	constructor(tVertComp,tVert,tIndex,matName){
		super({},matName);

		this.verts		= GLBuffer.float(null,tVertComp,tVert);
		this.drawMode	= Fungi.gl.LINE_STRIP;
		this.visible	= false;

		//Create VAO with a buffer a predefined size buffer to dynamicly dump data in.
		Fungi.Shaders.VAO.create(this.vao)
			.emptyFloatArrayBuffer(this.vao,"vert",this.verts.getBufferSize(),Fungi.ATTR_POSITION_LOC,tVertComp,0,0,false)
		
		if(tIndex > 0){
			this.index 	= GLBuffer.element(null,1,tIndex);
			Fungi.Shaders.VAO.emptyIndexBuffer(this.vao,"index",this.index.getBufferSize(),false);
			this.index.setRef(this.vao.buffers["index"].buf);
		}
		
		Fungi.Shaders.VAO.finalize(this.vao,"FungiDynamicMesh");
		this.verts.setRef(this.vao.buffers["vert"].buf);
	}

	draw(){
		if(this.vao.count > 0){
			Fungi.gl.bindVertexArray(this.vao.id);
			if( this.index != undefined && this.index.data.length > 0)
				Fungi.gl.drawElements(this.drawMode, this.vao.count, Fungi.gl.UNSIGNED_SHORT, 0); 
			else
				Fungi.gl.drawArrays(this.drawMode, 0, this.vao.count);
		}
	}

	clear(){
		this.vao.count = 0;
		this.visible = false;
	}

	update(){
		if(this.verts.data.length == 0){ this.visible = false; return this; }
		this.visible = true;

		this.verts.update();

		if( this.index != undefined && this.index.data.length > 0){
			this.index.update();
			this.vao.count = this.index.getComponentCnt();
		}else this.vao.count = this.verts.getComponentCnt();

		return this;
	}
}

function GLBuffer(){
	var mGLArray = null, //UInt16Array;
		mBufferRef = null,
		mBufferSize = 0, //mGLArray.BYTES_PER_ELEMENT * componentLength * startSize,
		mBufferSizeUsed = 0,
		mBufferType = Fungi.gl.ARRAY_BUFFER,
		mComponentLength = 3,
		mAry = [];

	return {
		data:mAry,

		getBufferSize:function(){ return mBufferSize; },
		getComponentCnt:function(){ return mAry.length / mComponentLength; },	//for example, how many vertices in the array

		setRef:function(ref){ mBufferRef = ref; return this; },
		setup:function(bufRef,bufType,aryType,comLen,startSize){
			mGLArray = aryType;
			mComponentLength = comLen;
			mBufferRef = bufRef;
			mBufferType = bufType;
			mBufferSize = mGLArray.BYTES_PER_ELEMENT * mComponentLength * startSize;

			return this;
		},

		update:function(){
			var pushSize = mAry.length * mGLArray.BYTES_PER_ELEMENT;
			Fungi.gl.bindBuffer(mBufferType,mBufferRef);

			//If data being push fits the existing buffer, send it up
			if(pushSize <= mBufferSize) Fungi.gl.bufferSubData(mBufferType, 0, new mGLArray(mAry), 0, null);
			else{ //if not, we need to wipe out the data and resize the buffer with the new set of data.
				mBufferSize = pushSize;
				if(mBufferSizeUsed > 0) Fungi.gl.bufferData(mBufferType, null, Fungi.gl.DYNAMIC_DRAW); //Clean up previus data
				Fungi.gl.bufferData(mBufferType, new mGLArray(mAry), Fungi.gl.DYNAMIC_DRAW);
			}

			Fungi.gl.bindBuffer(mBufferType,null); //unbind buffer
			mBufferSizeUsed = mAry.length;	
		}
	};
}

GLBuffer.float = function(bufRef,comLen,startSize){ return GLBuffer().setup(bufRef,Fungi.gl.ARRAY_BUFFER,Float32Array,comLen,startSize); }
GLBuffer.element = function(bufRef,startSize){ return GLBuffer().setup(bufRef,Fungi.gl.ELEMENT_ARRAY_BUFFER,Uint16Array,1,startSize); }





//https://www.youtube.com/watch?v=aQiWF4E8flQ

//Built quick sort function based on the explaination from a youtube video
//Need to update the function to handle the ability to pass in a compare function
//to allow to do custom comparisons. Thinking about using this to help sort
//objects in a scene to render them more efficiently.

function quickSort(ary){
	var partition = [{start:0,end:ary.length-1}],
		pos,		//Current position of the partition
		pivot,		//Main Item to use to compare with the other items
		i,			//For loop, reuse variable
		tmp,		//tmp var to hold item when swopping them in the array
		posStart;	//save starting pos to help partition the current partition

	while(partition.length > 0){
		pos = partition.pop();	//Get a partition to process.
		posStart = pos.start;
		pivot = ary[pos.end];
		
		for(i = pos.start; i < pos.end; i++){
			//Swop the current item with the start item, then move the start position up.
			if(ary[i] <= pivot){
				tmp = ary[i];
				ary[i] = ary[pos.start];
				ary[pos.start] = tmp;
				pos.start++;
			}
		}

		//Now move the first item to the end then save the pivot to the start position
		//Because everything before the new start position should be less then the pivot.
		ary[pos.end] = ary[pos.start];
		ary[pos.start] = pivot;

		//Determine if can divide the current partition into sub partitions.
		if(posStart < pos.start-1)	partition.push( {start:posStart,end:pos.start-1} );	//Left Partition
		if(pos.start+1 < pos.end)	partition.push( {start:pos.start+1,end:pos.end} );	//Right Partition
	}
}