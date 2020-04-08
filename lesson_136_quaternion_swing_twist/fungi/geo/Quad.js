import App	from "../App.js";

let QUAD_MESH = null;

function Quad( name, mat  ){
	if( !QUAD_MESH ){
		let d = Quad.geo();
		QUAD_MESH = App.Mesh.from_data( "FungiQuad", d.vert, d.idx, d.norm, d.uv );
	}
	return App.$Draw( name, QUAD_MESH, mat, App.Mesh.TRI );
}

Quad.geo = function(){
	return {
		uv			: [ 0.0,0.0,   0.0,1.0,   1.0,1.0,   1.0,0.0 ],
		idx 		: [ 0,1,2, 2,3,0 ],
		vert		: [ -0.5, 0.5, 0.0,
						-0.5, -0.5, 0.0,
						0.5, -0.5, 0.0,
						0.5, 0.5, 0.0, ],
		norm		: [ 0,0,1,	0,0,1,	0,0,1,	0,0,1 ],
	};
	/*
	bx0=-0.5, by0=-0.5, bz0=0, bx1=0.5, by1=0.5, bz1=0, stand=true
	return {
		uv			: [ 0.0,0.0,   1.0,0.0,   1.0,1.0,   0.0,1.0 ],
		idx 		: [ 0,1,2, 2,3,0 ],
		vert		: (stand)?
				[ bx0,by0,bz0,   bx1,by0,bz1,   bx1,by1,bz0,   bx0,by1,bz0 ] :
				[ bx0,by0,bz0,   bx0,by0,bz1,   bx1,by1,bz1,   bx1,by1,bz0 ],
		norm		: [ 0,0,1,	0,0,1,	0,0,1,	0,0,1 ],
	};
	*/
}

export default Quad;