import Maths from "../fungi/Maths.js";
import Fungi from "../fungi/Fungi.js";


// Timing that loops from 0 to PI*2. Good for controlling animations by cycles.
// This class handles how long does it take to complete one cycle (360 degrees == PI*2)
class Cycle{
	constructor( sec ){
		this.value		= 0;
		this.time		= 0;
		this.speed		= 0;
		this.loop		= 0;
		this.infinite	= true;
		this.setTime( sec );
	}

	reset(){
		this.value = 0;
		this.loop = 0;
		return;
	}

	setTime( sec ){
		this.time	= sec;
		this.speed	= Maths.PI_2 / sec;
		return this;
	}
	
	next( rtnGrad = false ){
		let t = this.value + this.speed * Fungi.deltaTime;
		if( t >= Maths.PI_2 ){
			if(! this.infinite ){
				this.value = Maths.PI_2;
				return ( rtnGrad )? 1 : this; 
			}
			this.loop++;
		}

		this.value = t % Maths.PI_2;
		return ( rtnGrad )? this.value / Maths.PI_2 : this; 
	}
}


// Timing that uses a max seconds. Its more like a count down but moving forward.
// Uses Fungi DeltaTime to increment the count then deactives when reached the max time
class Clock{
	constructor( sec ){
		this.value		= 0;
		this.limit		= sec;
		this.isActive	= false;
	}

	start(){
		this.value		= 0;
		this.isActive	= true;
		return this;
	}

	stop(){
		this.isActive = false;
		return this;
	}

	setTime( sec ){ this.limit = sec; return this; }
	getT(){ return Math.min(1, this.value / this.limit); }
	
	next( rtnGrad = false ){
		this.value += Fungi.deltaTime;
		if(this.value >= this.limit) this.isActive = false;
		return ( rtnGrad )? Math.min(1, this.value / this.limit) : this.isActive; 
	}
}


// This class handles running a function reference till the alotted time has expired,
// then starts running the next func ref on the stack till everything is complete.
class RunStack{
	constructor(){
		this.queue = new Array();
		this.clock = new Clock();
		this.activeIdx = 0;
	}

	get isActive(){ return this.clock.isActive; }
	get gradient(){ return this.clock.getT(); }

	add( sec, func ){
		var itm = { sec, func };

		this.queue.push( itm );
		return this;
	}

	start(){
		this.activeIdx = 0;

		let itm = this.queue[ this.activeIdx ];
		this.clock.setTime( itm.sec ).start();
		return this;
	}

	next(){
		let itm;
		while(true){
			if( ++this.activeIdx >= this.queue.length ){
				this.clock.stop();
				break;
			}
			//this.activeIdx = (this.activeIdx + 1) % this.queue.length;

			itm = this.queue[ this.activeIdx ];
			if(itm.sec == -1){
				console.log("non timed item");
				itm.func();
				continue;
			}

			this.clock.setTime( itm.sec ).start();
			break;
		}
	}

	update(){
		//console.log("runstack",this.activeIdx );
		if( this.activeIdx >= this.queue.length ){
			this.clock.stop();
			return;
		}

		//..................................
		let itm = this.queue[ this.activeIdx ];
		//if( itm.func() ){
			//console.log("all together");
		//}

		if(itm.func() == false){
			this.next();
			return;
		}
		
		//..................................
		this.clock.next();
		if( !this.clock.isActive ) this.next();

		/*
		if( !this.clock.isActive ){
			console.log("switch stack");

			if( ++this.activeIdx >= this.queue.length ) return;
			//this.activeIdx = (this.activeIdx + 1) % this.queue.length;
			
			itm = this.queue[ this.activeIdx ];
			this.clock.setTime( itm.sec ).start();
		}
		*/
	}
}


export { Cycle, Clock, RunStack };