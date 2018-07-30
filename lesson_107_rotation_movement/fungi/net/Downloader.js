/* SAMPLE ------------------------------------------------------
var dl = new Downloader(
	{ type:"shader", file:"../../fungi/shaders/VecWColor.txt" },
	{ type:"image", name:"tex01", file:"../../images/UV_Grid_Sm.jpg", doYFlip:true, useMips:false }
	{ type:"image", name:"tex01", file:"./tile03.png", doYFlip:true, useMips:false, w:128, h:128, arrayLen:6 },
]);

dl.start()
	.then(()=>{ console.log("All Done", dl.complete); })
	.catch((err)=>{ console.log("catch",err); });

Promise.all([p]).then(values=>{ console.log(values); },reason =>{ console.log(reason); });
 -------------------------------------------------------------*/

class Downloader{
	constructor(dlAry = null, xhrLen = 5, imgLen = 3){
		this.debug			= false;
		this.complete		= [];

		this._promise		= null;
		this._resolve		= null;
		this._reject		= null;
		this._queue			= [];

		//.............................
		//Setup Image DL Pool
		this._imgPoolLen	= imgLen;
		this._imgPool		= new Array(imgLen).fill(null);
		this._imgComplete 	= this.onImageComplete.bind(this);
		this._imgError 		= this.onImageError.bind(this);
		
		//.............................
		//Setup XHR Connection Pool
		this._xhrPoolLen	= xhrLen;
		this._xhrPool		= new Array(xhrLen);

		var xhr,
			onComplete	= this.onXhrComplete.bind(this),
			onError		= this.onXhrError.bind(this),
			onAbort		= this.onXhrAbort.bind(this),
			onTimeout	= this.onXhrTimeout.bind(this);

		for(let i=0; i < xhrLen; i++){
			this._xhrPool[i] = xhr = new XMLHttpRequest();

			xhr.addEventListener("load",	onComplete ,false);
			xhr.addEventListener("error",	onError,false);
			xhr.addEventListener("abort",	onAbort,false);
			xhr.addEventListener("timeout",	onTimeout,false);
			xhr.inUse 		= false;
			xhr.activeItem 	= null;
		}

		//.............................
		if(dlAry != null) this.loadQueue(dlAry);
	}

	//+++++++++++++++++++++++++++++++++++++++++++++++++
	// Methods 
		loadQueue(ary){
			let itm;
			for(itm of ary) this._queue.push(itm);
			return this;
		}

		start(){
			if(this._promise){ console.log("Downloader is currently active (promise)"); return this; }
			if(!this._queue.length){ console.log("Can not start downloading, queue is empty"); return this; }

			this._promise = new Promise((resolve, reject)=>{
				if(this.debug) console.log("Download Promise Starting");
				
				this._resolve	= resolve;
				this._reject	= reject;

				this._loadNext();
			});

			return this._promise;
		}
	//endregion

	//+++++++++++++++++++++++++++++++++++++++++++++++++
	// Handle Queue
		_activeCount(){
			let i, cnt = 0;
			//Count Active xhr objects
			for(i = 0; i < this._xhrPoolLen; i++) if( this._xhrPool[i].inUse ) cnt++;

			//Count Active Image Downloads
			for(i = 0; i < this._imgPoolLen; i++) if( this._imgPool[i] != null ) cnt++;

			return cnt;
		}

		//TODO Need to built some kind of Mulex Lock for handling next item to load from the queue.
		_loadNext(){
			if(this.debug) console.log("Load Next : Queue Size ", this._queue.length, "Active", this._activeCount() );

			//..................................
			if(this._queue.length == 0 && this._activeCount() == 0){
				this._finalize(true);
				return;
			}

			//..................................
			//Find all available Xhr Slots that can do downloading.
			let i,q,itm, handler;
			for(i = 0; i < this._xhrPoolLen; i++){
				if(this._xhrPool[i].inUse) 	continue;
				if(this._queue.length == 0)	break;

				for(q=0; q < this._queue.length; q++){
					if(this._queue[q].type == "image") continue;

					itm = this._queue[q];
					this._queue.splice(q,1);
					
					handler	= Downloader.Handlers[itm.type];
					if(!handler){
						this._finalize(false,"Unknown download handler : " + itm.type);
						return;
					}

					this._startXhr(this._xhrPool[i], itm, handler.downloadType);
					break;
				}
			}

			//..................................
			//Find any slot available for image downloads
			for(i = 0; i < this._imgPoolLen; i++){
				if(this._imgPool[i] != null)	continue;
				if(this._queue.length == 0)		break;

				for(q=0; q < this._queue.length; q++){
					if(this._queue[q].type != "image") continue;

					itm = this._queue[q];
					this._queue.splice(q,1);
					
					handler	= Downloader.Handlers[itm.type];
					if(!handler){
						this._finalize(false,"Unknown download handler : " + itm.type);
						return;
					}

					this._startImg(i, itm);
					break;
				}
			}
		}

