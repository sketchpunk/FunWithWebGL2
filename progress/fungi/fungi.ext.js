FungiExt = {};

FungiExt.Mesh = class{
	static triangleStrip(rLen,cLen,indAry,isLoop){ //isLoop ties the left to the right
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
					indAry.push(posB+cLen-1,0);
					iLen += cLen; //Make loop go overtime for one more row that connects the final row to the first.
					posA += cLen;
					posB = 0;
				}else if(i < iEnd){ //if not the end, then skip to next row
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

				switch(rotAxis){ /* https://www.siggraph.org/education/materials/HyperGraph/modeling/mod_tran/3drota.htm#Y-Axis%20Rotation*/
					case "y": ry = y; rx = z*cos - x*sin; rz = z*sin + x*cos; break;
					case "x": rx = x; ry = y*cos - z*sin; rz = y*sin + z*cos; break;
					case "z": rz = z; rx = x*cos - y*sin; ry = x*sin + y*cos; break;
				}
				outVert.push(rx,ry,rz);
			}
		}
	}

	static triangleStrip2(rLen,cLen,indAry,isLoop){ //isLoop ties the left to the right
		var iLen	= (rLen-1) * cLen,	//How many loops to process vertices
			lastCol	= cLen - 1,			//Index of Last col
			lastRow = rLen - 2,			//Index of last row that can be processed.
			total	= (rLen-1)*cLen*2 + (lastRow * 2);	//Total Index Length

		var r,c,posA,posB;
		for(var i=0; i < iLen; i++){
			r = Math.floor(i / cLen);	//Current Row
			c = i % cLen;				//Current Column
			posA = r * cLen + c;		//Top Row Pos
			posB = posA + cLen;			//Bottom Row Pos //(r+1) * cLen + c;

			indAry.push(posA,posB);

			//Create degenerate triangles, The last then the first index of the current bottom row.
			if(c == lastCol && r < lastRow){
				if(isLoop){
					posA = r*cLen;
					posB = posA + cLen;
					indAry.push(posA,posB,posB,posB);
					console.log("degenLoop", posA,posB,posB,posB);
				}else indAry.push(posB, posB-cLen+1);
			}
		}

		if(isLoop){
			indAry.push(r*cLen, r*cLen+cLen);	
		}
	}
}

FungiExt.DynamicMesh = class extends Fungi.Renderable{
	constructor(tVert,tIndex,matName){
		super({},matName);

		this.verts			= [];
		this.vertSize		= Float32Array.BYTES_PER_ELEMENT * 3 * tVert; //3Floats per vert
		this.vertOnGpu		= 0; //Keep Track of how much data was pushed to the GPU, If none was sent, dont try to delete on resize
		this.index 			= [];
		this.indexSize 		= Uint16Array.BYTES_PER_ELEMENT * tIndex;
		this.indexOnGpu		= 0; //Keep Track of how much data was pushed to the GPU, If none was sent, dont try to delete on resize
		this.drawMode		= Fungi.gl.LINE_STRIP;
		this.visible		= false;

		//Create VAO with a buffer a predefined size buffer to dynamicly dump data in.
		Fungi.Shaders.VAO.create(this.vao)
			.emptyFloatArrayBuffer(this.vao,"vert",this.vertSize,Fungi.ATTR_POSITION_LOC,3,0,0,false)
		if(tIndex > 0) Fungi.Shaders.VAO.emptyIndexBuffer(this.vao,"index",this.indexSize,false);
		Fungi.Shaders.VAO.finalize(this.vao,"FungiDynamicMesh");
	}

	draw(){
		if(this.vao.count > 0){
			Fungi.gl.bindVertexArray(this.vao.id);
			if(this.index.length > 0)	Fungi.gl.drawElements(this.drawMode, this.vao.count, Fungi.gl.UNSIGNED_SHORT, 0); 
			else						Fungi.gl.drawArrays(this.drawMode, 0, this.vao.count);
		}
	}

	clear(){
		this.verts.length = 0;
		this.index.length = 0;
		this.vao.count = 0;
		this.visible = false;
	}

	update(){
		//If there is no verts, set this to invisible to disable rendering.
		if(this.verts.length == 0){ this.visible = false; return this; }
		this.visible = true;

		//......................................
		//Push verts to GPU.
		//TODO : Should probably make a buffer object to handle creation, resizing, clearing and updating.
		var vsize = this.verts.length * Float32Array.BYTES_PER_ELEMENT;
		Fungi.gl.bindBuffer(Fungi.gl.ARRAY_BUFFER,this.vao.buffers["vert"].buf);
	
		if(vsize <= this.vertSize){
			Fungi.gl.bufferSubData(Fungi.gl.ARRAY_BUFFER, 0, new Float32Array(this.verts), 0, null);
		}else{
			this.vertSize = vsize;
			if(this.vertOnGpu > 0) Fungi.gl.bufferData(Fungi.gl.ARRAY_BUFFER, null, Fungi.gl.STATIC_DRAW); //Clean up previus data
			Fungi.gl.bufferData(Fungi.gl.ARRAY_BUFFER, new Float32Array(this.verts), Fungi.gl.STATIC_DRAW);
		}
		Fungi.gl.bindBuffer(Fungi.gl.ARRAY_BUFFER,null);
		this.vertOnGpu = this.verts.length;		

		//......................................
		//Push index to gpu
		if(this.index.length > 0){
			var isize = this.index.length * Uint16Array.BYTES_PER_ELEMENT;

			Fungi.gl.bindBuffer(Fungi.gl.ELEMENT_ARRAY_BUFFER, this.vao.buffers["index"].buf);  
			if(isize <= this.indexSize){
				Fungi.gl.bufferSubData(Fungi.gl.ELEMENT_ARRAY_BUFFER, 0, new Uint16Array(this.index), 0, null);
			}else{
				this.indexSize = isize;
				if(this.indexOnGpu > 0) Fungi.gl.bufferData(Fungi.gl.ELEMENT_ARRAY_BUFFER, null, Fungi.gl.STATIC_DRAW); //Clean up previus data
				Fungi.gl.bufferData(Fungi.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.index), Fungi.gl.STATIC_DRAW);
			}
			Fungi.gl.bindBuffer(Fungi.gl.ELEMENT_ARRAY_BUFFER,null);
			this.vao.count = this.index.length;
			this.indexOnGpu = this.index.length;
		}else this.vao.count = this.verts.length / 3;

		return this;
	}
}









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