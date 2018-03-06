/*NOTES
- Each primitive corresponds to one draw call

- Min/Max can be used to create the bound box.

- When a primitive's indices property is defined, it references the accessor to use for index data, and GL's drawElements function should be used. When the indices property is not defined, GL's drawArrays function should be used with a count equal to the count property of any of the accessors referenced by the attributes property (they are all equal for a given primitive).

- JavaScript client implementations should convert JSON-parsed floating-point doubles to single precision, when componentType is 5126 (FLOAT). This could be done with Math.fround function.

- The offset of an accessor into a bufferView (i.e., accessor.byteOffset) and the offset of an accessor into a buffer (i.e., accessor.byteOffset + bufferView.byteOffset) must be a multiple of the size of the accessor's component type.

- byteStride must be defined, when two or more accessors use the same bufferView.

- Each accessor must fit its bufferView, i.e., accessor.byteOffset + STRIDE * (accessor.count - 1) + SIZE_OF_ELEMENT must be less than or equal to bufferView.length.
*/
//https://github.com/KhronosGroup/glTF-Sample-Models/tree/master/2.0
//https://github.com/KhronosGroup/glTF/tree/master/specification/2.0
//https://github.com/aframevr/aframe/blob/master/docs/components/vive-controls.md
//https://raw.githubusercontent.com/javagl/JglTF/master/images/gltfOverview-0.2.0.png
//https://github.com/KhronosGroup/glTF-Blender-Exporter/issues/39
//https://github.com/godotengine/collada-exporter
//https://github.com/KhronosGroup/glTF-Blender-Exporter/issues

import Downloader	from "./Downloader.js";


//------------------------------------------------------------
// Downloader Handlers
//------------------------------------------------------------
Downloader.handlers["gltf"] = function(itm,dl = null){
	//Init Call
	if(dl == null){ Downloader.api.get(itm,"json"); return false; }

	//Final Call - Look through the buffer for bin files to download.
	for(var i=0; i < dl.buffers.length; i++){
		if(dl.buffers[i].uri.startsWith("data:")) continue;

		//Push bin file to download queue.
		Downloader.api.queueAdd({
			file:dl.buffers[i].uri,
			type:"gltf_bin",
			ref:dl.buffers[i]
		});
	}

	itm.dl = dl; //Save the data download to the item
	return true; //Save item to complete list.
};

Downloader.handlers["gltf_bin"] = function(itm,dl = null){
	//Init Call
	if(dl == null){ Downloader.api.get(itm,"arraybuffer"); return false; }

	//Final Call
	itm.ref.dView = new DataView(dl); //Create a dataview for arraybuffer.
	return false; //No need to save this item to complete list.
};


//------------------------------------------------------------
// GLTF Parser
//------------------------------------------------------------
class GLTFLoader{
	constructor(jsObj){
		this.json = jsObj;
		if(jsObj.skins) this.fixSkinData(); 

		//this.skeletons = [];	//
		//this.meshes = [];	// VAOs
		//this.nodes = [];	// Renderable, references back to mesh
	}

	get version(){ return this.json.asset.version; }


