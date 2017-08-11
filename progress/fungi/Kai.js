var Kai = (function(){
	var comLen = 4,		//Floats Values per Vertex
		pathVertCnt = 4,	//How many verts per path.
		pathFCnt = comLen * pathVertCnt;

	function GetVert(i,src,out){
		var p = i * comLen;
		out[0] = src[p];
		out[1] = src[p+1];
		out[2] = src[p+2];
	}

	//Extrude --------------------------------------
	function Extrude(dir,ind,out){
		var p,idx = (out.length)/comLen;

		for(var i=0; i < ind.length; i++){
			p = ind[i] * comLen;
			out.push(
				out[p]		+ dir[0],
				out[p+1]	+ dir[1],
				out[p+2]	+ dir[2],
				out[p+3]
			);		
		}
		return [idx,idx+1,idx+2,idx+3]
	}

	function ExtrudeBranch(iAry,out){
		var p = q = 0;
			x = y = z = 0;

		//.....................................
		//Figure out Direction
		var dir = [0,0,0];
		quadCenterPos(iAry,out,dir);
		dir[1] = 0; //Ditch Y for now
		norm(dir);

		//.....................................
		//Loop threw Quad Index Points
		var ind = out.length / comLen;
		for(q=0; q < comLen; q++){
			p = iAry[q] * comLen;
			out.push(
				out[p]		+ dir[0],
				out[p+1]	+ dir[1],
				out[p+2]	+ dir[2],
				out[p+3]
			);						
		}

		return [ind,ind+1,ind+2,ind+3];
	}

	//Scale ----------------------------------------
	function Scale(iAry,s,src){
		var p;
		for(var i=0; i < iAry.length; i++){
			p = iAry[i] * comLen;
			src[p]		*= s[0];
			src[p+1]	*= s[1];
			src[p+2]	*= s[2];
		}
	}

	function ScaleCenter(iAry,s,src){
		var c = [0,0,0];
		Kai.QuadCenterPos(iAry,src,c);

		for(var i=0; i < iAry.length; i++){
			p = iAry[i] * comLen;
			src[p]		= ((src[p+0] - c[0]) * s) + c[0];
			src[p+1]	= ((src[p+1] - c[1]) * s) + c[1];
			src[p+2]	= ((src[p+2] - c[2]) * s) + c[2];
		}
	}

	//Rotation -------------------------------------
	function Rot(iAry,rad,axis,src){
		var cos = Math.cos(rad),
			sin = Math.sin(rad),
			x,y,z,rx,ry,rz;

		var p;
		for(var i=0; i < iAry.length; i++){
			p = iAry[i] * comLen;
			x = src[p];
			y = src[p+1];
			z = src[p+2];

			switch(axis){
				case "y": ry = y; rx = z*sin + x*cos; rz = z*cos - x*sin; break;
				case "x": rx = x; ry = y*cos - z*sin; rz = y*sin + z*cos; break;
				case "z": rz = z; rx = x*cos - y*sin; ry = x*sin + y*cos; break;
			}

			src[p]		= rx;
			src[p+1]	= ry;
			src[p+2]	= rz;
		}
	}

	function qRot(rad,iAry,src){
		var p0 = iAry[0] * 4,
			p1 = iAry[3] * 4;
		var v1 = [ src[p1] - src[p0], src[p1+1] - src[p0+1], src[p1+2] - src[p0+2] ];
		Kai.Norm(v1);
		var q = new Fungi.Maths.Quaternion();
		q.setAxisAngle(v1, rad);

		var ary = [0,0,0];

		for(var i=0; i < iAry.length; i++){
			p = iAry[i] * comLen;
			ary[0] = src[p];
			ary[1] = src[p+1];
			ary[2] = src[p+2];
			
			Fungi.Maths.Quaternion.rotateVec3(q,ary);

			src[p]		= ary[0];
			src[p+1]	= ary[1];
			src[p+2]	= ary[2];
		}
	}

	function qRotCenter(rad,iAry,src){
		var c = [0,0,0];
		Kai.QuadCenterPos(iAry,src,c);

		var p0 = iAry[0] * comLen,
			p1 = iAry[3] * comLen;
		var v1 = [ src[p1] - src[p0], src[p1+1] - src[p0+1], src[p1+2] - src[p0+2] ];
		Kai.Norm(v1);
		
		var q = new Fungi.Maths.Quaternion();
		q.setAxisAngle(v1, rad);

		var ary = [0,0,0];

		for(var i=0; i < iAry.length; i++){
			p = iAry[i] * 4;
			ary[0] = src[p] - c[0];
			ary[1] = src[p+1] - c[1];
			ary[2] = src[p+2] - c[2];
			
			Fungi.Maths.Quaternion.rotateVec3(q,ary);

			src[p]		= ary[0] + c[0];
			src[p+1]	= ary[1] + c[1];
			src[p+2]	= ary[2] + c[2];
		}
	}


	//Triangle Faces ------------------------------
	function TriQuad(iAry,out){ out.push(iAry[0],iAry[1],iAry[2],iAry[2],iAry[3],iAry[0]); }

	function TriWall(iAryA,iAryB,out,mkHole,brOut){
		var a,b,c,d,p;

		for(var i=0; i < pathVertCnt; i++){
			p = (i+1)%pathVertCnt;
			a = iAryB[i],
			b = iAryA[i],
			c = iAryA[p],
			d = iAryB[p];
			//console.log(a,b,c,c,d,a,"--",i,p);

			if(mkHole == -1 || p%2 != mkHole) out.push(a,b,c,c,d,a); //a=a; // 
			else brOut.push([a,b,c,d]);
		}
	}


	//Math ----------------------------------------
	function Rnd(min,max){ return min + (Math.random() * (max-min)); }

	function QuadCrossProd(iAry,src,out,s){
		var p0 = iAry[0] * comLen,
			p1 = iAry[1] * comLen,
			p3 = iAry[3] * comLen;

		var v1 = [ src[p1] - src[p0], src[p1+1] - src[p0+1], src[p1+2] - src[p0+2] ],
			v2 = [ src[p3] - src[p0], src[p3+1] - src[p0+1], src[p3+2] - src[p0+2] ],
			cp = [0, 0, 0];
		
		Fungi.Maths.Vec3.cross(v1,v2,out);
		Norm(out,s);
	}

	function QuadCenterPos(ind,src,out){
		var x = y = z = 0;

		for(var q=0; q < comLen; q++){
			p = ind[q] * comLen;
			x += src[p];
			y += src[p+1];
			z += src[p+2];
		}

		out[0] = x/4;
		out[1] = y/4;
		out[2] = z/4;
	}

	function Norm(out,s){
		var mag = Math.sqrt(out[0] * out[0] + out[1] * out[1] + out[2] * out[2]);
		if(s === undefined) s = 1;
		out[0] = out[0] / mag * s;
		out[1] = out[1] / mag * s;
		out[2] = out[2] / mag * s;
	}

	return {TriWall:TriWall, Extrude:Extrude, TriQuad:TriQuad, QuadCenterPos:QuadCenterPos, 
		Norm:Norm, GetVert:GetVert, QuadCrossProd:QuadCrossProd, Scale:Scale, ScaleCenter:ScaleCenter, 
		Rot:Rot, qRot:qRot, qRotCenter:qRotCenter, Rnd:Rnd };
})();

