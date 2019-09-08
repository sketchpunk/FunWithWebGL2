	
import App, { gl }			from "../fungi/engine/App.js";
import { Vec3, Quat, Mat4 }	from "../fungi/maths/Maths.js";

class Ray{
	////////////////////////////////////////////////////////
	//
	////////////////////////////////////////////////////////
		constructor(aPos = null, bPos = null){
			this.mouse		= [ 0, 0 ];
			this.origin		= new Vec3(); // Starting position of the ray
			this.end		= new Vec3(); // Ending position of the ray
			this.vecLen		= new Vec3(); // Vector Length of Origin to End
			this.dir		= new Vec3(); // Unit Direction Vector

			if(aPos != null && bPos != null) this.setPos( aPos, bPos );
		}

		setPos( aPos, bPos ){
			this.origin.copy( aPos );					// Save Origin of the Ray
			this.end.copy( bPos );						// Save End Position of the ray
			this.end.sub( this.origin, this.vecLen );	// Vector Length of the ray :: end - origin = vLen
			this.vecLen.norm( this.dir );				// Unit Direction Vector of ray
			return this;
		}

		getPos(t,out){
			out = out || new Vec3();
			return Vec3.lerp(this.origin, this.end, t, out); //out.copy(this.vecLen).scale(t).add(this.origin);
		}

		get_by_len( len, out ){
			out = out || new Vec3();
			return Vec3.scale( this.dir, len, out ).add( this.origin );
		}

		prepareAABB(){
			//Optimization trick from ScratchAPixel
			this.vecLenInv = this.vecLen.clone().divInvScale(1); //Do inverse of distance, to use mul instead of div for speed.

			//Determine which bound will result in tMin so there will be no need to test if tMax < tMin to swop.
			this.aabb = [ (this.vecLenInv.x < 0)? 1 : 0, (this.vecLenInv.y < 0)? 1 : 0, (this.vecLenInv.z < 0)? 1 : 0 ];

			return this;
		}