	//++++++++++++++++++++++++++++++++++++++
	// Parse data into something easier to use with fungi.
	//++++++++++++++++++++++++++++++++++++++
	parseMesh(idx){
		var m = this.json.meshes[idx];
		var meshName = m.name || "unnamed"
		//m.weights = for morph targets
		//m.name

		//p.attributes.TANGENT = vec4
		//p.attributes.TEXCOORD_1 = vec2
		//p.attributes.COLOR_0 = vec3 or vec4
		//p.material
		//p.targets = Morph Targets
		//console.log("Parse Mesh",meshName);
		//.....................................
		var p,			//Alias for primative element
			a,			//Alias for primative's attributes
			itm,
			mesh = [];

		for(var i=0; i < m.primitives.length; i++){
			p = m.primitives[i];
			a = p.attributes;

			itm = { 
				name: 		meshName + "_p" + i,
				mode:		(p.mode != undefined)? p.mode : GLTFLoader.MODE_TRIANGLES,
				indices:	null,	//p.indices
				vertices:	null,	//p.attributes.POSITION = vec3
				normals:	null,	//p.attributes.NORMAL = vec3
				texcoord:	null,	//p.attributes.TEXCOORD_0 = vec2
				joints: 	null,	//p.attributes.JOINTS_0 = vec4
				weights: 	null,	//p.attributes.WEIGHTS_0 = vec4
				armature: 	null
			};

			//Get Raw Data
			itm.vertices = this.processAccessor(a.POSITION);
			if(p.indices	!= undefined) 		itm.indices	= this.processAccessor(p.indices);
			if(a.NORMAL		!= undefined)		itm.normals	= this.processAccessor(a.NORMAL);
			if(a.WEIGHTS_0	!= undefined)		itm.weights	= this.processAccessor(a.WEIGHTS_0); 
			if(a.JOINTS_0	!= undefined)		itm.joints	= this.processAccessor(a.JOINTS_0); 

			//NOTE : Spec pretty much states that a mesh CAN be made of up multiple objects, but each
			//object in reality is just a mesh with its own vertices and attributes. So each PRIMITIVE
			//is just a single draw call. For fungi I'm not going to build objects like this when
			//I export from mesh, so the first primitive in the mesh is enough for me.

			//May change the approach down the line if there is a need to have a single mesh
			//to be made up of sub meshes.

			if(m.fSkinIdx !== undefined) itm.armature = this.parseSkin(m.fSkinIdx);

			return itm;
		}
	}

	//Armature / Skeleton
	parseSkin(idx){
		//Check if the skin has already processed skeleton info
		var i,s = this.json.skins[idx]; //skin reference
		
		//skeleton not processed, do it now.
		var stack = [],	//Queue
			final = [],	//Flat array of joints for skeleton
			n,			//Node reference 
			itm,		//popped queue tiem
			pIdx;		//parent index

		if(s.joints.indexOf(s.skeleton) != -1) stack.push([s.skeleton,null]); //Add Root bone Node Index, final index ofParent	
		else{
			var cAry = this.json.nodes[s.skeleton].children;
			for(var c=0; c < cAry.length; c++) stack.push([cAry[c],null]);
		}


		while(stack.length > 0){
			itm	= stack.pop();				//Pop off the list
			n 	= this.json.nodes[itm[0]];	//Get node info for joint

			if(n.isJoint != true) continue; //Check preprocessing to make sure its actually a used node.

			//Save copy of data : Ques? Are bones's joint number always in a linear fashion where parents have
			//a lower index then the children;
			final.push({
				jointNum 	: s.joints.indexOf(itm[0]),
				name 		: n.name || null, 
				position	: n.translation || null,
				scale		: n.scale || null,
				rotation	: n.rotation || null,
				matrix		: n.matrix || null,
				parent		: itm[1],
				nodeIdx 	: itm[0]
			});
			
			//Save the the final index for this joint for children reference 
			pIdx = final.length - 1;

			//Add children to stack
			if(n.children != undefined){
				for(i=0; i < n.children.length; i++) stack.push([n.children[i],pIdx]);
			}
		}

		//final.nodeIdx = s.skeleton; //Save root node index to make sure we dont process the same skeleton twice.
		return final;
	}