function ellipse(src,aRad,bRad,step,radiusX,radiusY,c){
	var inc = (bRad - aRad) / (step),
		rad = 0,
		x = 0;
		y = 0;

	for(var i=0; i <= step; i++){
		rad = i * inc + aRad;
		x = radiusX * Math.cos(rad);
		y = radiusY * Math.sin(rad);
		src.push(x,y,0,c);
	}
}


function lathe(pathAry,steps,rotAxis,outVert){
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
		for(v = 0; v < len; v+=4){
			x = pathAry[v];
			y = pathAry[v+1];
			z = pathAry[v+2];

			switch(rotAxis){ // https://www.siggraph.org/education/materials/HyperGraph/modeling/mod_tran/3drota.htm#Y-Axis%20Rotation
				case "y": ry = y; rx = z*sin + x*cos; rz = z*cos - x*sin; break;
				case "x": rx = x; ry = y*cos - z*sin; rz = y*sin + z*cos; break;
				case "z": rz = z; rx = x*cos - y*sin; ry = x*sin + y*cos; break;
			}
			outVert.push(rx,ry,rz,pathAry[v+3]);
		}
	}
}


function roadModel(){
	var model = new FungiExt.DynamicMesh(3,1,1,"matRoad");
	model.drawMode = Fungi.gl.TRIANGLE_STRIP;

	var path = [], inc = 20;
	road(path);
	FungiExt.Mesh.vertexOffset(path,[0,4,0]);
	FungiExt.Mesh.lathe(path,inc,"x",model.verts.data);
	FungiExt.Mesh.triangleStrip(inc,path.length/3,model.index.data,true,true);
	model.update();

	return model;
}


