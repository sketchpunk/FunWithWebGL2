import Fungi					from "../../fungi/Fungi.js";
import Maths, { Vec3, Quat }	from "../../fungi/Maths.js";
import { QUAT_FWD2UP }			from "./IKChain.js";


///////////////////////////////////////////////////////////////////////
// 
///////////////////////////////////////////////////////////////////////
class IKChainAnimator{
	constructor(json=null){
		this.cycle				= new Cycle();

		this.forwardDir			= new Quat();

		this.axis				= null;
		this.axisFrom			= null;
		this.axisTo				= null;

		this.rotateFrom			= null; //new Quat().setAxisAngle(Vec3.FORWARD, -45);
		this.rotateTo			= null; //new Quat().setAxisAngle(Vec3.FORWARD, 45);

		this.rotateCycleOffset	= 0;
		this.rotateCurve		= "sin";

		this.scaleFrom			= 1.0;
		this.scaleTo			= 1.0;
		this.scaleCycleOffset	= 0;
		this.scaleCurve			= "sin01";

		if( json ) this.set(json);
	}

	set( json ){
		//dir:[0,-1,0], bendDir:[0,0,1], cyclePerSec:3
		Quat.lookRotation( json.dir, json.bendDir, this.forwardDir ).mul( QUAT_FWD2UP );

		if(json.cyclePerSec) this.cycle.setBySeconds( json.cyclePerSec );

		//............................................
		//axis:[1,0,0], axisFrom:45, axisTo:null
		this.rotateCurve		= ( json.rotateCurve )?			json.rotateCurve		: "sin";
		this.rotateCycleOffset	= ( json.rotateCycleOffset )? 	json.rotateCycleOffset	: 0;

		if(json.axis){
			this.axis		= new Vec3( json.axis );
			this.axisFrom	= Maths.toRad( json.axisFrom );

			if(json.axisTo != null && json.axisTo != undefined){
				this.axisTo = Maths.toRad( json.axisTo );
			}
		}

		//............................................
		//scaleFrom: 0.6, scaleTo: 1.0, scaleCycleOffset: 0.9, scaleCurve: "sin01"
		this.scaleFrom			= ( json.scaleFrom != null && json.scaleFrom != undefined )? json.scaleFrom : 1.0;
		this.scaleTo			= ( json.scaleTo != null && json.scaleTo != undefined )? json.scaleTo : 1.0;
		this.scaleCurve			= ( json.scaleCurve )? json.scaleCurve : "sin01";
		this.scaleCycleOffset	= ( json.scaleCycleOffset )? json.scaleCycleOffset : 0.0;
		this.scaleCycleOffset	= this.rotateCycleOffset + this.scaleCycleOffset;
	}

	updateTarget( target ){
		this.cycle.update();
		let n = IKChainAnimator[ this.rotateCurve ]( this.cycle.get( this.rotateCycleOffset ) );
		let q = new Quat();

		// Use Axis Rotations
		if(this.axis != null){
			if(this.axisTo == null)	q.setAxisAngle(this.axis, this.axisFrom * n);
			else					q.setAxisAngle(this.axis, Maths.lerp( this.axisFrom, this.axisTo, n ) );
		}else{
			// Rotation Lerping
			Quat.lerp(this.rotateFrom, this.rotateTo, n, q).normalize();
		}

		q.pmul( this.forwardDir );

		//-------------------------------------
		n	= IKChainAnimator[ this.scaleCurve ]( this.cycle.get( this.scaleCycleOffset ) );
		n 	= Maths.lerp(this.scaleFrom, this.scaleTo, n);
		target.setRotationScale(q, n);
	}
}

IKChainAnimator.sin			= function(i){ return Math.sin(i); }
IKChainAnimator.sin01		= function(i){ return Math.sin(i) * 0.5 + 0.5; }
IKChainAnimator.sinabs		= function(i){ return Math.abs( Math.sin(i) ); }
IKChainAnimator.cycle01 	= function(v){ return v * Maths.PI_2_INV; }
IKChainAnimator.cycle010 	= function(v){ 
	var n = v * Maths.PI_2_INV * 2;
	return ( n > 1 )? 1 - (n - 1) : n;
}


///////////////////////////////////////////////////////////////////////
// 
///////////////////////////////////////////////////////////////////////
class Cycle{
	constructor(sec=1){
		this.cycle			= 0;	// Current Cycle Value
		this.cycleInc		= 0;	// How much to move per millisecond
		this.speedScale		= 1.0;	// Scale the rate of the cycle
		this.setBySeconds(sec);
	}

	setBySeconds(s){ this.cycleInc	= Maths.PI_2 / ( s * 1000 ); return this;}

	backwards(){	if( this.speedScale > 0 ) this.speedScale *= -1; return this;}
	forwards(){		if( this.speedScale < 0 ) this.speedScale *= -1; return this;}

	get(offset=0){ return (this.cycle +  offset) % Maths.PI_2; }

	update(){
		this.cycle += (Fungi.deltaTime * 1000 * this.speedScale) * this.cycleInc;
		return this;
	}
}


export default IKChainAnimator;