	////////////////////////////////////////////////////////
	//
	////////////////////////////////////////////////////////
		// Create Ray Based on Screen Mouse X,Y
		//Create actual point in 3d space the mouse clicked plus the furthest point the ray can travel.
		static MouseSegment( ix, iy, ray = null, forAABB = false ){
			// http://antongerdelan.net/opengl/raycasting.html
			// Normalize Device Coordinate
			var nx = ix / gl.width * 2 - 1,
				ny = 1 - iy / gl.height * 2;

			// inverseWorldMatrix = invert(ProjectionMatrix * ViewMatrix);  // OR
			// inverseWorldMatrix = localMatrix * invert(ProjectionMatrix); // can cache invert projection matrix.
			var matWorld = new Mat4();
			Mat4.mul( App.camera.Node.modelMatrix, App.camera.Camera.projMatrixInv, matWorld );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// https://stackoverflow.com/questions/20140711/picking-in-3d-with-ray-tracing-using-ninevehgl-or-opengl-i-phone/20143963#20143963
			// Clip Cords would be [nx,ny,-1,1];
			var vec4Near	= [ nx, ny, -1, 1.0 ],
				vec4Far		= [ nx, ny,  1, 1.0 ];		

			Mat4.transformVec4( matWorld, vec4Near ); // using 4d Homogeneous Clip Coordinates
			Mat4.transformVec4( matWorld, vec4Far );

			for(var i=0; i < 3; i++){ //Normalize by using W component
				vec4Near[i]	/= vec4Near[3];
				vec4Far[i] 	/= vec4Far[3];
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Build all the values
			ray = ray || new Ray();
			ray.setPos( vec4Near, vec4Far );

			ray.mouse[ 0 ] = ix;
			ray.mouse[ 1 ] = iy;

			if( forAABB ) ray.prepareAABB();

			return ray;
		}
		
		static MouseDirection(ix,iy,range){}
		/*
		static directionFromMouse(ix,iy){
			//http://antongerdelan.net/opengl/raycasting.html
			//Normalize Device Coordinate
			var nx = ix / gl.width * 2 - 1,
				ny = 1 - iy / gl.height * 2;

			//..........................................
			//4d Homogeneous Clip Coordinates
			var vec4Clip = [nx,ny,-1.0,1.0]; // -Z is forward, W just needs to be 1.0.

			//..........................................
			//4d Eye (Camera) Coordinates
			var vec4Eye = [0,0,0,0],
				matInvProj = new Mat4();

			//Mat4.invert(matInvProj, Fungi.mainCamera.projectionMatrix);
			//Mat4.transformVec4(vec4Eye, vec4Clip, matInvProj);
			Mat4.transformVec4(vec4Eye, vec4Clip, Fungi.mainCamera.invertedProjectionMatrix);
			
			vec4Eye[2] = -1; //Reset Forward Direction
			vec4Eye[3] = 0.0; //Not a Point

			//..........................................
			//4d World Coordinates
			var vec4World = [0,0,0,0];
			//.Mat4.transformVec4(vec4World,vec4Clip,Cam.invertedLocalMatrix); //Fix function change
			Mat4.transformVec4(vec4World, vec4Eye, Fungi.mainCamera.localMatrix);

			var ray = new Vec3(vec4World[0], vec4World[1], vec4World[2]);
			return ray.normalize();
		}
		*/


	////////////////////////////////////////////////////////
	// Intersection Tests
	////////////////////////////////////////////////////////
		static inPlane( ray, planePos, planeNorm ){
			// t = ray2PlaneLen.planeNorm / rayLen.planeNorm
			// i = rayStart + (t * rayLen)
			var denom = Vec3.dot( ray.vecLen, planeNorm );						// Dot product of rayPlen Length and plane normal
			if( denom <= 0.000001 && denom >= -0.000001 ) return null;			// abs(denom) < epsilon, using && instead to not perform absolute.

			var ray2PlaneLen	= Vec3.sub(planePos, ray.origin),				// Distance between start of ray and plane position.
				t 				= Vec3.dot(ray2PlaneLen, planeNorm) / denom;

			//if(t >= 0) return ray.vecLen.clone().scale(t).add(rayStart);			//include && t <= 1 to limit to range of ray, else its infinite in fwd dir.
			if(t >= 0) return t;
			return null;
		}


		static inCircle( ray, radius, planePos, planeNorm ){
			var t = Ray.inPlane( ray, planePos, planeNorm );
			if(t == null) return null;

			var ip 		= ray.getPos( t ),
				lenSqr 	= ip.lengthSqr( planePos );

			return ( lenSqr <= radius*radius )? t : null;
		}


		//TODO : Need to handle precalc the 4 points of a quad AND handle scale, rotation and translation
		static inQuad( ray, quad, qSize ){
			var planePos	= quad.Node.local.pos.clone(),
				planeNorm	= new Vec3();

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			//Figure out the 4 points in the quad based on center position and known width/height;
			//Note: If the quad has been rotated or scaled, need to apply those to the 4 points as well.
			var v0 = Vec3.add( planePos, [-qSize,  qSize, 0] ),
				v1 = Vec3.add( planePos, [-qSize, -qSize, 0] ),
				v2 = Vec3.add( planePos, [ qSize, -qSize, 0] ),
				v3 = Vec3.add( planePos, [ qSize,  qSize, 0] );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			//Figure out the normal direction of the quad
			//to find normal direction, take 3 sequential corners, get two vector 
			//lengths then cross apply in counter-clockwise order
			var L0 = Vec3.sub( v0, v1 ),
				L1 = Vec3.sub( v2, v1 );
			Vec3.cross( L1, L0, planeNorm ).norm();

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			//Determine if the ray intersects the same plane of the quad.
			var t = Ray.inPlane( ray, planePos, planeNorm );
			if(t == null) return null;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			//First Diagonal Test - Projecting intersection point onto Left Side of Quad
			var ip		= ray.getPos( t ),
				vlen	= Vec3.sub( v1, v0 ),
				plen	= Vec3.sub( ip, v0 ),
				tt		= Vec3.dot( plen, vlen ) / Vec3.dot( vlen, vlen ); //|a|.|b| / |b|.|b|
			if(tt < 0 || tt > 1) return null;

			//........................................
			//Second Diagonal Test - Projecting intersection point onto bottom Side of Quad
			Vec3.sub( v2, v1, vlen );
			Vec3.sub( ip, v1, plen );
			tt = Vec3.dot( plen, vlen ) / Vec3.dot( vlen, vlen );

			if(tt < 0 || tt > 1) return null;

			return t;
		}

		static inQuadRaw( ray, v0, v1, v2, v3 ){
			var planeNorm	= new Vec3();

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			//Figure out the normal direction of the quad
			//to find normal direction, take 3 sequential corners, get two vector 
			//lengths then cross apply in counter-clockwise order
			var L0 = Vec3.sub( v0, v1 ),
				L1 = Vec3.sub( v2, v1 );
			Vec3.cross( L1, L0, planeNorm ).norm();

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			//Determine if the ray intersects the same plane of the quad.
			var t = Ray.inPlane( ray, v0, planeNorm );
			if(t == null) return null;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			//First Diagonal Test - Projecting intersection point onto Left Side of Quad
			var ip		= ray.getPos( t ),
				vlen	= Vec3.sub( v1, v0 ),
				plen	= Vec3.sub( ip, v0 ),
				tt		= Vec3.dot( plen, vlen ) / Vec3.dot( vlen, vlen ); //|a|.|b| / |b|.|b|
			if(tt < 0 || tt > 1) return null;

			//........................................
			//Second Diagonal Test - Projecting intersection point onto bottom Side of Quad
			Vec3.sub( v2, v1, vlen );
			Vec3.sub( ip, v1, plen );
			tt = Vec3.dot( plen, vlen ) / Vec3.dot( vlen, vlen );

			if(tt < 0 || tt > 1) return null;

			return t;
		}


		static inAABB( ray, box, out ){
			var tMin, tMax, min, max, minAxis = 0;//, maxAxis = 0;

			//X Axis ---------------------------
			tMin = (box.worldBounds[	ray.aabb[0]].x - ray.origin.x) * ray.vecLenInv.x;
			tMax = (box.worldBounds[1 - ray.aabb[0]].x - ray.origin.x) * ray.vecLenInv.x;

			//Y Axis ---------------------------
			min = (box.worldBounds[		ray.aabb[1]].y - ray.origin.y) * ray.vecLenInv.y;
			max = (box.worldBounds[1 - 	ray.aabb[1]].y - ray.origin.y) * ray.vecLenInv.y;

			if(max < tMin || min > tMax) return false;	// if it criss crosses, its a miss
			if(min > tMin){ tMin = min; minAxis = 1; }	// Get the greatest min
			if(max < tMax){ tMax = max; }				// Get the smallest max

			//Z Axis ---------------------------
			min = (box.worldBounds[		ray.aabb[2]].z - ray.origin.z) * ray.vecLenInv.z;
			max = (box.worldBounds[1 - 	ray.aabb[2]].z - ray.origin.z) * ray.vecLenInv.z;

			if(max < tMin || min > tMax) return false;	// if criss crosses, its a miss
			if(min > tMin){ tMin = min; minAxis = 2; }	// Get the greatest min
			if(max < tMax){ tMax = max; }				// Get the smallest max

			//Finish ------------------------------
			//var ipos = dir.clone().scale(tMin).add(ray.start); //with the shortist distance from start of ray, calc intersection
			if(out !== undefined){
				out.min		= tMin;
				out.max		= tMax;
				out.nAxis	= minAxis; // 0 : X, 1 : Y, 2 : Z
				out.nDir	= ( ray.aabb[ minAxis ] == 1 )? 1 : -1;
			}
			return true;
		}


		static inOBB( ray, box, tran, out ){
			var bbRayDelta	= Vec3.sub( tran.pos, ray.origin ),	//Distance between Ray start and Box Position
				//wMat		= box.target.worldMatrix,	//Alias to the world matrix object
				axis 		= new Vec3(),				//Current Axis being tested.
				tMin 		= 0,
				tMax 		= 1000000,
				minAxis		= 0,						//Which axis hit, X:0, Y:1, Z:2
				p,nomLen,denomLen,tmp,min,max;
				
			for(var i=0; i < 3; i++){
				p = i*4;

				//axis.set(wMat[p],wMat[p+1],wMat[p+2]); //Get Right(0,1,2), Up(4,5,6) and Forward(8,9,10) direction from Matrix
				switch( i ){
					case 0: axis.from_quat( tran.rot, Vec3.LEFT ); break;
					case 1: axis.from_quat( tran.rot, Vec3.UP );  break;
					case 2: axis.from_quat( tran.rot, Vec3.FORWARD ); break;
				}

				nomLen		= Vec3.dot(axis, bbRayDelta); 	//Get the length of Axis and distance to ray position
				denomLen	= Vec3.dot(ray.vecLen, axis);	//Get Length of ray and axis

				if(Math.abs(denomLen) > 0.00001){	//Can't divide by Zero
					min = (nomLen + box.worldBounds[0][i]) / denomLen;
					max = (nomLen + box.worldBounds[1][i]) / denomLen;

					if(min > max){ tmp = min; min = max; max = tmp; }	//Swap
					if(min > tMin){ tMin = min; minAxis = i; }			//Biggest Min
					if(max < tMax) tMax = max;							//Smallest Max

					if(tMax < tMin) return false;
				}else if(-nomLen + box.worldBounds[0][i] > 0 || -nomLen + box.worldBounds[1][i] < 0) return false;  //are almost parallel check
			}

			if(out !== undefined){
				out.min		= tMin;
				out.max		= tMax;
				out.nAxis	= minAxis; // 0 : X, 1 : Y, 2 : Z
				out.nDir	= (ray.aabb[minAxis] == 1)? 1 : -1;
			}
			return true;
		}


		//This function is the better Sphere intersection BUT its for an infinite ray
		//So the T value is creates is for the Ray.Dir instead of Ray.vecLen, using
		//Ray.getPos() will not work with the T values created by this function. Need to calc
		//ipos manually using the ray direction.
		static rayInSphere(ray, pos, radius, out){
			//...........................................
			var radiusSqr	= radius * radius,
				rayToCenter	= Vec3.sub(pos, ray.origin),		
				tProj		= Vec3.dot(rayToCenter, ray.dir); //Project the length to the center onto the Ray

			//...........................................
			//Get length of projection point to center and check if its within the sphere
			//Opposite^2 = hyptenuse^2 - adjacent^2
			var oppLenSqr = rayToCenter.lengthSqr() - (tProj*tProj);  //Vec3.dot(rayToCenter, rayToCenter) - (tProj*tProj); 
			if(oppLenSqr > radiusSqr) return false;
			if(oppLenSqr == radiusSqr){
				if(out) out.min = out.max = tProj;
				return true;
			}

			//...........................................
			//Using the Proj Length, add/subtract to get the intersection points since tProj is inside the sphere.
			if(out){
				var oLen	= Math.sqrt(radiusSqr - oppLenSqr), //Opposite = sqrt(hyptenuse^2 - adjacent^2)
					t0		= tProj - oLen,
					t1		= tProj + oLen;
				if(t1 < t0){ var tmp = t0; t0 = t1; t1 = tmp; } //Swap

				out.min = t0; //var ipos0 = Vec3.scale(ray.dir,t0).add(ray.origin);
				out.max = t1; //var ipos1 = Vec3.scale(ray.dir,t1).add(ray.origin);
				out.pos = Vec3.scale(ray.dir,t0).add(ray.origin);
			}

			return true;
		}

		//This function does more math then RayInSphere function, but this function isn't an intersection
		//of an infinite ray, but a segment. The ray object contains both Segment and Direction data.
		//The T values this produces is based on the ray segment and will work with Ray.getPos()
		//http://nic-gamedev.blogspot.com/2011/11/using-vector-mathematics-and-bit-of_09.html
		static segInSphere(ray, pos, radius, out){
			var rayLenSqr		= ray.vecLen.lengthSqr(),				// Ray's Length Squared
				rayToSphere		= Vec3.sub(pos, ray.origin),			// Vector length from Sphere Pos to Ray Origin.
				raySphereDot	= Vec3.dot(ray.vecLen, rayToSphere),	// Vector Len . Vector Len of Ray To Sphere
				t				= raySphereDot / rayLenSqr,				// Normalize based on ray length
				ipos 			= ray.getPos(t),						// Closets ray point to Sphere Center
				iSphereLenSqr 	= ipos.lengthSqr(pos),					// Length Sqr from Sphere to iPos
				radiusSqr 		= radius * radius;						// r^2

			//......................................
			if(iSphereLenSqr > radiusSqr) return false;
			if(iSphereLenSqr == radiusSqr){
				if(out){ out.min = out.max = t; }
			 	return true;
			}

			//......................................
			if(out){
				//Opposite = sqrt(hyptenuse^2 - adjacent^2)
				var oLen	= Math.sqrt( (radiusSqr - iSphereLenSqr) / rayLenSqr ),
					t0		= t + oLen,
					t1		= t - oLen;
				if( t0 > t1 ){ var tmp = t0; t0 = t1; t1 = tmp; } //Swap
				out.min = t0;
				out.max = t1;
			}
			return true;
		}


		static inCapsule(ray, cap, tran, out){
			//...........................................
			//Get Capsule's line segment and move it to world splace
			var A = cap.vecStart.clone(),	//Start of Capsule Line
				B = cap.vecEnd.clone();		//End of Capsule Line

			//if doing Axis Aligned, no need to apply rotations
			//TODO : Should also include scale.
			//Quat.rotateVec3(cap._rotation,A).add(cap._position); //Apply Rotation first Then Translation
			//Quat.rotateVec3(cap._rotation,B).add(cap._position); 
			tran.transformVec( A );
			tran.transformVec( B );

			//...........................................
			//Start calculating lengths and cross products
			var AB		= Vec3.sub(B, A),			// Vector Length of Capsule Segment
				AO		= Vec3.sub(ray.origin, A), 	// Vector length between start of ray and capsule line
				AOxAB	= Vec3.cross(AO, AB),		// Perpendicular Vector between Cap Line & delta of Ray Origin & Capsule Line Start
				VxAB 	= Vec3.cross(ray.dir, AB),	// Perpendicular Vector between Ray Dir & caplsule line
				ab2		= AB.lengthSqr(), 			// Length Squared of Capsule Line
				a		= VxAB.lengthSqr(),			// Length Squared of Perp Vec Length of Perp Vec of Ray&Cap
				b		= 2 * Vec3.dot(VxAB,AOxAB),
				c		= AOxAB.lengthSqr() - (cap.radiusSqr * ab2),
				d		= b * b - 4 * a * c;

			//...........................................
			//Checking D seems to be related to distance from capsule. If not within radius, D will be under 0
			if (d < 0) return null;

			//T is less then 0 then ray goes through both end caps cylinder cap.
			var t = (-b - Math.sqrt(d)) / (2 * a);
			if(t < 0){
				var pos = (A.lengthSqr(ray.origin) < B.lengthSqr(ray.origin))? A : B;
				return Ray.rayInSphere( ray, pos, cap.radius, out );
			}

			//...........................................
			//Limit intersection between the bounds of the cylinder's end caps.
			var iPos	= Vec3.scale(ray.dir, t).add(ray.origin),	//Intersection Point
				iPosLen	= Vec3.sub(iPos, A),						//Vector Length Between Intersection and Cap line Start
				tLimit	= Vec3.dot(iPosLen, AB) / ab2;				//Projection of iPos onto Cap Line

			if(tLimit >= 0 && tLimit <= 1){
				if(out){ out.pos = iPos; }
				return true;
			}else if(tLimit < 0)	return Ray.rayInSphere(ray, A, cap.radius, out); 
			else if(tLimit > 1)		return Ray.rayInSphere(ray, B, cap.radius, out); 

			return false;
		}

		// https://www.scratchapixel.com/lessons/3d-basic-rendering/ray-tracing-rendering-a-triangle/moller-trumbore-ray-triangle-intersection
		static inTri( ray, v0, v1, v2, out, cull_face=true ){
			let v0v1 	= Vec3.sub( v1, v0 ),
				v0v2 	= Vec3.sub( v2, v0 ),
				pvec 	= Vec3.cross( ray.dir, v0v2 ),
				det		= Vec3.dot( v0v1, pvec );

			if( cull_face && det < 0.000001 ) return false;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let idet 	= 1 / det,
				tvec 	= Vec3.sub( ray.origin, v0 ),
				u 		= Vec3.dot( tvec, pvec ) * idet;

			if( u < 0 || u > 1 ) return false;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let qvec 	= Vec3.cross( tvec, v0v1 ),
				v 		= Vec3.dot( ray.dir, qvec ) * idet;

			if( v < 0 || u+v > 1 ) return false;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			out = out || new Vec3();
			let len = Vec3.dot( v0v2, qvec ) * idet;
			
			ray.get_by_len( len, out );
			return true;
		}

		// Closure version which is more memory efficent, better to use when dealing with large number of
		// triangles. No need to recreate vector objects for each call.
		static ray_tri_closure( cull_face=true ){
			let v0v1 = new Vec3(),
				v0v2 = new Vec3(),
				pvec = new Vec3(),
				tvec = new Vec3(),
				qvec = new Vec3(),
				v, u, det, idet, len;

			return ( ray, v0, v1, v2, out )=>{
				v0v1.from_sub( v1, v0 );
				v0v2.from_sub( v2, v0 );
				pvec.from_cross( ray.dir, v0v2 );
				det = Vec3.dot( v0v1, pvec );

				if( cull_face && det < 0.000001 ) return false;

				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				idet = 1 / det,
				tvec.from_sub( ray.origin, v0 ),
				u = Vec3.dot( tvec, pvec ) * idet;

				if( u < 0 || u > 1 ) return false;

				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				qvec.from_cross( tvec, v0v1 ),
				v = Vec3.dot( ray.dir, qvec ) * idet;

				if( v < 0 || u+v > 1 ) return false;

				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				out = out || new Vec3();
				len = Vec3.dot( v0v2, qvec ) * idet;

				ray.get_by_len( len, out );
				return true;
			}
		}

	////////////////////////////////////////////////////////
	// MISC
	////////////////////////////////////////////////////////
		static nearSegmentPoints( ray, A0, A1, tAry=null ){ //http://geomalgorithms.com/a07-_distance.html
			var u = Vec3.sub( A1, A0 ),
				v = ray.vecLen.clone(),
				w = Vec3.sub( A0, ray.origin ),
				a = Vec3.dot( u, u ),	// always >= 0
				b = Vec3.dot( u, v ),
				c = Vec3.dot( v, v ),	// always >= 0
				d = Vec3.dot( u, w ),
				e = Vec3.dot( v, w ),
				D = a * c - b * b,		// always >= 0
				tU, tV;

			//compute the line parameters of the two closest points
			if(D < 0.000001){	// the lines are almost parallel
				tU = 0.0;
				tV = ( b > c ? d/b : e/c );    // use the largest denominator
			}else{
				tU = ( b*e - c*d ) / D;
				tV = ( a*e - b*d ) / D;
			}

			if( tU < 0 || tU > 1 || tV < 0 || tV > 1) return null;
			if( tAry ){ // Return T Values if requested.
				tAry[0] = tU; 
				tAry[1] = tV;
			}

			return [ u.scale( tU ).add( A0 ), v.scale( tV ).add( ray.origin ) ];
		}
}

//#######################################################################################
export default Ray;


