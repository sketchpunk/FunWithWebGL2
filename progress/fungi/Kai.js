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