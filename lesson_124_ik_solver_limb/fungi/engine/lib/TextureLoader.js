import Downloader, { HandlerTypes } from "./Downloader.js";

Downloader.prototype.addTex = function( name, file, flipY = false ){
	this._queue.push({ 
		handler	: "tex", 
		files	: { url: file, type:"blob" },
		data 	: { name, flipY }
	});
	return this;
}

//https://www.html5rocks.com/en/tutorials/file/xhr2/
HandlerTypes.tex = class{
	static add( dl, file, data ){ dl._queue.push( { handler:"tex", data:data, files:{ url: file, type:"blob" } }); }

	static downloaded( dl, xhr ){
		xhr.activeItem.result = new Image();
		xhr.activeItem.result.crossOrigin = "anonymous";
		xhr.activeItem.result.src = window.URL.createObjectURL( xhr.response );

		//let blob = new Blob( [xhr.response], {type: 'image/png'} ); 
    	//let img = new Image();
    	//img.crossOrigin = "anonymous";
    	//img.src = URL.createObjectURL( blob );
    	//xhr.activeItem.result = img;
	}
	
	static load( dl ){
		for( let i of dl.tex ){
			//if( i.skinName )	this.skinnedEntity( i );
			//else				this.meshEntity( i.name, i.matName, i.meshNames, i.json, i.bin );
		}
		return true;
	}
}

export default HandlerTypes.tex;