	//https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#animations
	parseAnimation(idx){
		/*
		NOTES: When Node isn't defined, ignore
		interpolation values include LINEAR, STEP, CATMULLROMSPLINE, and CUBICSPLINE.

		- Spec supports multiple Animations, each one with a possible name.
		- Channel links samples to nodes. Each channel links what property is getting changed.
		- Samples, Input & Output points to accessors which holds key frame data.
		--- Input is the Key Frame Times
		--- Output is the key frame value change, if sample is rotation, the output is a quat.

		"animations": [
			{	"name": "Animation1",
				"channels": [
                { "sampler": 0, "target": { "node": 2, "path": "translation" } },
                { "sampler": 1, "target": { "node": 2, "path": "rotation" } },
                { "sampler": 2, "target": { "node": 2, "path": "scale" } }
            ],

            "samplers": [
                { "input": 5, "interpolation": "LINEAR", "output": 6 },
                { "input": 5, "interpolation": "LINEAR", "output": 7 },
                { "input": 5, "interpolation": "LINEAR", "output": 8 }
            ]
        },
	

		++++++++++++++++++++++++++++++++++++++++++++++
        Data Exported as the following structure
		{
			name:"",
			items:[
				joint1:{
					translation:{interp,samples},
					scale:{interp,samples},
					rotation:{
						interp:"LINEAR",
						samples:[
							{t:0.25,v:array}
							{t:1.80,v:array}
						]
					}
				}
			]
		}

		*/
		//............................

		var anim = this.json.animations;
		if(anim === undefined || anim.length == 0){ console.log("There is no animations in gltf"); return null; }

		var rtn = {},
			i,ii,
			joint,
			nPtr, //node ptr
			sPtr, //sample ptr
			chPtr, //channel ptr
			tData, //Time data for keyframes
			vData; //Value data for keyframes

		//Save the name
		rtn.name = (anim[idx].name !== undefined)? anim[idx].name : "anim" + idx;
		rtn.items = [];

		//Process Channels and Samples.
		for(var ich=0; ich < anim[idx].channels.length; ich++){
			//.......................
			//Make sure we have a target
			chPtr = anim[idx].channels[ich];
			if(chPtr.target.node == undefined) continue;

			//.......................
			//Make sure node points to a joint with a name.
			nPtr = this.json.nodes[ chPtr.target.node ];
			if(nPtr.isJoint != true || nPtr.name === undefined){
				console.log("node is not a joint or doesn't have a name");
				continue;
			}

			//.......................
			//Get sample data
			sPtr	= anim[idx].samplers[ chPtr.sampler ];
			tData	= this.processAccessor(sPtr.input); //Get Time for all keyframes
			vData	= this.processAccessor(sPtr.output) //Get Value that changes per keyframe
			//console.log(tData); console.log(vData);
			//.......................
			if(!rtn.items[nPtr.name]) 	joint = rtn.items[nPtr.name] = {};
			else 						joint = rtn.items[nPtr.name];

			var samples = [];
			joint[chPtr.target.path] = { interp:sPtr.interpolation, samples:samples };


			for(i=0; i < tData.count; i++){
				ii = i * vData.compLen;
				samples.push({ t:tData.data[i], v:vData.data.slice(ii,ii+vData.compLen) });
			}
		}
		return rtn;
	}


	//++++++++++++++++++++++++++++++++++++++
	// Fix up issues with the data / spec to make it easier to parse data as single assets.
	//++++++++++++++++++++++++++++++++++++++
	//Go through Skins and make all nodes as joints for later processing.
	//Joint data never exports well, there is usually garbage. Documentation
	//Suggests that developer pre process nodes to make them as joints and
	//it does help weed out bad data
	fixSkinData(){
		var complete = [],			//list of skeleton root nodes, prevent prcessing duplicate data that can exist in file
			s = this.json.skins,	//alias for skins
			j,						//loop index
			n;						//Node Ref

		for(var i=0; i < s.length; i++){
			if( complete.indexOf(s[i].skeleton) != -1) continue; //If already processed, go to next skin

			//Loop through all specified joints and mark the nodes as joints.
			for(j in s[i].joints){
				n = this.json.nodes[ s[i].joints[j] ];
				n.isJoint = true;
				if(n.name === undefined || n.name == "") n.name = "joint" + j; //Need name to help tie animates to joints
			}

			complete.push(s[i].skeleton); //push root node index to complete list.
		}

		this.linkSkinToMesh(); //Since we have skin data, Link Mesh to skin for easy parsing.
	}

