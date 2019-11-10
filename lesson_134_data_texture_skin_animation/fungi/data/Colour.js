let COLORS = {
	"black"		: "#000000",
	"white"		: "#ffffff",
	"red"		: "#ff0000",
	"green"		: "#00ff00",
	"blue"		: "#0000ff",
	"fuchsia"	: "#ff00ff",
	"cyan"		: "#00ffff",
	"yellow"	: "#ffff00",
	"orange"	: "#ff8000",
};

//######################################################################
function Colour( c ){
	if( c == null || c == undefined ) return rgbArray( "#ff0000" );

	if( typeof c == "string" ){
		if( c.charAt(0) == "#" ) 	return rgbArray( c );
		else if( COLORS[ c ] )		return rgbArray( COLORS[ c ] );
	}else if( Array.isArray(c) ) return c;

	return rgbArray( "#ff0000" );		
}

//######################################################################
function rgbArray(){
	if(arguments.length == 0) return null;
	let ary = (Array.isArray(arguments[0]))? arguments[0] : arguments,
		rtn = [];

	for(var i=0, c, p; i < ary.length; i++){
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Handle Numeric Form
		if( ! isNaN( ary[i] ) ){
			c = parseInt( ary[i] );
			rtn.push(
				( c >> 16 & 255 )	* NORMALIZE_RGB,
				( c >> 8 & 255 )	* NORMALIZE_RGB,
				( c & 255 )			* NORMALIZE_RGB
			);
			continue;
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Handle Text Hex Form
		if(ary[i].length < 6) continue;
		c = ary[i];				//Just an alias(copy really) of the color text, make code smaller.
		p = (c[0] == "#")?1:0;	//Determine starting position in char array to start pulling from

		rtn.push(
			parseInt(c[p]	+c[p+1],16)	/ 255.0,
			parseInt(c[p+2]	+c[p+3],16)	/ 255.0,
			parseInt(c[p+4]	+c[p+5],16)	/ 255.0
		);
	}
	return rtn;
}

function rgbaArray(){
	if(arguments.length == 0) return null;
	let ary = (Array.isArray(arguments[0]))? arguments[0] : arguments,
		rtn = [];

	for(var i=0, c, p; i < ary.length; i++){
		if(ary[i].length < 8) continue;
		c = ary[i];				//Just an alias(copy really) of the color text, make code smaller.
		p = (c[0] == "#")?1:0;	//Determine starting position in char array to start pulling from

		rtn.push(
			parseInt(c[p]	+c[p+1],16)	/ 255.0,
			parseInt(c[p+2]	+c[p+3],16)	/ 255.0,
			parseInt(c[p+4]	+c[p+5],16)	/ 255.0,
			parseInt(c[p+6]	+c[p+7],16)	/ 255.0
		);
	}
	return rtn;
}

//######################################################################
Colour.rgb_array	= rgbArray();
Colour.rgba_array	= rgbaArray();
export default Colour;