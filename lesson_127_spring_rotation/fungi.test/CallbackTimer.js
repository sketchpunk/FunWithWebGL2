class CallbackTimer{
	constructor( tl, cb ){
		this._time	= 0;
		this._limit	= tl;
		this._func	= cb;
	}

	run( dt ){
		if( (this._time += dt) >= this._limit ){
			this._time = 0;
			this._func();
		}
	}

	static closure( tl, cb ){
		let time = 0;
		return ( dt ) => { if( (time += dt) >= tl ){ time = 0; cb(); } };
	}
}

export default CallbackTimer;