	//Skin is only reference to a mesh through a scene node (dont like this)
	//So interate threw all the nodes looking for those links, then save the
	linkSkinToMesh(){
		var rNodes = this.json.scenes[0].nodes,
			nStack = [],
			node,
			idx,
			i;

		//Setup Initial Stack
		for(i=0; i < rNodes.length; i++) nStack.push( rNodes[i] );

		//Process Stack of nodes, check for children to add to stack
		while(nStack.length > 0){
			idx = nStack.pop();
			node = this.json.nodes[idx];

			//Create a new property on the mesh object that has the skin index.
			if(node.mesh != undefined && node.skin != undefined)
				this.json.meshes[node.mesh]["fSkinIdx"] = node.skin;

			//Add More Nodes to the stack
			if(node.children != undefined)
				for(i=0; i < node.children.length; i++) nStack.push(node.children[i]);
		}
	}


	//++++++++++++++++++++++++++++++++++++++
	// Helper functions to help parse vertex data / attributes.
	//++++++++++++++++++++++++++++++++++++++
	//Decodes the binary buffer data into a Type Array that is webgl friendly.
	processAccessor(idx){

		var acc 	= this.json.accessors[idx],
			bView 	= this.json.bufferViews[ acc.bufferView ],
			buf		= this.prepareBuffer(bView.buffer),			// Buffer Data decodes into a ArrayBuffer/DataView
			TAry	= null,									// Type Array Ref
			DFunc	= null;

		//Figure out which Type Array we need to save the data in
		switch(acc.componentType){
			case GLTFLoader.TYPE_FLOAT:				TAry = Float32Array;	DFunc = "getFloat32"; break;
			case GLTFLoader.TYPE_SHORT:				TAry = Int16Array;		DFunc = "getInt16"; break;
			case GLTFLoader.TYPE_UNSIGNED_SHORT:	TAry = Uint16Array;		DFunc = "getUint16"; break;
			case GLTFLoader.TYPE_UNSIGNED_INT:		TAry = Uint32Array;		DFunc = "getUint32"; break;
			case GLTFLoader.TYPE_UNSIGNED_BYTE: 	TAry = Uint8Array; 		DFunc = "getUint8"; break;

			default: console.log("ERROR processAccessor","componentType unknown",a.componentType); return null; break;
		}


		var ary = null;
		if(bView.byteStride){
			var stride	= bView.byteStride,					// Stride Length in bites
				elmCnt	= acc.count, 						// How many stride elements exist.
				bOffset	= (bView.byteOffset || 0), 			// Buffer Offset
				sOffset	= (acc.byteOffset || 0),			// Stride Offset
				bPer	= TAry.BYTES_PER_ELEMENT,			// How many bytes to make one value of the data type
				compLen	= GLTFLoader["COMP_" + acc.type],	// How many values make up a single attributes
				aLen	= elmCnt * compLen,					// How many "floats/ints" need for this array
				p = 0, j = 0, k = 0;

			ary	= new TAry(aLen);			//Final Array

			//Loop for each element of by stride
			for(var i=0; i < elmCnt; i++){
				p = bOffset + ( stride * i ) + sOffset;	//Calc Starting position for the stride of data

				//Then loop by compLen to grab stuff out of the DataView and into the Typed Array
				for(j=0; j < compLen; j++) ary[k++] = buf.dView[DFunc]( p + (j * bPer) , true );
			}
		}else{
			//https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#data-alignment
			//TArray example from documentation works pretty well for data that is not interleaved.
			var bOffset	= (acc.byteOffset || 0) + (bView.byteOffset || 0);	//Starting point for reading.
			ary = new TAry(buf.dView.buffer, bOffset, acc.count);
		}

		return { data:ary, max:acc.max, min:acc.min, count:acc.count, compLen:GLTFLoader["COMP_"+acc.type] };

/*
				console.log("acc",acc);
		console.log("bView",bView);
		console.log("buf",buf);
		console.log(TAry,DFunc,bOffset);

		console.log("+++++++++++++++++++++++++++++++++++");

		

		var	a = this.json.accessors[idx],								//Accessor Alias Ref
			bView = this.json.bufferViews[ a.bufferView ],				//bufferView Ref
			
			buf		= this.prepareBuffer(bView.buffer),					//Buffer Data decodes into a ArrayBuffer/DataView
			bOffset	= (a.byteOffset || 0) + (bView.byteOffset || 0),	//Starting point for reading.
			bLen 	= 0,//a.count,//bView.byteLength,									//Byte Length for this Accessor

			TAry = null,												//Type Array Ref
			DFunc = null;												//DateView Function name

		//Figure out which Type Array we need to save the data in
		switch(a.componentType){
			case GLTFLoader.TYPE_FLOAT:				TAry = Float32Array;	DFunc = "getFloat32"; break;
			case GLTFLoader.TYPE_SHORT:				TAry = Int16Array;		DFunc = "getInt16"; break;
			case GLTFLoader.TYPE_UNSIGNED_SHORT:	TAry = Uint16Array;		DFunc = "getUint16"; break;
			case GLTFLoader.TYPE_UNSIGNED_INT:		TAry = Uint32Array;		DFunc = "getUint32"; break;
			case GLTFLoader.TYPE_UNSIGNED_BYTE: 	TAry = Uint8Array; 		DFunc = "getUint8"; break;

			default: console.log("ERROR processAccessor","componentType unknown",a.componentType); return null; break;
		}
console.log("-----------------------------------");
console.log("Accessor",idx,a);
console.log(DFunc,a.componentType,a.type);
console.log(bView);

		//When more then one accessor shares a buffer, The BufferView length is the whole section
		//but that won't work, so you need to calc the partition size of that whole chunk of data
		//The math in the spec about stride doesn't seem to work, it goes over bounds, what Im using works.
		//https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#data-alignment
		if(bView.byteStride != undefined)	bLen = bView.byteStride * a.count;
		else 								bLen = a.count * GLTFLoader["COMP_"+a.type] * TAry.BYTES_PER_ELEMENT; //elmCnt * compCnt * compByteSize)
console.log("bLen", bLen, "bOffset", bOffset);
		//Pull the data out of the dataView based on the Type.
		var bPer	= TAry.BYTES_PER_ELEMENT,	//How many Bytes needed to make a single element
			aLen	= bLen / bPer,				//Final Array Length
			ary		= new TAry(aLen),			//Final Array
			p		= 0;						//Starting position in DataView

console.log("bPer", bPer, "aLen", aLen);

		for(var i=0; i < aLen; i++){
			p = bOffset + i * bPer;
			ary[i] = buf.dView[DFunc](p,true);
		}
console.log("+++++++++++++++++++++++++++++++++++");
		//console.log(a.type,GLTFLoader["COMP_"+a.type],"offset",bOffset, "bLen",bLen, "aLen", aLen, ary);
		return { data:ary, max:a.max, min:a.min, count:a.count, compLen:GLTFLoader["COMP_"+a.type] };
		*/
	}

