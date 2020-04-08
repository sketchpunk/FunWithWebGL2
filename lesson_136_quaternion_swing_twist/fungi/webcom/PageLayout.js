class PageLayout extends HTMLElement{
	constructor(){ 
		super();
		this.is_loaded = false;
	}

	connectedCallback(){ 
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		if( this.is_loaded ) return;
		this.is_loaded = true;

		this.appendChild( document.importNode( PageLayout.Template.content, true ) );
		//this.appendChild( PageLayout.Template.content.cloneNode( true ) );

		this.classList.add( "top" );
		document.title = this.getAttribute( "pg_title" ) || "Fungi";

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		if( this.getAttribute( "footer" ) == "on" ) this.querySelector( ":scope > footer" ).classList.remove( "off" );

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Slot Injection
		let s, ss, cont={}, slots=this.querySelectorAll("*[slot]");
		for( s of slots ){
			if( !(ss = cont[ s.slot ]) ) cont[ s.slot ] = ss = this.querySelector( "*[name="+s.slot+"]" );
			if( !ss ){ console.log("SLOT NOT FOUND : ", s.slot ); continue; }

			if( ss.tagName == "SLOT" )	ss.parentNode.replaceChild( s, ss );	// replace slot
			else 						ss.appendChild( s );					// append to element
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Turn On Containers
		if( cont.nav_a || cont.nav_a ) this.querySelector( ":scope > nav" ).classList.remove( "off" )
	}
} 

//######################################################################################
PageLayout.Template = document.createElement("template");
PageLayout.Template.innerHTML = `<style>
html, body{ margin:0px; padding:0px; width:100%; height:100%; }
nav, section, main, div, header, footer, canvas, span, label { box-sizing:border-box; }
a{ text-decoration:none; }
*{ font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size:16px;}

canvas{ border:0px solid red; z-index:0; }

/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
page-layout{ background-color:#1E1E1E; box-sizing:border-box; width:100vw; height:100vh; display:block; }

page-layout.top > nav{ height:30px; width:100vw; left:0px; top:0px;  }
page-layout.top > nav a{ width:30px; border-width:2px 0px; }
page-layout.top > nav a:hover{ border-top-color:#999999; }
page-layout.top > nav a.on{ border-top-color:lime; }
page-layout.top > section{ left:0px; top:30px; }

page-layout.left > nav{ width:30px; height:100vh; left:0px; top:0px; flex-direction:column; padding-bottom:25px; }
page-layout.left > nav > * { flex-direction:column; }
page-layout.left > nav a{ border-width:0px 2px; transition: color 0.3s ease-out, border-left-color 0.2s ease-out; }
page-layout.left > nav a:hover{ border-left-color:#999999; }
page-layout.left > nav a.on{ border-left-color:lime; }
page-layout.left > section{ left:30px; top:0px; }

/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
page-layout > nav{ z-index:2000; position:fixed; background-color:#333333dd; box-shadow: 0px 0px 5px #00000088;
	display:flex; justify-content:space-between; }
page-layout > nav.off{ display:none; }

page-layout > nav > * { display:flex; }

page-layout > nav a{ color:#858585; text-align:center; font-size:18px;
	 border-style:solid; border-color:transparent; }
page-layout > nav a:hover{ color:#CCCCCC; }
page-layout > nav a:active{ color:white; }

/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
page-layout > section { z-index:1000; position:fixed; bottom:25px; width:200px;
	background-color:#25252699; border-right:1px solid #2a2a2a; box-shadow: 0px 0px 5px #00000088; }
page-layout > section.off{ display:none; }

/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
page-layout > footer{ z-index:3000; position:fixed; height:24px; width:100vw; bottom:0px; background-color:#202020aa;
	display:flex; justify-content:space-between; box-shadow: 0px 0px 5px #00000088; }

page-layout > footer.off{ display:none; }
page-layout > footer > * { display:flex; }

page-layout > footer a,
page-layout > footer label { font-size:12px; color:#aaaaaa; padding:3px 8px 0px 8px; cursor:pointer; transition:all 0.3s ease-out; }

page-layout > footer a:hover,
page-layout > footer label:hover{ background-color:#008DEDaa; color:#eeeeee; }
</style></head><body class="Page top">
<canvas style="width:100vw; height:100vh;" id="pg_canvas"></canvas>
<nav class="off">
	<header name="nav_a"><!--
		<a href="javascript:void(0)">&#10033;</a>
		<a href="javascript:void(0)">&#10010;</a>
		<a href="javascript:void(0)">&starf;</a>
	--></header>
	<footer name="nav_b"><!--<a href="javascript:void(0)" class="on">&#9776;</a>--></footer>
</nav>
<section class="off"></section>
<footer class="off">
	<header name="footer_l"><a href="https://www.github.com/sketchpunk/fungi" target="_blank">Fungi</a></header>
	<footer name="footer_r"><!--<label>FPS : 0</label>--></footer>
</footer>`;

//######################################################################################
window.customElements.define( "page-layout", PageLayout );
export default PageLayout;