class Page{
	////////////////////////////////////////////////////////////////////
	// 
	////////////////////////////////////////////////////////////////////
	//static timeout( func ){ setTimeout( func, 50 ); return Page; }
	//static onLoad( func ){ window.addEventListener("load", func ); return Page; }

	static init( layoutMode = 0 ){
		let l = window.location;
		Page.url	= `${l.protocol}//${l.hostname}:${l.port}/`;
		Page.body	= document.getElementsByTagName("body")[0];

		Page.addCSS( "./fungi/engine/lib/Page.css" ).layout( layoutMode );
		return Page;
	}


	////////////////////////////////////////////////////////////////////
	// 
	////////////////////////////////////////////////////////////////////
	static addCSS(path){
		let head = document.getElementsByTagName("head")[0],
			link = document.createElement("link");

		link.rel	= "stylesheet";
		link.type	= "text/css";
		link.media	= "all";
		link.href	= path;

		head.appendChild( link );

		return Page;
	}

	static layout( m ){
		let canvas 	= document.createElement("canvas");

		//..............................................
		switch( m ){
			case Page.FULL: Page.body.className = "FULL"; break;
			case Page.PANEL:
				let sec = document.createElement("section");
				sec.style.gridArea	= "panel";
				sec.id 				= "pgPanel";
				sec.className		= "OverlayPanel";

				Page.body.className	= "C2_R1";
				Page.body.appendChild(sec);
			break;
		}
		
		//..............................................
		canvas.style.gridArea	= "main";
		canvas.id 				= "pgCanvas";
		Page.body.appendChild(canvas);

		return Page;
	}

	////////////////////////////////////////////////////////////////////
	// 
	////////////////////////////////////////////////////////////////////
	static setColumns( txt ){ this.body.style.gridTemplateColumns = txt; return Page; }
}

////////////////////////////////////////////////////////////////////
// CONSTANTS
////////////////////////////////////////////////////////////////////
Page.FULL	= 0;
Page.PANEL	= 1;


////////////////////////////////////////////////////////////////////
// STATICS
////////////////////////////////////////////////////////////////////
Page.url 	= null;
Page.body	= null;


export default Page;