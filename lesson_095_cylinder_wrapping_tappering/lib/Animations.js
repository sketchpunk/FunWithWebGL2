import Fungi	from "../fungi/Fungi.js";
import Maths, { Quat } from "../fungi/Maths.js";

function SpinAnimation(o, speed, initQuat = null){
	if(!initQuat) initQuat = new Quat();
	return ()=>{
		o.rotation = Quat.rotateY( initQuat, Maths.sawtoothWave(Fungi.sinceStart * speed, 0, Maths.PI_2), new Quat() );
	}
}

export {
	SpinAnimation
};