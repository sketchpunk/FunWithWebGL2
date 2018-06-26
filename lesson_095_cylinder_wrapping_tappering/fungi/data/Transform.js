import Maths, { Vec3, Mat4, Quat } from "../Maths.js";

class Transform{
	constructor(name = "Transform"){
		//Transformation Data
		this._position		= new Vec3(0);
		this._scale			= new Vec3(1);
		this._rotation		= new Quat();
		this._isModified	= false;

		this.localMatrix	= new Mat4();
		this.worldMatrix	= new Mat4();

		//Parent / Child Relations
		this.children	= [];
		this._parent	= null;
		this._parentModified = false;

		//Misc
		this.name		= name;
		this._visible	= true;
	}

	//----------------------------------------------
	//region Setters/Getters
		//R  T  F  T    
		//00 04 08 12
		//01 05 09 13
		//02 06 10 14
		//03 07 11 15
		left(v, d=1){		return this._getDirection(0, 1, 2, d, v);	}
		up(v, d=1){			return this._getDirection(4, 5, 6, d, v);	}
		forward(v, d=1){	return this._getDirection(8, 9, 10, d, v);	}
		_getDirection(xi, yi, zi, d=1, out){
			this.updateMatrix(); //Need World Matrix Updated to get direction
			out = out || new Vec3();

			var x = this.worldMatrix[xi], 
				y = this.worldMatrix[yi], 
				z = this.worldMatrix[zi],
				m = 1 / Math.sqrt( x*x + y*y + z*z );

			out[0] = x * m * d;
			out[1] = y * m * d;
			out[2] = z * m * d;
			return out;
		}

		//Cascade Visibility Settings 
		get visible(){ return this._visible; }
		set visible(v){
			//if(this._visible == v) return; //If there is no change, then dont bother updating children.

			this._visible = v;
			if(this.children.length == 0) return;

			//Update the children with visibility.
			var child;
			for(child of this.children) child.visible = v;
		}

		copyTransform(t){
			this.position		= t._position;
			this.rotation		= t._rotation;
			this.scale			= t._scale;
			this._isModified 	= true;
			return this;
		}
	//endregion


	//----------------------------------------------
	//region Position / Translation
		set position(v){ this._isModified = true; this._position.copy(v); }

		get posx(){ return this._position[0]; }		set posx(v){ this._position[0] = v; this._isModified = true; }
		get posy(){ return this._position[1]; }		set posy(v){ this._position[1] = v; this._isModified = true; }
		get posz(){ return this._position[2]; }		set posz(v){ this._position[2] = v; this._isModified = true; }

		addPosition(v){			this._isModified = true; this._position.add(v); 	return this; }
		setPosition(x, y, z){ 	this._isModified = true; this._position.set(x,y,z);	return this; }
		getPosition(out=null){
			if(out != null){
				out[0] = this._position[0];
				out[1] = this._position[1];
				out[2] = this._position[2];
				return out;
			}else return new Vec3(this._position);
		}
	//endregion


	//----------------------------------------------
	//region Rotation
		set rotation(v){ this._isModified = true; this._rotation.copy(v); }

		setAxisAngle(v, a){ this._isModified = true; this._rotation.setAxisAngle(v,a); return this; }
		setDegrees(deg, axis="y"){ this._isModified = true; this._rotation["r"+axis](deg * Maths.DEG2RAD); return this;}
		getRotation(out=null){ return (out != null)? out.copy(this._rotation) : new Quat(this._rotation); }

		mulRotationAxis(axis, angle){ this._isModified = true; this._rotation.mulAxisAngle(axis, angle); return this; }
	//endregion


	//----------------------------------------------
	//region Scale
		set scale(v){ this._isModified = true; this._scale.copy(v); }

		get scalex(){ return this._scale[0]; }		set scalex(v){ this._scale[0] = v; this._isModified = true; }
		get scaley(){ return this._scale[1]; }		set scaley(v){ this._scale[1] = v; this._isModified = true; }
		get scalez(){ return this._scale[2]; }		set scalez(v){ this._scale[2] = v; this._isModified = true; }

		setScale(x, y = null, z = null){
			this._isModified = true;
			if(y==null && z==null) 	this._scale.set(x,x,x); //If not y,z then its a uniform scale
			else					this._scale.set(x,y,z);
			return this;
		}
	//endregion


	//----------------------------------------------
	//region
		// Conditions for when to handle matrix updating
		// if modified, Update Local, Update World, alert children
		// if not modified, but parent is, update world
		// if neither, exit
		// if parent assigned & parent is modified, call its UpdateMatrix Function
		//		This will cascade all its children that they need world update


		updateMatrix(){
			if(!this._parentModified && !this._isModified && (this._parent && !this._parent._isModified)) return false;

			var isUpdated = false;

			//......................................
			//If parent exists BUT its matrix hasn't been updated, Request Update.
			
			if(this._parent != null && this._parent._isModified){
				this._parent.updateMatrix();
			}
			
			//......................................
			//Local Transformation has changed, Update Local Matrix
			if(this._isModified){
				//Update our local Matrix
				Mat4.fromQuaternionTranslationScale(this.localMatrix, this._rotation, this._position, this._scale);

				//Alert Children that their parent matrix has been updated.
				var child;
				for(child of this.children) child.__parentModified();
			}

			//......................................
			//Figure out the world matrix.
			if(this._parent != null && (this._parentModified || this._isModified)){
				Mat4.mult(this.worldMatrix, this._parent.worldMatrix, this.localMatrix);
				this._parentModified	= false;
				this._isModified		= false;
				isUpdated = true;
			//if no parent, localMatrix is worldMatrix
			}else if(this._parent == null && this._isModified){	
				this.worldMatrix.copy(this.localMatrix);
				this._isModified = false;
				isUpdated = true;
			}

			return isUpdated;
		}
	//endregion


	//----------------------------------------------
	//region Parent-Child
		//This function should only be called by parent transforms
		//Hopefully this will help cascade down the tree that the world matrix needs to be updated.
		__parentModified(){
			if(this._parentModified) return;
			this._parentModified = true;

			if(this.children.length == 0) return;
			for(var i=0; i < this.children.length; i++) this.children[i].__parentModified();
		}

		get parent(){ this._parent; }
		
		//set parent(p){
		//	if(this._parent != null){ this._parent.removeChild(this); }
		//	if(p != null) p.addChild(this); //addChild also sets parent
		//}

		addChild(c){
			if(this.children.indexOf(c) == -1){ //check if child already exists
				if(c._parent != null) c._parent.removeChild(c);

				c._parent = this;
				this.children.push(c);
			}
			return this;
		}

		removeChild(c){ 
			var i = this.children.indexOf(c);
			if(i != -1){
				this.children[i]._parent = null;
				this.children.splice(i,1);
			}
			return this;
		}
	//endregion
}

export default Transform;