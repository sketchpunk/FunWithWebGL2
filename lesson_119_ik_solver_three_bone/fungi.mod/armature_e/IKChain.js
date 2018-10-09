import Maths, {Quat, Vec3 }	from "../../fungi/Maths.js";


///////////////////////////////////////////////////////////////////////
// Main Chain Class
// Used as a reference back to specific bones of an armature that are
// linked together in a parent-child relationship
///////////////////////////////////////////////////////////////////////
class IKChain{
	constructor(cnt){
		this.links		= new Array(cnt);	// Link of Joints
		this.length		= 0;				// Length of chain, Length of all Links Added Together
		this.count		= cnt;				// How many Links (Joints) in the chain.
	}

	//Create a chain based on an argument array of Bone Entities
	static create(){
		let cnt		= arguments.length,
			chain	= new IKChain( cnt ),
			len		= 0;

		for(let i=0; i < cnt; i++){
			chain.links[ i ] = arguments[ i ];
			len += arguments[ i ].com.Bone.length;
		}

		chain.length = len;
		return chain;
	}

	//Create a chain from  all the bones in an armature
	static createFromArmature(arm){
		let cnt		= arm.bones.length,
			chain	= new IKChain( cnt ),
			len		= 0;

		for(let i=0; i < cnt; i++){
			chain.links[ i ] = arm.bones[i];
			len += arm.bones[i].com.Bone.length;
		}

		chain.length = len;
		return chain;
	}
}


///////////////////////////////////////////////////////////////////////
// CHAIN POSE / STATE
// A non-destructive copy of an chain. Allow to play around with the chain's
// transform data before appling it back to the chain.
///////////////////////////////////////////////////////////////////////
class BoneState{
	constructor(){
		this.target			= new Vec3();		// Target Position used for FABIK
		this.boneLength 	= 0;				// Copy of the bone length, for quick access

		this.scale			= new Vec3(1,1,1);	// Transform Values
		this.position 		= new Vec3();
		this.rotation		= new Quat();

		this.useScale		= false;			// Which Transform components to use.
		this.usePosition	= false;
		this.useRotation	= false;
	}
}


class IKChainPose{
	constructor(chain, incWorldTarget=true, incRot=false, incPos=false, incScale=false){
		this.links = new Array(chain.count);
		this.count = chain.count;

		for(let i=0; i < chain.count; i++){
			this.links[ i ] = new BoneState();
			this.links[ i ].boneLength = chain.links[i].com.Bone.length;
		}
	}

	//Make a copy of the chain transform.
	set(chain, incWorldTarget=true, incRot=false, incPos=false, incScale=false){
		let bs;
		for(let i=0; i < this.count; i++){
			bs = this.links[i];
			if(incRot){		bs.rotation.copy( chain.links[i].com.Transform.rotation ); }	//bs.useRotation = true;
			if(incPos){		bs.position.copy( chain.links[i].com.Transform.position ); }	//bs.usePosition = true;
			if(incScale){	bs.scale.copy( chain.links[i].com.Transform.scale ); }		//bs.useScale = true;
			if(incWorldTarget) bs.target.copy( chain.links[i].com.TransformNode.position );
		}
		return this;
	}

	//Invert all the pose data, save to itself OR save the inverted data to another chain pose.
	invert(pb = null){
		for(let i=0; i < this.count; i++){
			// ROTATION
			if(this.links[i].useRotation){
				if(pb){
					this.links[i].rotation.invert( pb.links[i].rotation );
					pb.links[i].useRotation = true;
				}else this.links[i].rotation.invert();
			}

			// POSITION
			if(this.links[i].usePosition){
				if(pb){
					this.links[i].position.invert( pb.links[i].position );
					pb.links[i].usePosition = true;
				}else this.links[i].position.invert();
			}

			// SCALE
			if(this.links[i].useScale){
				if(pb){
					this.links[i].scale.invert( pb.links[i].scale );
					pb.links[i].useScale = true;
				}else this.links[i].scale.invert();
			}
		}
	}

	static applyTransform(c, p){
		let t, pl, cnt = Math.min( c.count, p.count );
		for(let i=0; i < cnt; i++){
			t	= c.links[ i ].com.Transform;
			pl	= p.links[i];
			if(pl.useRotation){	t.rotation.copy(	pl.rotation );	t.isModified = true; }
			if(pl.usePosition){	t.position.copy(	pl.position );	t.isModified = true; }
			if(pl.useScale){	t.scale.copy(		pl.scale );		t.isModified = true; }
		}
	}

