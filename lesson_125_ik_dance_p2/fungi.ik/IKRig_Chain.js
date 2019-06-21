import App		from "../fungi/engine/App.js";
import Pose		from "../fungi.armature/Pose.js";
import Solver	from "./Solver.js";
import IKChain	from "./IKChain.js";


//#####################################################################
class IKRig_Chain{
	constructor( e, bNames, solver ){
		this.entity = e;
		this.chain	= new IKChain( e.Armature, bNames );
		this.pose 	= new Pose( e.Armature, true );
		this.solver = solver || Solver.limb;
	}

	toPoint( pos ){	
		let wt = App.node.getWorldTransform( this.entity, null, true );

		if( !this.chain.targetPoint( pos, wt ) ){
			this.chain.resetPose( this.pose, 1 );
			Solver.aim( this.chain, this.pose, true );
		}else{
			this.solver( this.chain, this.pose, true );
		}

		return this;
	}

	update(){ this.pose.apply(); return this; }
}


//#####################################################################
export default IKRig_Chain;