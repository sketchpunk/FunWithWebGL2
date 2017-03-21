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
		}
	}

	//===================================================
	// Event Handlers
	static onDownloadSuccess(){
		//Its an image, lets load it up as a texture in gl.
		if( this instanceof Image ){
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