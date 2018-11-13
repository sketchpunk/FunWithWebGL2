import Maths, { Vec3 } from "../fungi/Maths.js";

//=============================================
// http://www.iquilezles.org/www/articles/functions/functions.htm
// http://iquilezles.org/www/articles/smin/smin.htm
// http://www.malinc.se/math/geogebra/curvesen.php
// http://mathworld.wolfram.com/SphericalSpiral.html
// http://regular-polygon.com/plugins/loxodrome/
// https://tex.stackexchange.com/questions/272874/artificial-line-in-pgfplots-3d-parametric-plots
// https://schoolbag.info/mathematics/barrons_ap_calculus/10.html
// https://sites.google.com/a/g.horrycountyschools.net/shuford-s-site/bc-calculus/chapter-8---polar-and-parametric-functions
// http://www.mathematische-basteleien.de/spirograph.htm
// https://archive.lib.msu.edu/crcmath/math/math/c/c696.htm
// https://www.encyclopediaofmath.org/index.php/Cornu_spiral
// http://www.thierry.maldonado.cc/tag/montagnes-russes/
// http://eljjdx.canalblog.com/archives/2007/03/03/4197265.html
// https://www.laetusinpraesens.org/docs10s/triskele.php
// https://gist.github.com/mbostock/22c3971eed37127f2ba8 cullmull - rom plus other
// https://stackoverflow.com/questions/9489736/catmull-rom-curve-with-no-cusps-and-no-self-intersections

class Curves{
	/////////////////////////////////////////////////////////////
	// 
	/////////////////////////////////////////////////////////////
	static parabola( x, k ){ return Math.pow( 4 * x * ( 1 - x ), k ); }

	/////////////////////////////////////////////////////////////
	// 
	/////////////////////////////////////////////////////////////	
	static lemniscate( angle, out = null ){ // lemniscate of Bernoulli
		let sin	= Math.sin( angle ),
			cos	= Math.cos( angle ), 
			f	= 1 + sin * sin,
			x 	= cos / f,
			y	= sin * cos / f;

		out = out || new Array(2);
		out[0] = x;
		out[1] = y;
		return out;
	}

	/////////////////////////////////////////////////////////////
	// 
	/////////////////////////////////////////////////////////////
	//https://codepen.io/jstrutz/pen/pvXOdz
	//tAngle 0 -> PI_2
	// Curves.lissajous(3,1,1,  1,0,1, i*inc , v);
	// Curves.lissajous(5,2,1,  0,-2,1, i * inc , v);
	// Curves.lissajous(2,3,1,  0,0.4,1, i * inc, v);
	static lissajous(xRng, yRng, zRng, xOffset, yOffset, zOffset, tAngle, out=null){
		out = out || new Vec3();

		out[0] = Math.sin(xRng * tAngle + xOffset);
		out[1] = Math.sin(yRng * tAngle + yOffset);
		out[2] = Math.sin(zRng * tAngle + zOffset);

		return out;
	}


	//https://github.com/spite/looper/blob/master/loops/233.js#L124
	// Curves.lissajous_2(1, 5,4,5,1,2, 0, i/cnt, v);
	// Curves.lissajous_2(1, 5,1,5,1,2, 0, i/cnt, v);
	static lissajous_2(radius, a,b,c,d,e, offset, t, out=null){
		out = out || new Vec3();

		//let tt = Maths.PI_2 - (t * Maths.PI_2 + i * range / cnt + offset * i);
		let tt = t * Maths.PI_2 + offset;
		out[0] = radius * Math.cos(a * tt) + radius * Math.cos(b * tt);
		out[1] = radius * Math.sin(a * tt) + radius * Math.sin(d * tt);
		out[2] = 2 * radius * Math.sin(e * tt);

		return out
	}
}

export default Curves;