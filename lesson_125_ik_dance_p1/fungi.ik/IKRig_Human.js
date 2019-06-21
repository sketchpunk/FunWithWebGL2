import App		from "../fungi/engine/App.js";
import IKChain	from "./IKChain.js";
import Armature from "../fungi.armature/Armature.js";
import Pose 	from "../fungi.armature/Pose.js";


/*
{ 	spine: ["","",""]
	leg_l: [ "","" ],
	leg_r: [],
	arm_l: [],
	arm_r: [],
	foot_r: "",
	foot_l: "",
	neck:"",
	hip:""
}
*/

//#####################################################################
class IKRig_Human{
	constructor( e, json ){
		this.entity = e;
		//this.chain	= new IKChain( e.Armature, bNames );
		this.pose	= new Pose( e.Armature, true );

		if( json.leg_l ) this.leg_l	= new IKChain( e.Armature, json.leg_l, "z" );
		if( json.leg_r ) this.leg_r	= new IKChain( e.Armature, json.leg_r, "z" );
		if( json.arm_l ) this.arm_l	= new IKChain( e.Armature, json.arm_l, "x" );
		if( json.arm_r ) this.arm_r	= new IKChain( e.Armature, json.arm_r, "x" );

		if( json.hip )   this.hip   = Armature.getBone( e.Armature, json.hip ).Bone.order;
		if( json.spine ) this.spine	= new IKChain( e.Armature, json.spine );;
		
		//this.hand_l	= Armature.getBone( e.Armature, json.hand_l ).Bone.order;
		//this.hand_r	= Armature.getBone( e.Armature, json.hand_r ).Bone.order;
	}

	getEBone( i ){ return this.entity.Armature.bones[ i ]; }
	getPBone( i ){ return this.pose.bones[ i ]; }

	getPHip(){ return this.pose.bones[ this.hip ]; }
	//update(){ this.pose.apply(); return this; }
}


//#####################################################################
export default IKRig_Human;