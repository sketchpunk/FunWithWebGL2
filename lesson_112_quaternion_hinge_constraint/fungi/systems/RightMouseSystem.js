import Fungi			from "../Fungi.js";
import { System }		from "../Ecs.js";

const MODE_DOWN	= 0;
const MODE_UP	= 1;
const MODE_MOVE	= 2;
const MODE_NONE	= -1;


/*
	import RightMouseSystem from "/fungi/systems/RightMouseSystem.js";

	Fungi.ecs.addSystem(new RightMouseSystem(onRightMouse), 10);

	function onRightMouse(mode){
		switch(mode){
			case RightMouseSystem.MODE_UP: console.log("upx"); break;
			case RightMouseSystem.MODE_DOWN: console.log("downx"); break;
			case RightMouseSystem.MODE_MOVE: console.log("movex"); break;
		}
	}
*/

class RightMouseSystem extends System{
	constructor(h=null){
		super();
		this.isDown		= false;
		this.handler	= h;
	}

	update(ecs){
		let mode = MODE_NONE;

		//=============================================================
		// Mouse Down
		if(Fungi.input.rightMouse && !this.isDown){
			this.isDown	= true;
			mode		= MODE_DOWN;

		//=============================================================
		// Mouse Up
		}else if(!Fungi.input.rightMouse && this.isDown){
			this.isDown	= false;
			mode		= MODE_UP;

		//=============================================================
		// Mouse Move
		}else if(Fungi.input.rightMouse && this.isDown
			&& Fungi.input.coord.pdx != 0
			&& Fungi.input.coord.pdy != 0) mode = MODE_MOVE;
		
		//=============================================================
		// Call Handler
		if(mode != MODE_NONE && this.handler) this.handler(mode);
	}

	static init(onHandler, priority = 10){ Fungi.ecs.addSystem(new RightMouseSystem(onHandler), priority); }
}

RightMouseSystem.MODE_DOWN	= MODE_DOWN;
RightMouseSystem.MODE_UP	= MODE_UP;
RightMouseSystem.MODE_MOVE	= MODE_MOVE;
RightMouseSystem.MODE_NONE	= MODE_NONE;

export default RightMouseSystem;