class XhrQueue{
    constructor( cnt=2 ){
		this.pool		= new Array();
		this.queue		= new Array();
		this.pre_url	= "";
		this.callback	= null;
		this.active 	= false;
		
		this.complete 	= {};
		this.wait_ary	= new Array();

		this.resolve 	= null;
		this.reject 	= null;

		this.on_complete_bind	= this.on_complete.bind( this );
		this.on_error_bind		= this.on_error.bind( this );
		this.on_abort_bind		= this.on_abort.bind( this );
		this.on_timeout_bind	= this.on_timeout.bind( this );

		this._gen_pool( cnt );
    }

	// #region Chain Methods
	// Set the PrePend Url, so no need to type out the whole URLs when adding.
	url( url ){
		if( !url.endsWith("/") ) url += "/";
		this.pre_url = url;
		return this;
	}

	// Add a Single Item to the Queue
    add( url, type=null, grp_name=null, itm_name=null ){
		let is_img = false;

		if( !type ){
			let t = XhrQueue.what_type( url );
			type	= t[ 0 ];
			is_img	= t[ 1 ] ;
		}else if( type == "img" ){
			type 	= "blob";
			is_img 	= true;
		}

		let idx = this.queue.length;
		if( this.pre_url && !url.startsWith("/") && !url.startsWith(".") ) url = this.pre_url + url;

		this.queue.push({
			order 		: idx,
			url			: url,
			type		: type,
			is_img 		: is_img,
			data 		: null,
			grp_name	: grp_name,
			itm_name 	: itm_name,
		});

		return this;
	}
	
	push(){
		for( let i=0; i < arguments.length; i++ ) this.add( arguments[i] );
		return this;
	}

	// Add Group of Items, Grp + Arguments[]
    grp( grp_name, url, itm_name ){
		for( let i=1; i < arguments.length; i+=2 )
			this.add( arguments[i], null, grp_name, arguments[i+1] );
		return this;
    }

	// Start The Downloading
    then( cb=null ){
		this.callback	= cb;
		this.active 	= true;
        return new Promise( ( resolve, reject )=>{
			this.resolve	= resolve;
			this.reject		= reject;
			this._load_next();
		});
	}
	// #endregion /////////////////////////////////////////////////////

	// #region Queue Management
	// Load the next item in the queue based on how many available XHR objects are unused.
	_load_next(){
		// Check if we're ALL DONE, no more queue or active XHR objects
		if( this.queue.length == 0 && this._active_count() == 0 ) return false;

		let p, itm;
		for( p of this.pool ){
			if( p._in_use ) continue;
			
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// If there is no items, just exist loop
			itm = this.queue.pop();
			if( !itm ) return true;
			//console.log("start", p._idx, itm.url );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Pepare XHR object to start downloading
			p._in_use	= true;
			p._item		= itm;
			
			p.open( "GET", itm.url, true );
			p.responseType = itm.type;

			try{ p.send(); }
			catch( err ){ 
				console.error( "Err LoadNext", err );
				return false;
			}
		}

		return true;
	}
	
