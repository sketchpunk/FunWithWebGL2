/* Resources.setup(gl,onReady).loadTexture("tex001","../shared/UV_Grid_Lrg.jpg").start(); */
class Resources{
	//Setup resource object
	static setup(gl,completeHandler){
		Resources.gl = gl;
		Resources.onComplete = completeHandler;
		return this;
	}

	//Start the download queue
	static start(usePromise){ //NEW
		if(Resources.Queue.length > 0)
			if(usePromise == true)
				return new Promise(function(resolve,reject){
					Resources.PromiseResolve = resolve;
					Resources.PromiseReject = reject;
					Resources.loadNextItem();
				});
			else Resources.loadNextItem();

		return null;
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
	static loadObj(name,src){ //NEW
		for(var i=0; i < arguments.length; i+=2){
			Resources.Queue.push({type:"obj",name:arguments[i],src:arguments[i+1]});
		}
		return this;
	}

	//===================================================
	// Manage Queue
	static loadNextItem(){
		//.......................................
		if(Resources.Queue.length == 0){
			if(Resources.PromiseResolve) Resources.PromiseResolve(); //NEW the first if added to handle Promise
			else if(Resources.onComplete != null) Resources.onComplete();
			else console.log("Resource Download Queue Complete");
			return;
		}

		//.......................................
		var itm = Resources.Queue.pop();
		switch(itm.type){
			case "obj": //NEW HOW TO LOAD FILE FROM NETWORK
				var req = new XMLHttpRequest();
				req.fObjName = itm.name;
				req.open("GET",itm.src);
				req.onreadystatechange = Resources.onDownloadXHR;
				req.send();
				break;
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
	static onDownloadXHR(){ //NEW EVENT TO HANDLE AJAX CALLS
		if(this.readyState === XMLHttpRequest.DONE){
			var d = ObjLoader.parseObjText(this.responseText,false);
			var mesh = gl.fCreateMeshVAO(this.fObjName,d[0],d[1],d[2],d[3],3);
			//mesh.aIndex	= d[0]; //Debugging
			//mesh.aVert	= d[1];
			//mesh.aNorm	= d[2];
			Resources.loadNextItem();
		}
	}

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
Resources.PromiseResolve = null; //NEW, REFERENCE to Promise Callbacks
Resources.PromiseReject = null;

Resources.Images = [];
Resources.Videos = [];