/* IDEA
	For textures, Maybe have a Handler that modifies the prototype of Downloader
	to include a function called AddTexture(), so it can do extra info with the data object.
	Plus keep chaining working.
	Hacking the prototype might be frawned apon.
*/


//######################################################################################
class Downloader{
	constructor( xhrCnt = 2 ){	
		this.debug			= false;
		this.runLoader		= true;
		this._promise		= null;	// Refernce to Promise Created on start
		this._resolve		= null;	// Resolve reference to promise
		this._reject		= null;	// Reject reference to promise
		this._queue			= [];	// List of Items to download.
		
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Setup pool of XHR Objects
		this._xhrPool 		= new Array( xhrCnt );

		let xhr,
			onComplete		= this.onXhrComplete.bind( this ),
			onError			= this.onXhrError.bind( this ),
			onAbort			= this.onXhrAbort.bind( this ),
			onTimeout		= this.onXhrTimeout.bind( this );

		for(let i=0; i < xhrCnt; i++){
			this._xhrPool[ i ] = xhr = new XMLHttpRequest();

			xhr.addEventListener( "load", onComplete ,false);
			xhr.addEventListener( "error", onError, false);
			xhr.addEventListener( "abort", onAbort, false);
			xhr.addEventListener( "timeout", onTimeout, false);

			xhr.inUse 		= false;
			xhr.activeItem 	= null;
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Create different complete arrays for each handler.
		// With Seperate arrays we can them do parallel type of loading
		this.complete 		= {};
		for( let i in HandlerTypes ) this.complete[ i ] = new Array();
	}

	////////////////////////////////////////////////////////////
	// METHODS
	////////////////////////////////////////////////////////////
		
		// Itm Format : { hander, data:null, files: { url, type:text/json/arraybuffer } }
		add( handler, file, data=null ){
			let h = HandlerTypes[ handler ];
			if( !h ){ console.error( "Unknown Handler", handler ); return this; };

			let itm;
			if( h.add ) itm = h.add( file, data );
			else{
				itm = { handler, files:{ url:file, type:"text"} };
				//if( data ) Object.assign( itm, data );
			}
			this._queue.push( itm );
			return this;
		}

		// Easier to pass in group of shaders, so first arg is the handler, then every arg after is just a file to download.
		addGrp( handler, file ){
			for( let i=1; i < arguments.length; i++ ) this.add( handler, arguments[ i ] );
			return this;
		}

		start(){
			if( this._promise ){ console.error("Downloader is currently active."); return null; }
			if( !this._queue.length ){ console.error("Can not start, queue is empty."); return null; }

			this._promise = new Promise( (resolve, reject)=>{
				this._resolve	= resolve;
				this._reject	= reject;
				this._loadNext();
			});

			return this._promise;
		}

		loader(){
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Create a list of Loaders and sort them by priority;
			let ary = [];
			for( let i in HandlerTypes ){
				if( HandlerTypes[ i ].load ) ary.push( HandlerTypes[ i ] );
			}
			ary.sort( handler_psort );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			for( let i of ary ){
				if(! i.load( this.complete ) ) return false;
			}

			return true;
		}

	////////////////////////////////////////////////////////////
	// Queue
	////////////////////////////////////////////////////////////
		_activeCount(){
			let i, cnt = 0;
			for(i = 0; i < this._xhrPool.length; i++) if( this._xhrPool[i].inUse ) cnt++;

			return cnt;
		}

		_loadNext(){
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( this._queue.length == 0 && this._activeCount() == 0 ){
				this._shutDown();
				return;
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Find any available Xhr slos for downloading
			let i;
			for( let x of this._xhrPool ){
				if( x.inUse ) continue;
				if( this._queue.length == 0 ) break;

				x.inUse			= true;
				x.activeItem	= this._queue.pop();

				this._startXhr( x );
				return;
			}
		}

		_shutDown( isError = false, err ){
			if( this.debug ) console.log("Shutdown", isError, err );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( !isError && this.runLoader ){
				if( !this.loader() ){
					isError = true;
					err = "Error running loader";
				}
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( isError )	this._reject( err );
			else			this._resolve( this );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			this._resolve	= null;
			this._reject	= null;
			this._promise	= null;
		}

		onItemDownloaded( itm ){
			if( this.debug ) console.log("onItemDownloaded", itm );

			this.complete[ itm.handler ].push( itm );
			
			// Get Ride of needless bits from item.
			delete itm.files;
			delete itm.handler;

			//...............................
			//Cleanup and start next download
			this._loadNext();
		}

	////////////////////////////////////////////////////////////
	// XHR CONNECTION
	////////////////////////////////////////////////////////////
		_startXhr( xhr ){
			let info = ( Array.isArray( xhr.activeItem.files ) )? 
							xhr.activeItem.files.shift() : 
							xhr.activeItem.files;

			if( this.debug ) console.log( "======================================\nGet File", info.type, info.url );

			xhr.open( "GET", info.url );
			xhr.responseType = info.type;

			try{
				xhr.send();
			}catch(err){
				console.error("xhr err",err);
				this._showDown(false, err);
			}
		}

		onXhrComplete( e ){
			let xhr = e.currentTarget,
				itm = xhr.activeItem;

			if( this.debug ) console.log( "onXhrComplete", xhr.activeItem.handler );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			//If error out if there is no successful html code
			if(xhr.status != 200){
				this._showDown(false, "http status : " + xhr.status + " " + xhr.statusText);
				return;
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// How to handle Download.
			let h = HandlerTypes[ itm.handler ];
			if( h && h.downloaded )	h.downloaded( this, xhr );
			else 					itm.download = xhr.response;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// If there is still more grouped files to download, then continue.
			if( Array.isArray( itm.files ) && itm.files.length > 0 ){
				this._startXhr( xhr );
				return;
			}
			
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// All Complete
			xhr.inUse		= false;
			xhr.activeItem	= null;

			this.onItemDownloaded( itm );
		}
		onXhrError(e){		e.currentTarget.inUse = false; this._finalize(false,e); console.log("onXhrError"); }
		onXhrAbort(e){		e.currentTarget.inUse = false; this._finalize(false,e); console.log("onXhrAbort"); }
		onXhrTimeout(e){	e.currentTarget.inUse = false; this._finalize(false,e); console.log("onXhrTimeout"); }
}


//######################################################################################
//
//
function handler_psort( a, b ){ return (a.priority == b.priority)? 0 : (a.priority < b.priority)? -1 : 1; }
let HandlerTypes = { };

/*
HandlerTypes.gltf = class{
	static add( dl, file, data = null ){
		dl._queue.push( { handler:"gltf", data:data, files:[
			{ url: file + ".gltf", type:"json" },
			{ url: file + ".bin", type:"arraybuffer" }
		]});
	}

	static downloaded( dl, xhr ){
		//console.log("gltf downloaded", xhr.response, xhr.activeItem );
		switch( xhr.activeItem.files.length ){
			case 1: xhr.activeItem.json	= xhr.response; break;
			case 0: xhr.activeItem.bin	= xhr.response; break;
		}
	}
}

HandlerTypes.text = class{
	static add( dl, file, data = null ){
		dl._queue.push( { handler:"text", data:data, files:{ url: file, type:"text" } });
	}
}
*/


//######################################################################################
export default Downloader;
export { HandlerTypes };