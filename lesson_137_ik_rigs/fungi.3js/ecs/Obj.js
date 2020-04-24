import App, { Components, Quat } from "../App.js";
import Vec3			from "../../fungi/maths/Vec3.js";
import Transform	from "../../fungi/maths/Transform.js";

class Obj{
	constructor(){
		this.ref = null;
	}

	dispose(){ this.ref = null; }

	set_pos( p ){
		if( arguments.length == 3 ) this.ref.position.fromArray( arguments );
		else if( p.length == 3 )	this.ref.position.fromArray( p );
		return this;
	}

	set_scl( x, y, z ){
		if( arguments.length == 1 ) this.ref.scale.set( x, x, x );
		else 						this.ref.scale.set( x, y, z );
		return this;
	}

	set_rot( q ){ this.ref.quaternion.fromArray( q ); return this; }
	look( dir, up ){
		let q = new Quat().from_look( dir, up || Vec3.UP );
		this.ref.quaternion.fromArray( q );
		return this;
	}

	get_transform(){
		let p = this.ref.position,
			q = this.ref.quaternion,
			s = this.ref.scale;
		return {
			pos: [ p.x, p.y, p.z ],
			rot: [ q.x, q.y, q.z, q.w ],
			scl: [ s.x, s.y, s.z ],
		};
	}

	set_ref( o ){
		this.ref = o; 
		App.scene.add( o );
		return this;
	}

} Components.reg( Obj );

export default Obj;