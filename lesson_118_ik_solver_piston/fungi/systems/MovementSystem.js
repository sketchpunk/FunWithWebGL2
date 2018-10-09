import { System }		from "../Ecs.js";
import { Vec3, Quat }	from "../Maths.js";
import Fungi			from "../Fungi.js";

const QUERY_COM = ["Movement", "Transform"];

let GRAVITY		= new Vec3(0, -1, 0);
let FRICTION	= 0.99;

class MovementSystem extends System{
	constructor(){ super(); }

	setGravity(x,y,z){	GRAVITY.set(x,y,z);	return this; }
	setFriction(x){		FRICTION = x;		return this; }

	update(ecs){
		let m, t, e, val,
			ary	= ecs.queryEntities( QUERY_COM ),
			v	= new Vec3(),
			q 	= new Quat();

		for( e of ary ){
			if(!e.active) continue;
//console.log(e.name);
			t = e.com.Transform;
			m =	e.com.Movement;

			//....................................
			//Speed up velocity
			Vec3.scale(m.acceleration, Fungi.deltaTime, v)
			m.velocity.add( v );	 

			//....................................
			//Apply some restrictions to velocity
			if(m.useFriction) m.velocity.scale( FRICTION );
			m.velocity.nearZero();

			//....................................
			//Make the movement framerate independant
			t.position.add( Vec3.scale(m.velocity, Fungi.deltaTime, v) );
			t.isModified = true;

			//console.log(t.position);
			if(m.useGravity) t.position.add( Vec3.scale(GRAVITY, Fungi.deltaTime, v) );

			//....................................
			//Rotate toward direction of velocity
			if(m.doOrientation){
				Quat.lookRotation( m.velocity, Vec3.UP, q );	// Look at Rotation
				val = Quat.dot( t.rotation, q );

				//check angle, stop lerping once we're close enough to final rotation.
				if(val < 0.9999){
					//Quat.lerp(t._rotation, q, 0.05, t._rotation);
					Quat.lerp2(t.rotation, q, 3.5 * Fungi.deltaTime, t.rotation);
					t.rotation.normalize(); //Normalize gets rid of some wierd glitchy scaling that happens.
					//Quat.slerp(t._rotation, q, 3.5 * Fungi.deltaTime, t._rotation);
					t.isModified = true;
				}else{
					t.rotation.set(q);
					t.isModified = true;
					m.doOrientation = false;
				}
			}

			//....................................
			//t.isModified = true;
		}
	}
}

export default MovementSystem;