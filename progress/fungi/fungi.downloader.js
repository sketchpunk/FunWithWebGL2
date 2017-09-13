/* Bare requirements for struct is file and handler type.
Any other fields are extra for further handling 

{file:"",type="gltf"}
*/
class Downloader{
	static start(queueItems){
		if(Downloader.IsActive) return;

		//Add Items to the Queue
		if(queueItems != undefined && queueItems.length > 0){
			for(var i=0; i < queueItems.length;i++) Downloader.Queue.push(queueItems[i]);
		}

		//Create Promise that will do the work in the background.
		if(Downloader.ActivePromise == null) 
			Downloader.ActivePromise = new Promise(function(resolve,reject){
				Downloader.PromiseResolve	= resolve;
				Downloader.PromiseReject	= reject;
				Downloader.loadNext();
			});

		Downloader.IsActive = true;
		return Downloader.ActivePromise; 
	}

	static finalize(isSuccess){
		Downloader.IsActive = false;

		if(isSuccess)	Downloader.PromiseResolve(); //Can pass data with resolve if needed later
		else			Downloader.PromiseReject(new Error("err"));

		Downloader.ActivePromise	= null;
		Downloader.PromiseResolve	= null;
		Downloader.PromiseReject	= null;
	}

	static loadNext(){
		if(Downloader.Queue.length == 0){ Downloader.finalize(true); return; }
		
		var itm = Downloader.Queue.pop();
		Downloader.Handlers[itm.type](itm);
	}

	//Functionality for actual downloading
	static onXhrComplete(e){
		var doSave = Downloader.Handlers[this.ActiveItem.type](this.ActiveItem,e.currentTarget.response);
		if(doSave) Downloader.Complete.push(this.ActiveItem);

		this.ActiveItem = null;
		Downloader.loadNext();
	}				
	static onXhrError(e){ console.log("Error"); }
	static onXhrAbort(e){ console.log("Abort"); }
	static onXhrTimeout(e){ console.log("Timeout"); }

	static get(itm,type){
		//xhr holds the active item incase in the future the call is set
		//to handle multiple downloads at a time with some sort of threadpool.
		//This way each ajax caller holds the download info that can then
		//be sent back to the download complete handler.
		Downloader.xhr.ActiveItem = itm;
		Downloader.xhr.open("GET",itm.file);
		Downloader.xhr.responseType = type;
		Downloader.xhr.send();
	}
}

Downloader.IsActive			= false;	//Is the downloader currently downloading things
Downloader.ActivePromise	= null;		//Refernce to promise created by start
Downloader.PromiseResolve	= null;		//Resolve Reference for promise
Downloader.PromiseReject	= null;		//Reject Reference for promise
Downloader.Queue			= [];		//Queue of items to download
Downloader.Complete 		= [];		//Queue of completed items downloaded.

//XHR is how we can download files through javascript
Downloader.xhr = new XMLHttpRequest();
Downloader.xhr.addEventListener("load",		Downloader.onXhrComplete,false);
Downloader.xhr.addEventListener("error",	Downloader.onXhrError,false);
Downloader.xhr.addEventListener("abort",	Downloader.onXhrAbort,false);
Downloader.xhr.addEventListener("timeout",	Downloader.onXhrTimeout,false);

//Downloader is suppose to be expandable by adding new ways to handle
//different types of files for downloading.
Downloader.Handlers = {
	//................................................
	//How to download a GLTF File
	"gltf":function(itm,dl){
		//Init Call
		if(dl == undefined){ Downloader.get(itm,"json"); return false; }

		//Final Call - Look through the buffer for bin files to download.
		for(var i=0; i < dl.buffers.length; i++){
			if(dl.buffers[i].uri.startsWith("data:")) continue;

			//Push bin file to download queue.
			Downloader.Queue.push({
				file:dl.buffers[i].uri,
				type:"gltf_bin",
				ref:dl.buffers[i]}
			);
		}

		itm.dl = dl; //Save the data download to the item
		return true; //Save item to complete list.
	},

	//................................................
	//How to download a bin file from gltf file
	"gltf_bin":function(itm,dl){
		//Init Call
		if(dl == undefined){ Downloader.get(itm,"arraybuffer"); return false; }

		//Final Call
		itm.ref.dView = new DataView(dl); //Create a dataview for arraybuffer.
		return false; //No need to save this item to complete list.
	}
};