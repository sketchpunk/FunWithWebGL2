import { Vec3 }			from "../Maths.js";
import { Components }	from "../Ecs.js";

class Movement{
	constructor(){
		this.mass			= 1;
		this.velocity		= new Vec3();
		this.acceleration	= new Vec3();
		this.useGravity		= false;
		this.useFriction	= false;
		this.doOrientation	= false;
	}

	set(uGrav, uFric){
		this.useGravity = uGrav;
		this.useFriction = uFric;
		return this;
	}
} Components(Movement);

export default Movement;