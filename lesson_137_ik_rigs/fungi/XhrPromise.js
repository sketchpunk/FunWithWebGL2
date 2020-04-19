/////////////////////////////////////////////////////////
// XML Http Request Wrapped in a Promise
/////////////////////////////////////////////////////////

function XhrPromise(){
    let xhr = new XMLHttpRequest();
    xhr.self = this;
	xhr.addEventListener( "load",		XhrPromise.on_complete, false);
	xhr.addEventListener( "error",		XhrPromise.on_error , false);
	xhr.addEventListener( "abort",		XhrPromise.on_abort, false);
    xhr.addEventListener( "timeout",	XhrPromise.on_timeout, false);
	this.xhr        = xhr;
	this.mode 		= null;
	this.url        = null;
	this.body 		= null;
	this.body_type 	= null;
    this.res_type   = "text";
    this.resolve    = null;
	this.reject	    = null;
	this.active 	= false;
}

// #region Instance Functions
XhrPromise.prototype.get = function( url, res_type ){
	if( this.active ) return null;
	this.url 		= url;
	this.res_type	= res_type || "text";
	this.mode 		= "GET";
	this.body 		= null;
	
	return new Promise( this._promise.bind( this ) );
};

XhrPromise.prototype.post = function( url, body, res_type, body_type ){
	if( this.active ) return null;
	
	this.url 		= url;
	this.res_type	= res_type || "text";
	this.mode 		= "POST";
	
	if( body ){
		if( body instanceof FormData ){
			this.body		= body;
			this.body_type	= null; //"form" FromData changes the Content-Type to whatever it needs to use. So no point assigning it.
		}else if( Array.isArray( body ) || typeof body === "object" ){
			this.body		= JSON.stringify( body );
			this.body_type	= "json";
		}else{
			this.body 		= body;
		}
	}

	if( body_type ) this.body_type = body_type;
	return new Promise( this._promise.bind( this ) );
};

XhrPromise.prototype._promise = function( resolve, reject ){
	this.resolve	= resolve;
	this.reject		= reject;
	this.active 	= true;

	this.xhr.open( this.mode, this.url, true );
	this.xhr.responseType = this.res_type;
	this.xhr.setRequestHeader( "cache-control", "no-cache, must-revalidate, post-check=0, pre-check=0" );
	this.xhr.setRequestHeader( "cache-control", "max-age=0" );
	this.xhr.setRequestHeader( "expires", "0" );
	this.xhr.setRequestHeader( "expires", "Tue, 01 Jan 1980 1:00:00 GMT" );
	this.xhr.setRequestHeader( "pragma", "no-cache" );
	/* console.log( this.body_type, this.body ); */
	switch( this.body_type ){
		case "json":	this.xhr.setRequestHeader( "Content-Type", "application/json;charset=UTF-8" ); break;
		case "form":	this.xhr.setRequestHeader( "Content-Type", "application/x-www-form-urlencoded" ); break;
		case "multi":	this.xhr.setRequestHeader( "Content-Type", "multipart/form-data" ); break;
	}

	try{ this.xhr.send( this.body ); }
	catch( err ){ this._complete( false, err ); }
};

XhrPromise.prototype._complete = function( isSuccess, err ){
	//console.log( "xhr_complete", isSuccess, err );
	if( !isSuccess ) 	this.reject( err );
	else{
		// IE11 doesn't support response types, 
		// So if requesting a JSON response, Parse it before returning it.
		let rtn;
		if( this.res_type == "json" && typeof this.xhr.response == "string" ){
			rtn = JSON.parse( this.xhr.response );
		}else{
			rtn = this.xhr.response;
		}

		this.resolve( rtn );
	}
	this.dispose();
}

XhrPromise.prototype.dispose = function(){
	this.resolve	= null;
	this.reject	    = null;
	this.xhr.self	= null;
	this.xhr.removeEventListener( "load",		XhrPromise.on_complete, false );
	this.xhr.removeEventListener( "error",		XhrPromise.on_error , false );
	this.xhr.removeEventListener( "abort",		XhrPromise.on_abort, false );
	this.xhr.removeEventListener( "timeout",	XhrPromise.on_timeout, false );
};
// #endregion ==============================================

// #region Event Handlers
XhrPromise.on_error     = function( e ){ this._complete( false ); console.error("onXhrError"); }
XhrPromise.on_abort     = function( e ){ this._complete( false ); console.error("onXhrAbort"); }
XhrPromise.on_timeout   = function( e ){ this._complete( false ); console.error("onXhrTimeout"); }
XhrPromise.on_complete	= function( e ){	//console.log( e, e.currentTarget.response );
	let xhr = e.srcElement;
	if( xhr.status != 200 )	xhr.self._complete( false, "http status : " + xhr.status + " " + xhr.statusText );
    else					xhr.self._complete( true );
}
// #endregion ==============================================

// #region Static Functions
XhrPromise.get	= function( url, type ){ return new XhrPromise().get( url, type ); }
XhrPromise.post	= function( url, body, res_type, body_type  ){ return new XhrPromise().post( url, body, res_type, body_type ); }

XhrPromise.get_by_root = function( url, type ){
	let root = window.location.pathname.substring( 0, window.location.pathname.indexOf( "/", 1 ) );
	return new XhrPromise().get( root + url, type );
}

XhrPromise.post_by_root = function( url, body, res_type, body_type ){
	let root = window.location.pathname.substring( 0, window.location.pathname.indexOf( "/", 1 ) );
	return new XhrPromise().post( root + url, body, res_type, body_type );
}
// #endregion ==============================================