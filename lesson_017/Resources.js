/* Resources.setup(gl,onReady).loadTexture("tex001","../shared/UV_Grid_Lrg.jpg").start(); */
class Resources{
	//Setup resource object
	static setup(gl,completeHandler){
		Resources.gl = gl;
		Resources.onComplete = completeHandler;
		return this;
	}

	//Start the download queue
	static start(){
		if(Resources.Queue.length > 0) Resources.loadNextItem();
	}

	//===================================================
	// Loading
	static loadTexture(name,src){
		for(var i=0; i < arguments.length; i+=2){
			Resources.Queue.push({type:"img",name:arguments[i],src:arguments[i+1]});
		}
		return this;
	}
	static loadVideoTexture(name,src){
		for(var i=0; i < arguments.length; i+=2){
			Resources.Queue.push({type:"vid",name:arguments[i],src:arguments[i+1]});
		}
		return this;
	}

	//===================================================
	// Manage Queue
	static loadNextItem(){
		//.......................................
		if(Resources.Queue.length == 0){
			if(Resources.onComplete != null) Resources.onComplete();
			else console.log("Resource Download Queue Complete");
			return;
		}

		//.......................................
		var itm = Resources.Queue.pop();
		switch(itm.type){
			case "img":
				var img = new Image();
				img.queueData = itm;
				img.onload = Resources.onDownloadSuccess;
				img.onabort = img.onerror = Resources.onDownloadError;
				img.src = itm.src;
				break;
			case "vid":
				var vid = document.createElement("video");
				vid.style.display = "none";
				document.body.appendChild(vid);

    			//vid.addEventListener("canplaythrough", videoReady, true); //When enough video is available to start playing
    			//vid.addEventListener("ended", videoComplete, true);			//WHen video is done.

				vid.queueData = itm;
				vid.addEventListener("loadeddata",Resources.onDownloadSuccess,false);
				vid.onabort = vid.onerror = Resources.onDownloadError;
				vid.autoplay = true;
				vid.loop = true;
				vid.src = itm.src;
				vid.load();
				vid.play();

				Resources.Videos[itm.name] = vid;
				break;
		}
	}

	//===================================================
	// Event Handlers
	static onDownloadSuccess(){
		//Its an image, lets load it up as a texture in gl.
		if( this instanceof Image || this.tagName == "VIDEO"){
			var dat = this.queueData;
			Resources.gl.fLoadTexture(dat.name,this);
		}
		Resources.loadNextItem();
	}

	static onDownloadError(){
		console.log("Error getting ",this);
		Resources.loadNextItem();
	}
}

Resources.Queue = [];
Resources.onComplete = null;
Resources.gl = null;

Resources.Images = [];
Resources.Videos = [];