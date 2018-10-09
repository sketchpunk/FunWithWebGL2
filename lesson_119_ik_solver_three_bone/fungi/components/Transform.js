import Maths, { Vec3, Quat, Mat4 }	from "../Maths.js";
import { Components }				from "../Ecs.js";

class Transform{
	constructor(){
		this.isModified	= true;
		this.position		= new Vec3();
		this.scale			= new Vec3(1,1,1);
		this.rotation		= new Quat();
		this.modelMatrix	= new Mat4();
	}

	
	//set position(v){	this._isModified = true; this._position.copy(v); }
	//get position(){		return this._position.clone(); }
	setPosition(x,y,z){	this.isModified = true; this.position.set(x,y,z); return this; }


	//set scale(v){		this._isModified = true; this._scale.copy(v); }
	//get scale(){		return this._scale.clone(); }
	setScale(x,y,z){
		this.isModified = true;
		if(arguments.length == 1)	this.scale.set(x,x,x);
		else 						this.scale.set(x,y,z);
		return this;
	}
	
	
	//set rotation(v){	this._isModified = true; this._rotation.copy(v); }
	//get rotation(){		return this._rotation.clone(); }
	setDegrees(deg, axis="y"){ this.isModified = true; this.rotation["r"+axis](deg * Maths.DEG2RAD); return this; }
	setAxisAngle(v, a){ this.isModified = true; this.rotation.setAxisAngle(v,a); return this; }

} Components(Transform);

export default Transform;