	//Get the buffer data ready to be parsed threw by the Accessor
	prepareBuffer(idx){
		var buf = this.json.buffers[idx];
		if(buf.dView != undefined) return buf;

		if(buf.uri.substr(0,5) != "data:"){
			//TODO Get Bin File
			return buf;
		}

		//Create and Fill DataView with buffer data
		var pos		= buf.uri.indexOf("base64,") + 7,
			blob	= window.atob(buf.uri.substr(pos)),
			dv		= new DataView( new ArrayBuffer(blob.length) );
		for(var i=0; i < blob.length; i++) dv.setUint8(i,blob.charCodeAt(i));
		buf.dView = dv;

		//console.log("buffer len",buf.byteLength,dv.byteLength);
		//var fAry = new Float32Array(blob.length/4);
		//for(var j=0; j < fAry.length; j++) fAry[j] = dv.getFloat32(j*4,true);
		//console.log(fAry);
		return buf;
	}


	/* OLD FUNCTIONALITY, MAY NO LONGER NEED IT DOWN THE LINE
		load(jsObj,processNow){
			this.json = jsObj;

			if(this.json.skins) this.fixSkinData(); //Skin Data need to be fixed up.

			//if(processNow == true) this.processScene(); TODO, REMOVE THIS AND PARAM AT SOME POINT
			return this;
		}


		loadFromDom(elmID,processNow){
			//TODO: Validation of element, text and json parsing.
			var txt = document.getElementById(elmID).text;
			this.json = JSON.parse(txt);

			if(processNow == true) this.processScene();

			return this;
		}


		processScene(sceneNum){
			//TODO process skin first to mark nodes as joints since spec does not
			//https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#skins

			if(sceneNum == undefined) sceneNum = 0; //If not specify, get first scene
			if(this.json.scenes[sceneNum].nodes.length == 0) return;

			var sceneNodes = this.json.scenes[sceneNum].nodes,
				nStack = [],
				node,
				idx,
				i;

			//Setup Initial Stack
			for(i=0; i < sceneNodes.length; i++) nStack.push( sceneNodes[i] );
			
			//Process Stack of nodes, check for children to add to stack
			while(nStack.length > 0){
				idx = nStack.pop();
				node = this.json.nodes[idx];

				//Add More Nodes to the stack
				if(node.children != undefined)
					for(i=0; i < node.children.length; i++) nStack.push(node.children[i]);

				this.processNode( idx );
			}
		}


		//
		processNode(idx){
			var n = this.json.nodes[idx];
			//n.children = [nodeIndex,nodeIndex,etc]
			//n.skin = Defines skeleton
			//n.weights

			//TODO - Need to handle Node Heirarchy
			//if there is n.camera, its a camera.
			//if there is no camera or mesh, then its an empty that may get a mesh node as a child.

			//Handle Mesh
			if(n.mesh != undefined){
				var m = {
					name: 		(n.name)? n.name : "untitled",
					rotate:		n.rotation || null,
					scale:		n.scale || null,
					position:	n.translation || null,
					matrix:		n.matrix || null,
					meshes:		this.processMesh(n.mesh)
				};

				if(n.skin != undefined) m.skeleton = this.processSkin(n.skin);

				this.nodes.push(m);
			}
		}


		//TODO Make sure not to process the same mesh twice incase different nodes reference same mesh data.
		processMesh(idx){
			var m = this.json.meshes[idx];
			var meshName = m.name || "unnamed"
			//m.weights = for morph targets
			//m.name

			//p.attributes.TANGENT = vec4
			//p.attributes.TEXCOORD_1 = vec2
			//p.attributes.COLOR_0 = vec3 or vec4
			//p.material
			//p.targets = Morph Targets

			//.....................................
			var p,			//Alias for primative element
				a,			//Alias for primative's attributes
				itm,
				mesh = [];

			for(var i=0; i < m.primitives.length; i++){
				p = m.primitives[i];
				a = p.attributes;

				itm = { 
					name: 		meshName + "_p" + i,
					mode:		(p.mode != undefined)? p.mode : GLTFLoader.MODE_TRIANGLES,
					indices:	null,	//p.indices
					vertices:	null,	//p.attributes.POSITION = vec3
					normals:	null,	//p.attributes.NORMAL = vec3
					texcoord:	null,	//p.attributes.TEXCOORD_0 = vec2
					joints: 	null,	//p.attributes.JOINTS_0 = vec4
					weights: 	null	//p.attributes.WEIGHTS_0 = vec4
				};

				//Get Raw Data
				itm.vertices = this.processAccessor(a.POSITION);
				if(p.indices != undefined) 		itm.indices	= this.processAccessor(p.indices);
				if(a.NORMAL != undefined)		itm.normals	= this.processAccessor(a.NORMAL);
				if(a.WEIGHTS_0 != undefined)	itm.weights	= this.processAccessor(a.WEIGHTS_0);
				if(a.JOINTS_0 != undefined)		itm.joints	= this.processAccessor(a.JOINTS_0);

				//Save Data
				this.meshes.push(itm);				//Each Primitive is its own draw call, so its really just a mesh
				mesh.push(this.meshes.length-1);	//Save index to new mesh so nodes can reference the mesh
			}

			return mesh;
		}



		processSkin(idx){
			//Check if the skin has already processed skeleton info
			var i,s = this.json.skins[idx]; //skin reference
			

			for(i=0; i < this.skeletons.length; i++){
				if(this.skeletons[i].nodeIdx == s.skeleton) return i; //Find a root bone that matches the skin's.
			}
			console.log("ProcessSkin",idx, s.skeleton, this.skeletons.length);

			//skeleton not processed, do it now.
			var stack = [],	//Queue
				final = [],	//Flat array of joints for skeleton
				n,		//Node reference 
				itm,	//popped queue tiem
				pIdx;	//parent index

			if(s.joints.indexOf(s.skeleton) != -1){
				stack.push([s.skeleton,null]); //Add Root bone Node Index, final index ofParent	
			}else{
				var cAry = this.json.nodes[s.skeleton].children;
				for(var c=0; c < cAry.length; c++){
					stack.push([cAry[c],null]);
				}
			}
			

			while(stack.length > 0){
				itm	= stack.pop();				//Pop off the list
				n 	= this.json.nodes[itm[0]];	//Get node info for joint

				if(n.isJoint != true) continue; //Check preprocessing to make sure its actually a used node.

				//Save copy of data : Ques? Are bones's joint number always in a linear fashion where parents have
				//a lower index then the children;
				final.push({
					jointNum 	: s.joints.indexOf(itm[0]),
					name 		: n.name || null, 
					position	: n.translation || null,
					scale		: n.scale || null,
					rotation	: n.rotation || null,
					matrix		: n.matrix || null,
					parent		: itm[1],
					nodeIdx 	: itm[0]
				});
				

				//Save the the final index for this joint for children reference 
				pIdx = final.length - 1;

				//Add children to stack
				if(n.children != undefined){
					for(i=0; i < n.children.length; i++) stack.push([n.children[i],pIdx]);
				}
			}

			final.nodeIdx = s.skeleton; //Save root node index to make sure we dont process the same skeleton twice.
			this.skeletons.push(final);
			return this.skeletons.length - 1;
		}
	*/
}