function road(ary){
	var outWidth = 0.8,
		outHeight = 0.2,
		inWidth = 0.6;
		inHeight = 0.1;

	var owh = outWidth * 0.5,
		ohh = outHeight * 0.5,
		iwh = inWidth * 0.5,
		ihh = inHeight * 0.5;

	ary.push(-owh,-ohh,0.0); //left out lower
	ary.push(-owh,ohh,0.0); //left out upper
	ary.push(-iwh,ohh,0.0); //left in upper
	ary.push(-iwh,ohh-ihh,0.0); //Left in lower

	for(var i=ary.length-3; i >= 0; i-=3) ary.push(-ary[i], ary[i+1], ary[i+2]);
}


function house(){
	var mod = new FungiExt.DynamicMesh(4,1,1,"matHouse");
	mod.drawMode = Fungi.gl.TRIANGLE_STRIP;

	var v = [], ind, x, y;

	//Main Dome ------------
	ellipse(v,0,Math.PI*0.5,7,4,4,2);
	for(var i=0; i < v.length; i+=4){ v[i] += 2.7; }
	
	//first Ring
	x = v[7*4]-0.7;
	y = v[7*4+1];
	ind = v.length;
	ellipse(v,0,Math.PI*0.5,3,0.7,0.4,0);
	for(var i=ind; i < v.length; i+=4){ v[i] += x; v[i+1] += y; }

	//Second Ring -----------
	x = v[11*4]-1;
	y = v[11*4+1];
	ind = v.length;
	ellipse(v,0,Math.PI*0.5,5,1,0.6,1);
	for(var i=ind; i < v.length; i+=4){ v[i] += x; v[i+1] += y; }

	//Top of dome -----------
	y = v[16*4+1];
	ind = v.length;
	ellipse(v,0,Math.PI*0.5,4,1.0,0.5,0);
	for(var i=ind; i < v.length; i+=4) v[i+1] += y;
	v[22*4] = 0; //make sure the last point, the top of the dome is at origin on the x axis for looping.

	var loop = 10;
	lathe(v,loop,"y",mod.verts.data);
	FungiExt.Mesh.triangleStrip(loop,v.length/4,mod.index.data,true,false);

	mod.update();
	door().parent = mod;
	return mod;
	//return door();
	//Copy Data to mesh object
	//for(var i=0; i < v.length; i++) mod.verts.data.push(v[i]);
}


