import Vec3 from "./Vec3.js";
import Quat from "./Quat.js";


class Transform{
	constructor( t ){
		this.rot	= new Quat();
		this.pos	= new Vec3();
		this.scl 	= new Vec3( 1, 1, 1 );

		if( arguments.length == 1 ){
			this.rot.copy( t.rot );
			this.pos.copy( t.pos );
			this.scl.copy( t.scl );
		}else if( arguments.length == 3 ){
			this.rot.copy( arguments[ 0 ] );
			this.pos.copy( arguments[ 1 ] );
			this.scl.copy( arguments[ 2 ] );
		}
	}

	//////////////////////////////////////////////////////////////////////
	// GETTER / SETTER
	//////////////////////////////////////////////////////////////////////
		copy( t ){
			this.rot.copy( t.rot );
			this.pos.copy( t.pos );
			this.scl.copy( t.scl );
			return this;
		}

		set( r=null, p=null, s=null ){
			if( r )	this.rot.copy( r );
			if( p )	this.pos.copy( p );
			if( s )	this.scl.copy( s );
			return this;
		}

		clone(){ return new Transform( this ); }

	//////////////////////////////////////////////////////////////////////
	// METHODS
	//////////////////////////////////////////////////////////////////////
		from_add( tp, tc ){
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			//POSITION - parent.position + ( parent.rotation * ( parent.scale * child.position ) )
			let v = new Vec3().from_mul( tp.scl, tc.pos ); // parent.scale * child.position;
			Vec3.transformQuat( v, tp.rot, v );
			this.pos.from_add( tp.pos, v ); // Vec3.add( tp.pos, v, this.pos );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// SCALE - parent.scale * child.scale
			this.scl.from_mul( tp.scl, tc.scl ); //Vec3.mul( tp.scl, tc.scl, this.scl );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// ROTATION - parent.rotation * child.rotation
			this.rot.from_mul( tp.rot, tc.rot ); //Quat.mul( tp.rot, tc.rot, this.rot );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			return this;
		}

		add( cr, cp, cs = null ){
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			//If just passing in Tranform Object
			if(arguments.length == 1){
				cr = arguments[0].rot;
				cp = arguments[0].pos;
				cs = arguments[0].scl;
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			//POSITION - parent.position + ( parent.rotation * ( parent.scale * child.position ) )
			let v = new Vec3();
			Vec3.mul( this.scl, cp, v ); // parent.scale * child.position;
			this.pos.add( Vec3.transformQuat( v, this.rot, v ) );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// SCALE - parent.scale * child.scale
			if(cs) this.scl.mul( cs );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// ROTATION - parent.rotation * child.rotation
			this.rot.mul( cr );

			return this;
		}

		add_pos( cp, ignore_scl = false ){
			//POSITION - parent.position + ( parent.rotation * ( parent.scale * child.position ) )
			if( ignore_scl )	this.pos.add( Vec3.transformQuat( cp, this.rot ) );
			else 				this.pos.add( Vec3.mul( this.scl, cp ).transform_quat( this.rot ) );
			return this;
		}

		clear(){
			this.pos.set( 0, 0, 0 );
			this.scl.set( 1, 1, 1 );
			this.rot.reset();
			return this;
		}

		transformVec( v, out = null ){
			out = out || v;
			//GLSL - vecQuatRotation(model.rotation, a_position.xyz * model.scale) + model.position;
			Vec3.mul( v, this.scl, out );
			Vec3.transformQuat( out, this.rot, out ).add( this.pos );
			return out;
		}

		dispose(){
			delete this.pos;
			delete this.rot;
			delete this.scl;
		}

	//////////////////////////////////////////////////////////////////////
	// STATIC FUNCTIONS
	//////////////////////////////////////////////////////////////////////
		static add( tp, tc, tOut ){
			tOut = tOut || new Transform();

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			//POSITION - parent.position + ( parent.rotation * ( parent.scale * child.position ) )
			let v = new Vec3();
			Vec3.mul( tp.scl, tc.pos, v ); // parent.scale * child.position;
			Vec3.transformQuat( v, tp.rot, v );
			Vec3.add( tp.pos, v, tOut.pos );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// SCALE - parent.scale * child.scale
			Vec3.mul( tp.scl, tc.scl, tOut.scl );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// ROTATION - parent.rotation * child.rotation
			Quat.mul( tp.rot, tc.rot, tOut.rot );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			return tOut;
		}

		static invert( t, inv ){
			inv = inv || new Transform();

			// Invert Rotation
			t.rot.invert( inv.rot );		

			// Invert Scale
			inv.scl.x = ( t.scl.x != 0 )? 1 / t.scl.x : 0;
			inv.scl.y = ( t.scl.y != 0 )? 1 / t.scl.y : 0;
			inv.scl.z = ( t.scl.z != 0 )? 1 / t.scl.z : 0;

			// Invert Position : rotInv * ( invScl * invPos )
			t.pos.invert( inv.pos ).mul( inv.scl );
			Vec3.transformQuat( inv.pos, inv.rot, inv.pos );

			return inv;
		}
}

export default Transform;

/*
	World Space Position to Local Space.
	
	V	.copy( gBWorld.eye_lid_upper_mid_l.pos ) // World Space Postion
	 	.add( [0, -0.05 * t, 0 ] )	//Change it
		.sub( gBWorld.eye_l.pos )	// Subtract from Parent's WS Position
		.div( gBWorld.eye_l.scl )	// Div by Parent's WS Scale
		.transform_quat( gBWorld.eye_l.rot_inv );	// Rotate by Parent's WS Inverse Rotation
*/