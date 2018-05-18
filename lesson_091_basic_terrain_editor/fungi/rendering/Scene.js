class Scene{
	constructor(){
		this.items			= [];
		this.renderItems	= null;
		this.updateItems	= null;
	}

	add(itm){ this.items.push(itm); return this; }

	prepareItems(){
		//.........................
		//Create or Reset lists
		if(!this.renderItems){
			this.renderItems = [];
			this.updateItems = [];
		}else{
			this.renderItems.length = 0;
			this.updateItems.length = 0;
		}

		//.........................
		//copy all root items to the stack.
		let i, ii, stack = [];
		for(i of this.items) stack.push(i);

		//.........................
		//filter the items 
		while(stack.length > 0){
			i = stack.shift();

			//Add Item to what lists they fit in.
			if(i.update)	this.updateItems.push(i);
			if(i.material)	this.renderItems.push(i);
			
			//Add children to stack, to continue the loop
			if(i.children.length > 0) for(ii of i.children) stack.push(ii);
		}

		return this;
	}

}

export default Scene;