function door(){
	var mod = new FungiExt.DynamicMesh(4,1,1,"matHouse");
	mod.drawMode = Fungi.gl.TRIANGLES;

	var v = [], x, y;

	//Main Dome ------------
	ellipse(v,0,Math.PI,6,0.9,0.9,0);
	v.push(-v[0],-1.5,v[2],v[3]);
	v.unshift(v[0],-1.5,v[2],v[3]);
	for(var i=0; i < v.length; i+=4){ v[i+1] += 1.5; }

	//EXTRUDE
	var end = v.length;
	for(var i=0; i < end; i+=4) v.push(v[i],v[i+1],v[i+2]-1.5,v[i+3]);

	v.push(0,0,0,0);//Add Center point to crate face in front.
	var lastIdx = v.length/4 - 1;

	//Triangle the walls
	var a,b,c,d;
	for(var i=0; i < 8; i++){
		a = i;
		b = i+9;
		c = b+1;
		d = a+1;
		mod.index.data.push(a,b,c,c,d,a);
	}

	//Triangle Fan the front face
	for(var i=0; i < 8; i++) mod.index.data.push(lastIdx,i,i+1);

	//Copy Data to mesh object
	for(var i=0; i < v.length; i++) mod.verts.data.push(v[i]);

	mod.update();
	mod.position.z = 6.8;
	return mod;
}


function garage(){
	var mod = new FungiExt.DynamicMesh(4,1,1,"matHouse");
	mod.drawMode = Fungi.gl.TRIANGLES;

	var v = [], x, y;

	//Main Dome ------------
	ellipse(v,0,Math.PI,8,0.6,0.4,0);
	v.push(-v[0],-0.5,v[2],v[3]);
	v.unshift(v[0],-0.5,v[2],v[3]);
	for(var i=0; i < v.length; i+=4){ v[i+1] += 0.5; }

	//EXTRUDE
	var end = v.length;
	for(var i=0; i < end; i+=4) v.push(v[i],v[i+1],v[i+2]-1,v[i+3]);

	v.push(0,0,0,0);//Add Center point to crate face in front.
	v.push(0,0,-1,0); // back face
	var lastIdx = v.length/4 - 2;

	//Triangle the walls
	var a,b,c,d;
	for(var i=0; i < 10; i++){
		a = i;
		b = i+11;
		c = b+1;
		d = a+1;
		mod.index.data.push(a,b,c,c,d,a);
	}

	//Triangle Fan the front face
	for(var i=0; i < 10; i++){
		mod.index.data.push(lastIdx,i,i+1); //Front 
		mod.index.data.push(21-i,20-i,lastIdx+1); //back
	}

	//Copy Data to mesh object
	for(var i=0; i < v.length; i++) mod.verts.data.push(v[i]);

	mod.update();
	return mod;
}


function fountain(){
	var mod = new FungiExt.DynamicMesh(4,1,1,"matFountain");
	mod.drawMode = Fungi.gl.TRIANGLE_STRIP;
	
	var v = [], x, y;

	//Build wall
	v.push(2.5,0,0,0);
	v.push(2.5,0.9,0,0);
	v.push(2.0,0.9,0,0);
	v.push(2.0,0.2,0,0);
	v.push(0.5,0.2,0,0);
	
	//Built Spout
	v.push(0.5,0.2,0,1); //Extra spot to color spout
	
	var idx = v.length;
	ellipse(v,Math.PI*-0.5,Math.PI*0.5,4,0.7,0.7,1);
	for(var i=idx; i < v.length; i+=4){ v[i] += 0.5; v[i+1] += 3.2;}

	v.push(0.5,4.3,0,1);
	v.push(0,4.3,0,1);

	var loop = 10;
	lathe(v,loop,"y",mod.verts.data);
	FungiExt.Mesh.triangleStrip(loop,v.length/4,mod.index.data,true,false);

	//Copy Data to mesh object
	//for(var i=0; i < v.length; i++) mod.verts.data.push(v[i]);

	mod.update();
	return mod;
}


