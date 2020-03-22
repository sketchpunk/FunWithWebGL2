import App		from "../App.js";
import Points	from "../geo/Points.js";
import Lines	from "../geo/Lines.js"

class Debug{
	static init(){
		this.ePnt	= Points.$( "debug_pnt" );
		this.eLn	= Lines.$( "debug_ln" );

		this.ePnt.Draw.priority	= 1001;
		this.ePnt.Draw.items[0].material.options.depthTest = false;
		this.eLn.Draw.priority	= 1000;
		this.eLn.Draw.items[0].material.options.depthTest = false;

		this.Pnt 	= this.ePnt.Points;
		this.Ln 	= this.eLn.Lines;

		this.Pnt.use_size	= 0.04;
		this.Pnt.use_shape	= 1;
	}

		static set_pnt_size( s ){ this.Pnt.use_size = s; return this; }
		static set_depth_test( s ){
			this.ePnt.Draw.items[0].material.options.depthTest	= s;
			this.eLn.Draw.items[0].material.options.depthTest	= s;
			return this;
		}

	////////////////////////////////////////////////////////////////////
	// POINTS
	////////////////////////////////////////////////////////////////////
		
		static pnt( pos, col="red", size=null, shape=null ){ this.Pnt.add( pos, col, size, shape ); return this; }
		static pnt_raw( x, y, z, col="red", size=null, shape=null ){ this.Pnt.add( [x,y,z], col, size, shape ); return this; }

	////////////////////////////////////////////////////////////////////
	// LINES
	////////////////////////////////////////////////////////////////////
		
		static ln( v0, v1, col_a="red", col_b=null, is_dash=false ){ this.Ln.add( v0, v1, col_a, col_b, is_dash ); return this; }

		static box( v0, v1, col="red", is_dash=false ){
			let x1 = v0[0], y1 = v0[1], z1 = v0[2], 
				x2 = v1[0], y2 = v1[1], z2 = v1[2],
				o = this.Ln;

			o.add( [x1,y1,z1], [x1,y1,z2], col, null, is_dash ); // Bottom
			o.add( [x1,y1,z2], [x2,y1,z2], col, null, is_dash );
			o.add( [x2,y1,z2], [x2,y1,z1], col, null, is_dash );
			o.add( [x2,y1,z1], [x1,y1,z1], col, null, is_dash );
			o.add( [x1,y2,z1], [x1,y2,z2], col, null, is_dash ); // Top
			o.add( [x1,y2,z2], [x2,y2,z2], col, null, is_dash );
			o.add( [x2,y2,z2], [x2,y2,z1], col, null, is_dash );
			o.add( [x2,y2,z1], [x1,y2,z1], col, null, is_dash );
			o.add( [x1,y1,z1], [x1,y2,z1], col, null, is_dash ); // Sides
			o.add( [x1,y1,z2], [x1,y2,z2], col, null, is_dash );
			o.add( [x2,y1,z2], [x2,y2,z2], col, null, is_dash );
			o.add( [x2,y1,z1], [x2,y2,z1], col, null, is_dash );
			return this;
		}

	////////////////////////////////////////////////////////////////////
	// MISC
	////////////////////////////////////////////////////////////////////
		
		static quat( q, offset=null, scl=1, color=null ){
			let v = new App.Vec3();
			offset = offset || App.Vec3.ZERO;
			this
				.ln( offset, v.from_scale( App.Vec3.FORWARD, scl ).transform_quat( q ).add( offset ), (color || "green") )
				.ln( offset, v.from_scale( App.Vec3.UP, scl ).transform_quat( q ).add( offset ), (color || "blue") )
				.ln( offset, v.from_scale( App.Vec3.LEFT, scl ).transform_quat( q ).add( offset ), (color || "red") );
			return this;
		}

		static axis( a, offset=null, scl=1, color=null ){
			let v = new App.Vec3();
			offset = offset || App.Vec3.ZERO;
			this
				.ln( offset, v.from_scale( a.z, scl ).add( offset ), (color || "green") )
				.ln( offset, v.from_scale( a.y, scl ).add( offset ), (color || "blue") )
				.ln( offset, v.from_scale( a.x, scl ).add( offset ), (color || "red") );
			return this;
		}
		
		static reset( flag = 3 ){
			if( (flag & 1) != 0 ) this.Pnt.reset();
			if( (flag & 2) != 0 ) this.Ln.reset();
			return this;
		}
}

Debug.ePnt	= null;
Debug.Pnt 	= null;
Debug.eLn	= null;
Debug.Ln	= null;

App.Debug	= Debug;

export default Debug;