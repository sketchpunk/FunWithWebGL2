class XhrPromise{
	static get( url, type ){ 
		let xhr = new XhrPromise();
		return xhr.get.apply( xhr, arguments ); 
	}

	constructor(){
		this.xhr = new XMLHttpRequest();
		this.xhr.addEventListener("load",		this.onXhrComplete.bind( this )	,false);
		this.xhr.addEventListener("error",		this.onXhrError.bind( this )	,false);
		this.xhr.addEventListener("abort",		this.onXhrAbort.bind( this )	,false);
		this.xhr.addEventListener("timeout",	this.onXhrTimeout.bind( this )	,false);

		this.queue		= null;
		this.complete 	= null;

		this.url 		= null;
		this.res_type 	= null;

		//Start request in promise and save Resolve/Reject reference to call later
		//when the async xhr call is complete.
		this._onPromise = ( resolve, reject )=>{
			this.promiseResolve	= resolve;
			this.promiseReject	= reject;

			if( this.queue != null )	this._queueNext();
			else 						this._get();
		};
	}

	get( url, type ){
		if( arguments.length > 2 ){
			this.queue		= new Array();
			this.complete	= new Array();
			for(let i=0; i < arguments.length; i+=2 ){
				this.queue.push({ url:arguments[i], type:arguments[i+1] });
			}
		}else{
			this.url		= url;
			this.res_type	= type;
		}

		return new Promise( this._onPromise );
	}

	_queueNext(){
		if( this.queue.length == 0 ) return false;

		let itm = this.queue.shift();
		this.url 		= itm.url;
		this.res_type 	= itm.type;
		this._get();
		return true;
	}

	_get(){
		//console.log("GET", this.url, this.res_type );
		this.xhr.open( "GET", this.url, true );
		this.xhr.responseType = this.res_type || "text";

		/*
		this.xhr.setRequestHeader( "cache-control", "no-cache, must-revalidate, post-check=0, pre-check=0" );
		this.xhr.setRequestHeader( "cache-control", "max-age=0" );
		this.xhr.setRequestHeader( "expires", "0" );
		this.xhr.setRequestHeader( "expires", "Tue, 01 Jan 1980 1:00:00 GMT" );
		this.xhr.setRequestHeader( "pragma", "no-cache" );
		*/

		try{
			this.xhr.send();
		}catch(err){
			console.error("xhr err",err);
			this._complete( false, err );
		}
	}

	_complete( isSuccess, err ){
		//console.log( "Complete", isSuccess, err );

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		if( !isSuccess ){
			this.promiseReject( err );

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		}else{
			// Handling a queue of items.
			if( this.queue ){
				this.complete.push( this._get_response() );
				if( this._queueNext() ) return;

				this.promiseResolve( this.complete );
			}else{
				this.promiseResolve( this._get_response() );
			}
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		this.queue		= null;
		this.complete	= null;
		this.url		= null;
		this.res_type	= null;
	}

	_get_response(){
		if( this.xhr.response instanceof Blob && this.xhr.response.type.startsWith( "image/" ) ){
			let img = new Image();

			img.crossOrigin	= "anonymous";
			img.src 		= window.URL.createObjectURL( this.xhr.response );
			img.promise		= new Promise( (resolve, reject)=>{ 
				img.onload	= resolve;
				img.onerror = reject;
			});

			return img;
		}
		return this.xhr.response;
	}

	onXhrComplete( e ){	//console.log( e, e.currentTarget.response );
		if(this.xhr.status != 200)	this._complete( false, "http status : " + this.xhr.status + " " + this.xhr.statusText );
		else						this._complete( true );
	}

	onXhrError( e ){	this._complete( false ); console.error("onXhrError"); }
	onXhrAbort( e ){	this._complete( false ); console.error("onXhrAbort"); }
	onXhrTimeout( e ){	this._complete( false ); console.error("onXhrTimeout"); }
}

export default XhrPromise;