//Modified LookRotation, Keep the up being passed in then calc forward and right.
function qPlacement(vUp, out){
	var zAxis	= new Fungi.Maths.Vec3(),	//Forward
		//up		= new Vec3(vUp),
		tmp		= new Fungi.Maths.Vec3(0,1,0);
		yAxis	= new Fungi.Maths.Vec3(vUp),
		xAxis	= new Fungi.Maths.Vec3();		//Right
		//yAxis	= new Vec3();


	yAxis.normalize(); //Normalize Top
	Fungi.Maths.Vec3.cross(yAxis,tmp,zAxis); //Forward Direction
	zAxis.normalize();
	Fungi.Maths.Vec3.cross(yAxis,zAxis,xAxis); //Left Direction

	//zAxis.normalize();
	//Vec3.cross(up,zAxis,xAxis);
	//xAxis.normalize();
	//Vec3.cross(zAxis,xAxis,yAxis); //new up

	//fromAxis - Mat3 to Quaternion
	var m00 = xAxis.x, m01 = xAxis.y, m02 = xAxis.z,
		m10 = yAxis.x, m11 = yAxis.y, m12 = yAxis.z,
		m20 = zAxis.x, m21 = zAxis.y, m22 = zAxis.z,
		t = m00 + m11 + m22,
		x, y, z, w, s;

	if(t > 0.0){
		s = Math.sqrt(t + 1.0);
		w = s * 0.5 ; // |w| >= 0.5
		s = 0.5 / s;
		x = (m12 - m21) * s;
		y = (m20 - m02) * s;
		z = (m01 - m10) * s;
	}else if((m00 >= m11) && (m00 >= m22)){
		s = Math.sqrt(1.0 + m00 - m11 - m22);
		x = 0.5 * s;// |x| >= 0.5
		s = 0.5 / s;
		y = (m01 + m10) * s;
		z = (m02 + m20) * s;
		w = (m12 - m21) * s;
	}else if(m11 > m22){
		s = Math.sqrt(1.0 + m11 - m00 - m22);
		y = 0.5 * s; // |y| >= 0.5
		s = 0.5 / s;
		x = (m10 + m01) * s;
		z = (m21 + m12) * s;
		w = (m20 - m02) * s;
	}else{
		s = Math.sqrt(1.0 + m22 - m00 - m11);
		z = 0.5 * s; // |z| >= 0.5
		s = 0.5 / s;
		x = (m20 + m02) * s;
		y = (m21 + m12) * s;
		w = (m01 - m10) * s;
	}
	out[0] = x;
	out[1] = y;
	out[2] = z;
	out[3] = w;
}


function createTree(){
	var gModel = new FungiExt.DynamicMesh(4,1,1,"matTree"); // MatLowPoly MatDomShader
	gModel.drawMode = Fungi.gl.TRIANGLES; //Fungi.gl.POINTS; //Fungi.gl.TRIANGLES;
	gModel.verts.data.push(
		-1.0,0.0,-1.0,0.0,
		-1.0,0.0,1.0,1.0,
		1.0,0.0,1.0,2.0,
		1.0,0.0,-1.0,3.0
	);

	var vData = gModel.verts.data,	//ref to vert data
		iData = gModel.index.data,	//ref to index data
		steps = 7,					//How many times to extrude the trunks
		mkHole = -1,				//When to leave holes in the trunk
		idxList = null,				//Index Array List
		idxListLast = [0,1,2,3],	//Previous Index Array List
		branches = [];				//List of indexes of where the holes are.
	
	var rx=0,						//Random X
		ry=0,						//Random Y
		s = 0;						//Scale Value

	//Create 
	for(var i=0; i < steps; i++){
		idxList = Kai.Extrude([0,0.7,0],idxListLast,vData);

		s = 1 - Math.pow(0.1,(i+1)*1.9/steps);
		Kai.Scale(idxList,[s,1,s],vData);   			//Curve
		//Kai.Scale(idxList,[0.85,1.0,0.85],vData);		//Linear
		
		ry = Kai.Rnd(0,40) * Math.PI/180;
		Kai.Rot(idxList,ry,"y",vData);

		rx = Kai.Rnd(-10,10) * Math.PI/180;
		Kai.Rot(idxList,rx,"x",vData);
		
		if(i == steps-1) mkHole = 1;
		else if(i == steps-2) mkHole = 0;
		Kai.TriWall(idxListLast,idxList,iData,mkHole,branches);

		idxListLast = idxList;
	}

	//Create Top Cap
	Kai.TriQuad(idxListLast,iData);
	
	//Create Branches in the holes created in the trunk
	var ePoints = [];
	for(var i=0; i < branches.length; i++) ePoints.push(createBranch(branches[i],vData,iData));

	//Create bushes at the end of the branches
	for(var i=0; i < ePoints.length; i++) createBush(ePoints[i],gModel);

	gModel.update();
	return gModel;
}

