import Fungi from "../../fungi/Fungi.js";
import { Vec3, Quat, Mat4 } from "../../fungi/Maths.js";
import Frustum from "./Frustum.js";


class DirectionLight{
	constructor(x=3,y=3,z=-3){
		this._direction	= new Vec3();
		this._position	= new Vec3(x,y,z);
		this._position.normalize( this._direction ).invert();

		this.uboLighting = null;
	}

	setPositionVec(v){
		this._position.copy(v).normalize( this._direction ).invert();
		return this;
	}

	setPosition(x,y,z){
		this._position.set(x,y,z).normalize( this._direction ).invert();
		return this;
	}

	//TODO : Think about calculating the Ortho only once based on the main camera
	//Frustum, Then on render only moving the light camera. May not really need to
	// do all the recalcs for the ortho for each frame, just position and rotation of camera
	setShadowCamera(mainCam, lightCam, farDistance = 10){
		//...............................
		//Get Frustum of our main perspective camera
		var fPoints = Frustum.getPerspectivePoints(mainCam, farDistance );

		//Centroid of the World Space Perspective Frustum
		//This point is the origin we want for the Light Camera
		let centroid = new Vec3();
		for(let p of fPoints) centroid.add( p );
		centroid.scale( 1 / fPoints.length ); //Average for Centroid, n / pLen OR n * (1 / pLen)

		/*...............................
		Move Light Camera away from the centroid at the opposite direction */
		let distFromCentroid	= farDistance, //Add some offset Later
			lightCamPos			= Vec3.sub(centroid, Vec3.scale(this._direction, distFromCentroid) ),
			m4WorldToLight		= new Mat4();

		Mat4.lookAt(lightCamPos, centroid, Vec3.UP, m4WorldToLight); // Create View Matrix

		//-----------------------------------
		//Move Frustum to Light Space while calculating its bounding box in light space
		let min = new Vec3(Number.MAX_VALUE,Number.MAX_VALUE,Number.MAX_VALUE),
			max = new Vec3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE);

		for(let i of fPoints){
			Mat4.transformVec3(m4WorldToLight, i); //To Light Space

			//Bounding Box
			if(i[0] < min[0] )		min[0] = i[0];	// min.x
			else if(i[0] > max[0] )	max[0] = i[0];	// max.x

			if(i[1] < min[1] )		min[1] = i[1];	// min.y
			else if(i[1] > max[1] )	max[1] = i[1];	// max.x

			if(i[2] < min[2] )		min[2] = i[2];	// min.z
			else if(i[2] > max[2] )	max[2] = i[2];	// max.x
		}

		//-----------------------------------
		//Update Light Camera with the correct
		var xh = (Math.abs(max.x) + Math.abs(min.x)) * 0.5,
			yh = (Math.abs(max.y) + Math.abs(min.y)) * 0.5;

		lightCam.position = lightCamPos;
		lightCam.rotation = Quat.lookRotation( Vec3.sub(lightCamPos, centroid), Vec3.UP);
		//lightCam.setOrthographic( min.x, max.x, min.y, max.y, -max.z, -min.z );
		lightCam.setOrthographic( -xh, xh, -yh, yh, -max.z, -min.z );
		lightCam.updateMatrix();
	}

	updateUBO(){
		if(!this.uboLighting) this.uboLighting = Fungi.getUBO("UBOLighting");

		this.uboLighting.bind()
			.updateItem("lightPosition", this._position)
			.updateItem("lightDirection", this._direction)
			.unbind();

		return this;
	}
}

export default DirectionLight;