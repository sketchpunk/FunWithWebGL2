import App	from "./App.js";
import Vec3	from "../maths/Vec3.js";
import DVerts, { DynamicVertsSystem } from "./ecs/DynamicVerts.js";


//#########################################################################
// Private Entity References
let eLine, ePoint;


//#########################################################################
class Debug{
	static init( ecs, priority=100 ){
		ePoint	= DVerts.$( App.$Draw( "Debug_Point" ), "Debug_Points", "VecWColor", 0 );
		eLine	= DVerts.$( App.$Draw( "Debug_Line" ), "Debug_Lines", "VecWColor", 1 );
		DynamicVertsSystem.init( ecs, priority );

		ePoint.Draw.priority	= 1000;
		eLine.Draw.priority		= 1000;

		App.debug = this;
	}

	////////////////////////////////////////////////////////////////////
	// POINTS
	////////////////////////////////////////////////////////////////////
		static point( v, color = 0 ){ DVerts.vecPoint( ePoint, v, color ); return Debug; }
		static rawPoint( x, y, z, color ){ DVerts.rawPoint( ePoint, x, y, z, color); return Debug; }


	////////////////////////////////////////////////////////////////////
	// LINES
	////////////////////////////////////////////////////////////////////
		static line( v0, v1, c0 = 0, c1 = null ){ DVerts.vecLine( eLine, v0, v1, c0, c1); return Debug; }


	////////////////////////////////////////////////////////////////////
	// OTHER
	////////////////////////////////////////////////////////////////////
		static quat( q, offset = null, scale = 1 ){
			let v = new Vec3();
			offset = offset || Vec3.ZERO;
			Debug
				.line( offset, Vec3.transformQuat( Vec3.scale( Vec3.FORWARD, scale, v) , q, v).add( offset ), 1 )
				.line( offset, Vec3.transformQuat( Vec3.scale( Vec3.UP, scale, v), q, v).add( offset ), 2 )
				.line( offset, Vec3.transformQuat( Vec3.scale( Vec3.LEFT, scale, v), q, v).add( offset ), 0 );

			return Debug;
		}

		static box( v0, v1, c=0 ){ DVerts.vecBox( eLine, v0, v1, c ); return Debug; }
		static rawBox( x0, y0, z0, x1, y1, z1, c=0 ){ DVerts.rawBox( eLine, x0, y0, z0, x1, y1, z1, c ); return Debug; }


	////////////////////////////////////////////////////////////////////
	// SUPPORT
	////////////////////////////////////////////////////////////////////
		static reset( flag = 3 ){
			if( (flag & 1) != 0 ) DVerts.reset( ePoint );
			if( (flag & 2) != 0 ) DVerts.reset( eLine );
			return Debug;
		}
}


//#########################################################################
App.debug = Debug;
export default Debug;