function createBranch(iAry,src,iData){
	var idxPrev = iAry, idxNext = null;
	var cp = [0,0,0];	//Cross Product, used to save forward direction
	var up = [0,1,0];	//Up Direction
	
	for(var i = 0; i < 5; i++){
		Kai.QuadCrossProd(idxPrev,src,cp,1);	//Figure out the forward direction to extrude
		
		if(i == 0){ //on the first extrude, want to set the forward direction a few degrees up
			var dp = Fungi.Maths.Vec3.dot(cp,up);	//Get the angle between forward and up
			var p0 = iAry[0] * 4,				 	//Use the top two points of the quad to determine a rotation axis
				p1 = iAry[3] * 4;					
			var v1 = [ src[p1] - src[p0], src[p1+1] - src[p0+1], src[p1+2] - src[p0+2] ]; //Create Direction vector		
			Kai.Norm(v1); //normalize the direction vector

			var q = new Fungi.Maths.Quaternion();
			q.setAxisAngle(v1, dp-0.3);					//set the angle a bit less then its current angle
			Fungi.Maths.Quaternion.rotateVec3(q,cp);	//use this new angle to rotate our forward direction up a bit
		}

		idxNext = Kai.Extrude(cp,idxPrev,src);		//Extrude
		
		var rad = Kai.Rnd(-45,2) * Math.PI/180;		//Random Rotation

		Kai.qRotCenter(rad,idxNext,src);			//Rotate our new vertices

		Kai.ScaleCenter(idxNext,0.60,src);			//Scale down our new vertices

		Kai.TriWall(idxPrev,idxNext,iData,-1);		//Create Faces
		
		idxPrev = idxNext;							//Save for next loop to continue extruding
	}

	//Get the center of the final quad created, this will be the position for bushes.
	var endPoint = [0,0,0];
	Kai.QuadCenterPos(idxPrev,src,endPoint)
	return endPoint;
}


function createBush(iniPos,gModel){
	var verSteps = 10,
		horSteps = 10,
		iRadius = Kai.Rnd(1,2);
		radius = 2;

	var i,x,y,z,
		halfPI		= Math.PI * 0.5,				//Starting Angle for Azimuth
		eleInc		= Math.PI / (verSteps-1),		//Vertical Increment
		aziInc		= Math.PI * 2 / (horSteps),		//Horizontal Increment
		elevation	= 0,							//North-South
		azimuth		= 0,							//West-East
		aryVerts	= [],//0,radius,0,0,-radius,0
		aryIndex	= [];

	for(var a=0; a < horSteps; a++){
		azimuth = Math.PI + a * aziInc;				//Inc 360 degrees

		for(i=0; i < verSteps; i++){
			//radius = Kai.Rnd(1.5,2);

			//Apply noise to any points except the poles
			if(i > 0 && i < verSteps-1) radius = iRadius + (0.6 * noise.perlin2(a*0.45,i*0.45));
			else radius = iRadius;

			//Convert the Two angles to Cord Points
			elevation = halfPI + i * eleInc;
			x = radius * Math.cos(elevation) * Math.cos(azimuth);	//X
			y = radius * Math.sin(elevation);						//Z
			z = radius * Math.cos(elevation) * Math.sin(azimuth);	//Y

			//Scale up
			x *= 1.5;
			z *= 1.5;

			aryVerts.push(x,y,z);
		}
	}


	FungiExt.Mesh.triangleStrip(horSteps,verSteps,aryIndex,true,false);
	var vao = Fungi.Shaders.VAO.standardMesh("MorphCircle",3,aryVerts,null,null,aryIndex,false);
	var model = new Fungi.Renderable(vao,"matBush");
	model.position.x = iniPos[0];
	model.position.y = iniPos[1];
	model.position.z = iniPos[2];
	model.parent = gModel;
}