	// Handle All download complete OR queue ending errors
	// Will also handle disposing parts of the object
	async _unload( is_success=true, err_msg=null ){
		this.active = false;

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		if( !is_success ){
			this.reject( err_msg || "Error during downloading" );
		}else{
			if( this.wait_ary.length != 0 ) await Promise.all( this.wait_ary );

			// Sort Array by order inserted, 
			// Then reduce it into an array of just data
			if( this.complete.ary ){
				this.complete.ary.sort( (a,b)=>{ return (a.order == b.order)? 0 : (a.order < b.order)? -1 : 1;} );
				this.complete.ary = this.complete.ary.map( x=>x.data );
			}

			//	Return just an array ot the whole struct.
			let keys	= Object.keys( this.complete ),
				rtn		= ( keys.length == 1 && keys[0] == "ary" )? this.complete.ary : this.complete;

			this.resolve( rtn );
			if( this.callback ) this.callback( rtn );
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Clean up
		/* */
		this.complete 		= null;
		this.wait_ary 		= null;
		this.resolve 		= null;
		this.reject 		= null;
		this.queue 			= null;

		let p;
		for( p of this.pool ){
			p.removeEventListener( "load",		this.on_complete_bind, false );
			p.removeEventListener( "error",		this.on_error_bind, false );
			p.removeEventListener( "abort",		this.on_abort_bind, false );
			p.removeEventListener( "timeout",	this.on_timeout_bind, false );
			if( p._in_use ) p.abort();
		}
	}

	// When an Item is done downloading, Handle how to save it 
	// and queue up the next to start downloading
	_item_ready( itm ){
		//console.log( "done", itm );
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// For Images, Take the extra step into loading the blob into an Image Object
		if( itm.is_img ){
			let img 		= new Image();
			img.crossOrigin	= "anonymous";
			img.src 		= window.URL.createObjectURL( itm.data );
			itm.data 		= img;

			this.wait_ary.push(new Promise((resolve, reject)=>{ 
				img.onload	= resolve;
				img.onerror = reject;
			}));
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// How to Save the results, Into an array or Structs?
		if( itm.grp_name && itm.itm_name ){
			let grp = this.complete[ itm.grp_name ];
			if( !grp ) grp = this.complete[ itm.grp_name ] = {};
			grp[ itm.itm_name ] = itm.data;
		}else{
			if( !this.complete.ary ) this.complete.ary = new Array();
			this.complete.ary.push( itm );
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		if( !this._load_next() ) this._unload();
	}
	
	// Get a count of how many XHR objects are currently still downloading
	_active_count(){
		let cnt = 0;
		for(let i = 0; i < this.pool.length; i++) if( this.pool[ i ]._in_use ) cnt++;
		return cnt;
	}

	// Create an Array of XHR objects to use for downloading
	_gen_pool( cnt=2 ){
		let xhr;
		for( let i=0; i < cnt; i++ ){
			xhr = new XMLHttpRequest();
			xhr.addEventListener( "load",		this.on_complete_bind, false );
			xhr.addEventListener( "error",		this.on_error_bind, false );
			xhr.addEventListener( "abort",		this.on_abort_bind, false );
			xhr.addEventListener( "timeout",	this.on_timeout_bind, false );
			
			xhr._in_use	= false;
			xhr._item	= null;
			xhr._idx 	= i;
			this.pool.push( xhr );
		}
	}

	// #endregion /////////////////////////////////////////////////////

	// #region Xhr Event Handlers
	on_complete( e ){
		let xhr		= e.srcElement,
			itm		= xhr._item,
			result	= xhr.response;
		
		xhr._in_use = false;
		xhr._item	= null;

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// The queue was shutdown, dont bother processing this result.
		if( !this.active ) return;

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Error Happened, Shutdown Queue
		if( xhr.status != 200 ){
			this._unload( false, xhr.status + ":" + xhr.statusText );
			return;
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Item was successful, continue the queue
		//console.log( "done", xhr._idx, itm.url );

		itm.data = result;
		this._item_ready( itm );
	}

	on_error( e ){		this._unload( false, e.srcElement.statusText ); console.error("onXhrError"); }
	on_abort( e ){		this._unload( false, e.srcElement.statusText ); console.error("onXhrAbort"); }
	on_timeout( e ){	this._unload( false, e.srcElement.statusText ); console.error("onXhrTimeout"); }
	// #endregion /////////////////////////////////////////////////////

	// #region Static Starters
	static url( txt, ...list ){ 
		let o = new XhrQueue().url( txt );
		if( list.length > 0 ) o.push( ...list );
		return o;
	}
	static size( cnt ){ return new XhrQueue( cnt ); }
	static add( url, type=null, grp_name=null, itm_name=null ){ return new XhrQueue().add( url, type, grp_name, itm_name ); }
	static grp(){
		let xhr = new XhrQueue();
		xhr.grp.apply( xhr, arguments );
		return xhr;
	}
	// #endregion /////////////////////////////////////////////////////

	// #region Helpers
	// Figure out what object type to save the response data to.
	static what_type( url ){
		let pos = url.lastIndexOf("."),
			ext = url.substr( pos+1 ).toLowerCase();

		switch( ext ){
			case "png": case "gif": case "jpg": case "jpeg":
				return [ "blob", true ];
			
			case "json": case "gltf":
				return [ "json", false ];

			case "bin":
				return [ "arraybuffer", false ];
		}

		return ["text", false];
	}
	// #endregion /////////////////////////////////////////////////////
}

export default XhrQueue;