	static applyLerp(c, pa, pb, t){
		var tran, a, b;
		for(let i=0; i < c.count; i++){
			tran	= c.links[i].com.Transform;
			a		= pa.links[i];
			b		= pb.links[i];

			//ROTATION
			if(a.useRotation || b.useRotation){
				Quat.lerp(a.rotation, b.rotation, t, tran.rotation);
				tran.rotation.normalize(); //When lerping quaternions, need to normalize else weird scaling errors happen.
				tran.isModified = true;
			}

			//POSITION
			if(a.usePosition || b.usePosition){
				Vec3.lerp(a.position, a.position, t, tran.position);
				tran.isModified = true;
			}

			//SCALE
			if(a.useScale || b.useScale){
				Vec3.lerp(a.scale, b.scale, t, tran.scale);
				tran.isModified = true;
			}
		}
	}
}




// TODO - Delete chain State when done refactoring solvers to use Pose instead of state.
class IKChainState{
	//Create a state based on an existing chain
	static create(chain, incWorldTarget=true, incRot=false, incPos=false, incScale=false){
		let out = new Array(chain.count);
		for(let i=0; i < chain.count; i++){
			out[ i ] = new BoneState();
			out[ i ].boneLength = chain.links[i].com.Bone.length;
		}

		return IKChainState.set(out, chain, incWorldTarget, incRot, incPos, incScale);
	}

	//Make a copy of the chain transform.
	static set(state, chain, incWorldTarget=true, incRot=false, incPos=false, incScale=false){
		let bs;
		for(let i=0; i < state.length; i++){
			bs = state[i];
			if(incRot){		bs.rotation.copy( chain.links[i].com.Transform.rotation ); }	//bs.useRotation = true;
			if(incPos){		bs.position.copy( chain.links[i].com.Transform.position ); }	//bs.usePosition = true;
			if(incScale){	bs.scale.copy( chain.links[i].com.Transform.scale ); }		//bs.useScale = true;
			if(incWorldTarget) bs.target.copy( chain.links[i].com.TransformNode.position );
		}
		return state;
	}

	static invert(sa, sb = null){
		for(let i=0; i < sa.length; i++){
			// ROTATION
			if(sa[i].useRotation){
				if(sb){
					sa[i].rotation.invert( sb[i].rotation );
					sb[i].useRotation = true;
				}else sa[i].rotation.invert();
			}

			// POSITION
			if(sa[i].usePosition){
				if(sb){
					sa[i].position.invert( sb[i].position );
					sb[i].usePosition = true;
				}else sa[i].position.invert();
			}

			// SCALE
			if(sa[i].useScale){
				if(sb){
					sa[i].scale.invert( sb[i].scale );
					sb[i].useScale = true;
				}else sa[i].scale.invert();
			}
		}
	}

	//Copy the state transform to the chain.
	static applyTransform(c, s){
		let t, cnt = Math.min( c.count, s.length );
		for(let i=0; i < cnt; i++){
			t = c.links[ i ].com.Transform;
			if(s[i].useRotation){	t.rotation.copy( s[i].rotation );	t.isModified = true; }
			if(s[i].usePosition){	t.position.copy( s[i].position );	t.isModified = true; }
			if(s[i].useScale){		t.scale.copy( s[i].scale );			t.isModified = true; }
		}
	}

	//Lerp between two different states then save the end result to the chain.
	static applyLerp(c, s0, s1, t){
		var tran;
		for(let i=0; i < c.count; i++){
			tran = c.links[i].com.Transform;

			//ROTATION
			if(s0[i].useRotation || s1[i].useRotation){
				Quat.lerp(s0[i].rotation, s1[i].rotation, t, tran.rotation);
				tran.rotation.normalize(); //When lerping quaternions, need to normalize else weird scaling errors happen.
				tran.isModified = true;
			}

			//POSITION
			if(s0[i].usePosition || s1[i].usePosition){
				Vec3.lerp(s0[i].position, s1[i].position, t, tran.position);
				tran.isModified = true;
			}

			//SCALE
			if(s0[i].useScale || s1[i].useScale){
				Vec3.lerp(s0[i].scale, s1[i].scale, t, tran.scale);
				tran.isModified = true;
			}
		}
	}
}


const QUAT_FWD2UP = new Quat().setAxisAngle(Vec3.LEFT, Maths.toRad(90));


export default IKChain;
export { IKChainState, IKChainPose, BoneState, QUAT_FWD2UP };