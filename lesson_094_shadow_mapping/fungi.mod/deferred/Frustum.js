import {Vec3, Mat4, Quat} from "../../fungi/Maths.js";

class Frustum{
	static getPerspectivePoints(cam, far = null){
		// Length from camera point the near and far center parts are
		let nearLen	= cam.near,
			farLen	= far || cam.far, //Custom far incase wanting to limit the reach
			// Determine the Start and End Center Points of the Frustum.
			vForward	= cam.forward().invert(), //Camera's forward is actually backward
			vNear		= Vec3.scale(vForward, nearLen).add(cam._position),
			vFar		= Vec3.scale(vForward, farLen).add(cam._position),
			//Width and Height of the Near and Far Planes of the Frustum.
			hNear		= 2 * Math.tan( cam.fov / 2 ) * nearLen,
			wNear		= hNear * cam.ratio,
			hFar		= 2 * Math.tan( cam.fov / 2 ) * farLen,
			wFar		= hFar * cam.ratio,
			//Some Extra Direction Vectors to determine Far/Near Planes
			vUp			= cam.up(),
			vLeft		= cam.left(),
			incUp 		= new Vec3(),
			incLeft 	= new Vec3(),
			out			= new Array(8);

		//-----------------
		//Near Plane
		Vec3.scale(vUp, hNear/2, incUp);		//Move up half of height
		Vec3.scale(vLeft, wNear/2, incLeft);	//Move left half of width

		out[0] = Vec3.add(vNear, incUp).add(incLeft);	//tl = ncenter + (up * Hnear/2) - (right * Wnear/2)
		out[1] = Vec3.sub(vNear, incUp).add(incLeft);	//bl = ncenter - (up * Hnear/2) - (right * Wnear/2)
		out[2] = Vec3.sub(vNear, incUp).sub(incLeft);	//br = ncenter - (up * Hnear/2) + (right * Wnear/2)
		out[3] = Vec3.add(vNear, incUp).sub(incLeft);	//tr = ncenter + (up * Hnear/2) + (right * Wnear/2)

		//-----------------
		//Far Plane
		Vec3.scale(vUp, hFar/2, incUp);		//Move up half of height
		Vec3.scale(vLeft, wFar/2, incLeft);	//Move left half of width

		out[4] = Vec3.add(vFar, incUp).add(incLeft);	//ftl = fc + (up * Hfar/2) - (right * Wfar/2)
		out[5] = Vec3.sub(vFar, incUp).add(incLeft);	//fbl = fc - (up * Hfar/2) - (right * Wfar/2)
		out[6] = Vec3.sub(vFar, incUp).sub(incLeft);	//fbr = fc - (up * Hfar/2) + (right * Wfar/2)
		out[7] = Vec3.add(vFar, incUp).sub(incLeft);	//ftr = fc + (up * Hfar/2) + (right * Wfar/2)

		return out;
	}

	static getOrthoCameraPoints(cam){
		return Frustum.getOrthoPoints(cam, cam.oleft, cam.oright, cam.obottom, cam.otop, cam.onear, cam.ofar);
	}
	static getOrthoPoints(cam, left, right, down, up, near, far){
		let vForward	= cam.forward().invert(),
			vUp			= cam.up(),
			vLeft		= cam.left().invert(),
			tmp 		= new Vec3();

		let out = [	cam._position.clone(), cam._position.clone(),
					cam._position.clone(), cam._position.clone(),
					null, null, null, null ];

		Vec3.scale(vLeft, left, tmp);
		out[0].add( tmp ); //Top Left
		out[1].add( tmp ); //Bot Left

		Vec3.scale(vLeft, right, tmp);
		out[2].add( tmp ); //Bot Right
		out[3].add( tmp ); //Top Right

		Vec3.scale(vUp, up, tmp);
		out[0].add( tmp ); //Top Left
		out[3].add( tmp ); //Top Right

		Vec3.scale(vUp, down, tmp);
		out[1].add( tmp ); //Bot Left
		out[2].add( tmp ); //Bot Right

		//Make copy for Far Plane
		Vec3.scale(vForward, far, tmp);
		out[4] = out[0].clone().add(tmp);
		out[5] = out[1].clone().add(tmp);
		out[6] = out[2].clone().add(tmp);
		out[7] = out[3].clone().add(tmp);

		//Move Near plane into position.
		Vec3.scale(vForward, near, tmp);
		out[0].add(tmp);
		out[1].add(tmp);
		out[2].add(tmp);
		out[3].add(tmp);

		return out;
	}

	static getBoundingPoints(min, max){
		return [
			new Vec3( max.x, max.y, min.z), //Near
			new Vec3( max.x, min.y, min.z),
			new Vec3( min.x, min.y, min.z),
			new Vec3( min.x, max.y, min.z),
			new Vec3( max.x, max.y, max.z), //Far
			new Vec3( max.x, min.y, max.z),
			new Vec3( min.x, min.y, max.z),
			new Vec3( min.x, max.y, max.z)
		];
	}

	static visualize(ary, dPoint, dLine, lineColor=8){
		let x, i, ii;
		for(x=0; x < 4; x++){
			i	= x % 4;
			ii	= (i+1) % 4;

			dPoint.addVec( ary[x], 1 );				//Near Plane Points
			dPoint.addVec( ary[x+4], 0 );			//Far Plane Points

			dLine.addVec( ary[i], ary[ii], lineColor );		//Near Plane Lines
			dLine.addVec( ary[i+4], ary[ii+4], lineColor );	//Far Plane Lines

			dLine.addVec( ary[i], ary[i+4], lineColor );	//Near-Far Connecting Lines
		}
	}
}

export default Frustum;