	/* Came from Camera
	worldToScreen(vAry){
		var mat	= new Float32Array(16), // Matrix4 Holder
			p	= [0,0,0,0],			// Vec4
			rtn	= [];					// List of vec2 results

		//Move Points from WorldSpace to -> View Space (View Matrix) -> ClipSpace (ProjMatrix)
		Mat4.mult(mat,this.projectionMatrix,this.invertedLocalMatrix);

		for(var i=0; i < vAry.length; i++){
			Mat4.transformVec3(p, vAry[i], mat);

			//Move from Clip Space to NDC Space (Normalized Device Coordinate Space) (-1 to 1 opengl viewport)
			if(p[3] != 0){ //only if W is not zero,
				p[0] = p[0] / p[3];
				p[1] = p[1] / p[3];
			}

			//Then finally move the points to Screen Space
			//Map points from -1 to 1 range into  0 to 1 range, Then multiple by canvas size
			rtn.push( // Replaced /2 with *0.5
				( p[0] + 1) * 0.5 * gl.width,
				(-p[1] + 1) * 0.5 * gl.height
			);
		}

		if(vAry.length == 1) return rtn[0]; //Just return the one point
		return rtn;	//Return all the points
	}


	static inPolygon(rayStart,rayEnd,vecAry){
		//....................................................
		//Figure out he plane direction and position for poly
		var planeNorm = new Vec3(),
			planePos = new Vec3(vecAry[0]), 			//Any point will do really.
			v0 = new Vec3(vecAry[1]).sub(planePos),		//v1 - v0 CROSS v2 - v0 :: Counter Clock Wise to get correct direction.
			v1 = new Vec3(vecAry[vecAry.length-1]).sub(planePos);
		Vec3.cross(v0,v1,planeNorm);
		planeNorm.normalize();

		//....................................................
		//Find Intersection Point

		var iPos = Ray.inPlane(rayStart,rayEnd,planeNorm,planePos);
		if(iPos == null) return null;

		//....................................................
		// Edge Checking - C++ Sample
		//	Vec3f edge0 = v1 - v0;
		//	Vec3f edge1 = v2 - v1;
		//	Vec3f edge2 = v0 - v2;
		//	Vec3f C0 = P - v0;
		//	Vec3f C1 = P - v1;
		//	Vec3f C2 = P - v2;
		//	if (dot(N, cross(edge0, C0)) > 0 &&
		//		dot(N, cross(edge1, C1)) > 0 &&
		//		dot(N, cross(edge2, C2)) > 0) return true; // P is inside the triangle
				
		var edge	= new Vec3(),	//length of edge
			ilen	= new Vec3(),	//intersection point length from starting of edge
			cp		= new Vec3(),	//cross product of Edge and iLen
			ii;						

		for(var i=0; i < vecAry.length; i++){
			ii = (i+1)%3;

			edge.copy(vecAry[ii]).sub(vecAry[i]);	//Edge Length
			ilen.copy(iPos).sub(vecAry[i]);			//intersection to edge length
			Vec3.cross(edge,ilen,cp);				//Cross Product of Edge and Inter 

			if(Vec3.dot(planeNorm,cp) < 0) return null; //if angle is in the negative, then its outside the polygon.
		}

		return iPos;
	}

	//NOTE: Think the Barycentric approach is more comberson then the poly edge detection
	//TODO:moller-trumbore algoritham might be better - https://www.scratchapixel.com/lessons/3d-basic-rendering/ray-tracing-rendering-a-triangle/moller-trumbore-ray-triangle-intersection
	//Another better Triangle Intersection algoritham - https://graphics.stanford.edu/courses/cs348b-98/gg/intersect.html
	static inTriangle(rayStart,rayEnd,vecAry){
		//....................................................
		//Figure out he plane direction and position for poly
		var planeNorm = new Vec3(),
			planePos = new Vec3(vecAry[0]), 			//Any point will do really.
			v0 = new Vec3(vecAry[1]).sub(planePos),		//v1 - v0 CROSS v2 - v0 :: Counter Clock Wise to get correct direction.
			v1 = new Vec3(vecAry[2]).sub(planePos);
		Vec3.cross(v0,v1,planeNorm);
		planeNorm.normalize();

		//....................................................
		//Find Intersection Point
		var iPos = Ray.inPlane(rayStart,rayEnd,planeNorm,planePos);
		if(iPos == null) return null;

		//....................................................
		// Barycentric Coordinates 
		var edgeA	= new Vec3(),
			edgeB	= new Vec3(),
			perp	= new Vec3(),
			perpLen	= new Vec3(),
			iLen	= new Vec3(),
			t;

		var ii,iii;
		for(var i=0; i < vecAry.length; i++){
			ii	= (i+1)%3;
			iii	= (i+2)%3;

			//Get the first two edges a = v0-v1, b = v2-v1
			edgeA.copy(vecAry[i]).sub(vecAry[ii]); //Vector Length BA
			edgeB.copy(vecAry[iii]).sub(vecAry[ii]); //Vector Length BC

			//Project EdgeA onto EdgeB to create a perpendicular line from the first point to the opposite edge.
			t = Vec3.dot(edgeA,edgeB) / Vec3.dot(edgeB,edgeB);	//Projection |a|.|b| / |b|.|b| = t  :: Project A onto B.
			perp.copy(edgeB).scale(t).add(vecAry[ii]);			//start + len*t

			Fungi.debugLine.addVecLine(vecAry[i],2, perp,2);

			//Project triangle point to i point onto perpendicular line
			perpLen.copy(perp).sub(vecAry[i]);	//Get length of perpendicular line from point to opposite edge
			iLen.copy(iPos).sub(vecAry[i]);		//Get Length of ipos from the starting point.
			t = Vec3.dot(iLen,perpLen) / Vec3.dot(perpLen,perpLen); //(1 - Projection) if needing Barycentric coord, else leave as is

			Fungi.debugPoint.addVecPoint(perpLen.scale(t).add(vecAry[ii]),2);

			if(t < 0 || t > 1) return null; //t must be between 0 and 1 to be successful
		}
		return iPos;
	}


Ray.pointInTriangle = pointInTriangle;
function pointInTriangle(p, a, b, c) {
    c.vsub(a,v0);
    b.vsub(a,v1);
    p.vsub(a,v2);
 
    var dot00 = v0.dot( v0 );
    var dot01 = v0.dot( v1 );
    var dot02 = v0.dot( v2 );
    var dot11 = v1.dot( v1 );
    var dot12 = v1.dot( v2 );
 
    var u,v;
 
    return  ( (u = dot11 * dot02 - dot01 * dot12) >= 0 ) &&
            ( (v = dot00 * dot12 - dot01 * dot02) >= 0 ) &&
            ( u + v < ( dot00 * dot11 - dot01 * dot01 ) );
}

	*/