		_finalize(isSuccess, errMsg){
			//IsActive = false;
			if(this.debug) console.log("Download Finalizer", isSuccess, errMsg);

			if(isSuccess)	this._resolve(true); //Can pass data with resolve if needed later
			else			this._reject(new Error(errMsg));

			this._promise	= null;
			this._resolve	= null;
			this._reject	= null;
		}

		onItemDownloaded(dlItem, dlResult){
			if(this.debug) console.log("onItemDownloaded", dlItem.file);

			//...............................
			//When download is done, do any further processing if needed.
			var doSave 	= true,
				handler	= Downloader.Handlers[ dlItem.type ];

			if(handler.onReady) doSave = handler.onReady(this, dlItem, dlResult );

			//...............................
			//Save Download Data and put in on the complete list
			if(doSave) dlItem.download = dlResult;
			this.complete.push(dlItem);
			
			//...............................
			//Cleanup and start next download
			this._loadNext();
		}
	//endregion

	//+++++++++++++++++++++++++++++++++++++++++++++++++
	// Handle XHR Connection
		_startXhr(xhr, itm, type){
			if(this.debug) console.log("======================\nGet File ", itm.file);

			xhr.open("GET",itm.file);
			xhr.inUse			= true;
			xhr.responseType	= type;
			xhr.activeItem		= itm;

			try{
				xhr.send();
			}catch(err){
				console.log("xhr err",err);
				this._finalize(false, err);
			}
		}

		onXhrComplete(e){
			var xhr = e.currentTarget,
				itm = xhr.activeItem;
			
			if(this.debug) console.log("onXhrComplete", xhr.activeItem.file);
			
			//...............................
			//If error out if there is no successful html code
			if(xhr.status != 200){
				this._finalize(false, "http status : " + xhr.status + " " + xhr.statusText);
				return;
			}

			xhr.inUse		= false;
			xhr.activeItem	= null;
			this.onItemDownloaded( itm, xhr.response );
		}
		onXhrError(e){		e.currentTarget.inUse = false; this._finalize(false,e); console.log("onXhrError"); }
		onXhrAbort(e){		e.currentTarget.inUse = false; this._finalize(false,e); console.log("onXhrAbort"); }
		onXhrTimeout(e){	e.currentTarget.inUse = false; this._finalize(false,e); console.log("onXhrTimeout"); }
	//endregion

	//+++++++++++++++++++++++++++++++++++++++++++++++++
	// Image Download 
		_startImg(idx, itm){
			if(this.debug) console.log("======================\nGet Image ", itm.file);

			var img = new Image();
			this._imgPool[idx]	= img;
			img.poolIdx			= idx;
			img.activeItem		= itm;
			img.onload			= this._imgComplete;
			img.onabort			= img.onerror = this._imgError;
			img.src				= itm.file;
		}

		onImageComplete(e){
			var img = e.currentTarget,
				itm = img.activeItem;

			this._imgPool[img.poolIdx] = null;	//Clear out spot for more image downloading.

			delete img.activeItem;	//Delete items that are not needed anymore
			delete img.poolIdx;

			this.onItemDownloaded(itm, img); //Complete Download
		}

		onImageError(e){ this._finalize(false,"Error downloading image"); }
	//endregion

}//cls


Downloader.Handlers = {
	//...........................................
	"image":{},

	//...........................................
	"snippet":{ downloadType:"text" },

	//...........................................
	"shader":{
		downloadType	: "text",
		cache			: [],	//Cache the snippet files found, so we dont download the same snippet more then once.
		onReady			: function(ref, itm, dl){
			if(ref.debug) console.log("Shader.onReady", dl);

			/*
			var re		= /#snip ([^\n\r]*)/g,
				snip	= [],
				m;

			while(m = re.exec(dl)){
				if( this.cache.indexOf(m[1]) == -1 ){
					this.cache.push( m[1] );
					queueSnippet( m[1] );
					snip.push( m[1] );
				}
			}

			if(snip.length > 0) itm.snippets = snip;
			*/

			return true;
		}
	}
	//...........................................
};


//export default mod;
export default Downloader;