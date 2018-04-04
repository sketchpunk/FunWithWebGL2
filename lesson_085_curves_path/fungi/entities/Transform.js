import { Vec3,Mat4,Quat, DEG2RAD } from "../Maths.js";

class Transform{
	constructor(){
		//Transformation Data
		this.position		= new Vec3(0);
		this.scale			= new Vec3(1);
		this.rotation		= new Quat();
		this.localMatrix	= new Mat4();
		this.worldMatrix	= new Mat4();

		//Parent / Child Relations
		this.children	= [];
		this._parent	= null;

		//Misc
		this.name		= "";
		this.visible	= true;
	}

	//----------------------------------------------
	//region Setters/Getters
		//R  T  F  T    
		//00 04 08 12
		//01 05 09 13
		//02 06 10 14
		//03 07 11 15
		left(v,d=1){	return this._getDirection(0,1,2,d,v);	}
		up(v,d=1){		return this._getDirection(4,5,6,d,v);	}
		forward(v,d=1){	return this._getDirection(8,9,10,d,v);	}
		_getDirection(xi,yi,zi,d=1,v){
			this.updateMatrix();
			v = v || new Vec3();

			var x = this.localMatrix[xi], y = this.localMatrix[yi], z = this.localMatrix[zi],
				m =  Math.sqrt( x*x + y*y + z*z );

			v[0] = x/m*d;
			v[1] = y/m*d;
			v[2] = z/m*d;
			return v;
		}

		get parent(){ this._parent; }
		set parent(p){
			if(this._parent != null){ this._parent.removeChild(this); }
			if(p != null) p.addChild(this); //addChild also sets parent
		}

		//Chaining functions, useful for initializing
		setPosition(x,y,z){			this.position.set(x,y,z);				return this; }
		setScale(x,y,z){			this.scale.set(x,y,z);					return this; }
		setDegrees(deg,axis="x"){	this.rotation["r"+axis](deg * DEG2RAD);	return this; }
	//endregion

	//----------------------------------------------
	//region Methods
		updateMatrix(forceWorldUpdate=false){ 
			var isDirty = (this.position.isModified || this.scale.isModified || this.rotation.isModified);

			if(!isDirty && !forceWorldUpdate) return false;
			else if(isDirty){
				//Update our local Matrix
				Mat4.fromQuaternionTranslationScale(this.localMatrix, this.rotation, this.position, this.scale);

				//Set the modified indicator to false on all the transforms.
				this.position.isModified	= false;
				this.scale.isModified		= false;
				this.rotation.isModified	= false;
			}

			//Figure out the world matrix.
			if(this._parent != null){
				Mat4.mult(this.worldMatrix, this._parent.worldMatrix, this.localMatrix);
			}else this.worldMatrix.copy(this.localMatrix); //if not parent, localMatrix is worldMatrix

			return true;
		}


		addChild(c){
			if(this.children.indexOf(c) == -1){ //check if child already exists
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