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

const NORMALIZE_RGB = 1 / 255.0;

//######################################################################
function Colour( c, use_alpha=null ){
	if( c ){
		if( typeof c == "string" ){
			if( c.charAt(0) == "#" )	return ( c.length == 7 )? rgb_array( c ) : rgba_array( c );
			else if( COLORS[ c ] )		return (!use_alpha)? rgb_array( COLORS[ c ] ) : rgba_array( COLORS[ c ]+use_alpha );
		}else if( Array.isArray(c) ) 	return (!use_alpha)? rgb_array.apply( null, c ) : rgba_array.apply( null, c );
	}

	return (!use_alpha)? rgb_array( "#ff0000" ) : rgba_array( "#ff0000ff" );
}

//######################################################################
function rgb_array(){
	if( arguments.length == 0 ) return null;
	let ary = ( Array.isArray( arguments[0] ) )? arguments[0] : arguments,
		rtn = [];

	for( let i=0, c, p; i < ary.length; i++ ){
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
		c = ary[i]; 
		if( c.charAt(0) != "#" ) c = COLORS[ c ];

		p = (c[0] == "#")?1:0;	//Determine starting position in char array to start pulling from
		rtn.push(
			parseInt( c[1] + c[2], 16 ) * NORMALIZE_RGB,
			parseInt( c[3] + c[4], 16 ) * NORMALIZE_RGB,
			parseInt( c[5] + c[6], 16 ) * NORMALIZE_RGB
		);
	}
	return rtn;
}

function rgba_array(){
	if( arguments.length == 0 ) return null;
	let ary = ( Array.isArray( arguments[0] ) )? arguments[0] : arguments,
		rtn = [];

	for( let i=0, c, p; i < ary.length; i++ ){
		if( ary[i].length < 8 ) continue;
		c = ary[i];				// Just an alias(copy really) of the color text, make code smaller.
		p = (c[0] == "#")?1:0;	// Determine starting position in char array to start pulling from

		rtn.push(
			parseInt(c[p]	+c[p+1],16)	* NORMALIZE_RGB,
			parseInt(c[p+2]	+c[p+3],16)	* NORMALIZE_RGB,
			parseInt(c[p+4]	+c[p+5],16)	* NORMALIZE_RGB,
			parseInt(c[p+6]	+c[p+7],16)	* NORMALIZE_RGB
		);
	}
	return rtn;
}

//######################################################################
Colour.rgb	= rgb_array;
Colour.rgba	= rgba_array;
export default Colour;