//------------------------------------------------------------
// CONSTANTS
//------------------------------------------------------------
GLTFLoader.MODE_POINTS 			= 0;	//Mode Constants for GLTF and WebGL are identical
GLTFLoader.MODE_LINES			= 1;	//https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Constants
GLTFLoader.MODE_LINE_LOOP		= 2;
GLTFLoader.MODE_LINE_STRIP		= 3;
GLTFLoader.MODE_TRIANGLES		= 4;
GLTFLoader.MODE_TRIANGLE_STRIP	= 5;
GLTFLoader.MODE_TRIANGLE_FAN	= 6;

GLTFLoader.TYPE_BYTE			= 5120;
GLTFLoader.TYPE_UNSIGNED_BYTE	= 5121;
GLTFLoader.TYPE_SHORT			= 5122;
GLTFLoader.TYPE_UNSIGNED_SHORT	= 5123;
GLTFLoader.TYPE_UNSIGNED_INT	= 5125;
GLTFLoader.TYPE_FLOAT			= 5126;

GLTFLoader.COMP_SCALAR			= 1;
GLTFLoader.COMP_VEC2			= 2;
GLTFLoader.COMP_VEC3			= 3;
GLTFLoader.COMP_VEC4			= 4;
GLTFLoader.COMP_MAT2			= 4;
GLTFLoader.COMP_MAT3			= 9;
GLTFLoader.COMP_MAT4			= 16;

//------------------------------------------------------------
// Export
//------------------------------------------------------------
export default GLTFLoader;