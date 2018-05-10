var Container = { root: newElm("div",null,"OverlayPanel",window.document.body) };
Container.header = newElm("header", "Modifiers", null, Container.root);
Container.body = newElm("main", null, null, Container.root);


//------------------------------------------------------
// 
	function init(width = 150,css = null){
		css = css || "lib/Overlay/Overlay.css";
		Container.root.style.width = width + "px";
		loadCSS( css );
		return this;
	}
//endregion

	function newSection(name, value){
		var elm		= { root: newElm("section",null,null,Container.body) };
		elm.label	= newElm("label",name,null, elm.root);
		elm.preview	= newElm("span",value,null, elm.root);
		return elm
	}


//------------------------------------------------------
// 
	function addRange(name, value=0,min=0,max=1,step=0.01, func){
		let elm = newSection(name, value);
		
		elm.input 		= newInput("range", null, elm.root);
		elm.input.min	= min;
		elm.input.max	= max;
		elm.input.step	= step;
		elm.input.value	= value;
		
		elm.input.addEventListener("change", func);
		elm.input.addEventListener("input", function(){ elm.preview.innerText = this.value; });
		return this;
	}

	function addButton(value=null, func){
		let elm 	= { root: newElm("section",null,null,Container.body) };
		elm.input 	= newInput("button",value, elm.root);
		elm.input.addEventListener("click", func );
		return this;
	}

	function addTitle(txt){
		var elm = { root: newElm("section",null,null,Container.body) };
		elm.root.className = "div";
		elm.preview	= newElm("span",txt,null, elm.root);
		return this;
	}
//endregion


//------------------------------------------------------
// Helper Functions
	function newElm(elmName,txt=null,cls=null,root=null){
		var elm = document.createElement(elmName);
		if(root)		root.appendChild(elm);
		if(txt!=null)	elm.innerHTML = txt;
		if(cls)			elm.className = cls;
		return elm;
	}

	function newInput(type, value=null, root = null){
		var elm = document.createElement("input");
		elm.type = type;

		if(root)			root.appendChild(elm);
		if(value != null) 	elm.value = value;
		return elm;
	}

	function loadCSS(path){
		var head	= document.getElementsByTagName('head')[0],
			style	= document.createElement('link');

		style.href	= path;
		style.type	= "text/css";
		style.rel	= "stylesheet";
		head.append(style);
	}
//endregion


export default {
	init		: init,
	range		: addRange,
	button 		: addButton,
	title 		: addTitle
};