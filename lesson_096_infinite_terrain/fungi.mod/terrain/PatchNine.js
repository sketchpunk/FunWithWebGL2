class PatchNine{
	constructor(uSize=1){
		this.unitSize		= uSize;
		this.recycleHandler	= null;		//How to handle items being recycled

		this.areaX		= 0;			//Current Center Location
		this.areaY		= 0;
		this.areas		= [				//Grid of the 9 Locations, Center being the main area
			{x:-1, y:-1, idx:null},
			{x: 0, y:-1, idx:null},
			{x: 1, y:-1, idx:null},
			
			{x:-1, y: 0, idx:null},
			{x: 0, y: 0, idx:null},
			{x: 1, y: 0, idx:null},

			{x:-1, y: 1, idx:null},
			{x: 0, y: 1, idx:null},
			{x: 1, y: 1, idx:null}
		];

		this.pool		= [				//List of items that will act as areas
			{x:-1, y:-1, item:null},
			{x: 0, y:-1, item:null},
			{x: 1, y:-1, item:null},
			
			{x:-1, y: 0, item:null},
			{x: 0, y: 0, item:null},
			{x: 1, y: 0, item:null},

			{x:-1, y: 1, item:null},
			{x: 0, y: 1, item:null},
			{x: 1, y: 1, item:null}
		];
	}

	//=============================================================
	// Add Transforms Items that will act as our areas
		addTransform(t){
			for(var i of this.pool){
				if(!i.item){
					i.item = t;
					t.setPosition( i.x * this.unitSize, 0.01, i.y * this.unitSize );

					if(this.recycleHandler) this.recycleHandler(i.x, i.y, t);

					break;
				}
			}
			return this;
		}

	//=============================================================
	// Controlling the center of the area grid
		move(x, y){ this.center( this.areaX + x, this.areaY + y ); return this; }
		center(x,y){
			this.areaX = x;
			this.areaY = y;

			//Create XY positions as -1, 0, 1
			var itm, i=0;
			for(itm of this.areas){
				itm.x	= x + (i % 3 - 1);
				itm.y	= y + (Math.floor(i / 3) - 1);
				itm.idx = null;
				i++;
			}
			return this;
		}

	//=============================================================
	// 
		updateAreas(){
			let i, a, p, 
				stack	= [],
				xRangeA	= this.areaX - 1,
				xRangeB	= this.areaX + 1,
				yRangeA	= this.areaY - 1,
				yRangeB	= this.areaY + 1;

			//......................................
			// Find which items needs to be recycled
			// and update the areas with which item is assigned to it.
			for(i=0; i < this.pool.length; i++){
				p = this.pool[ i ];

				if( p.x > xRangeB || p.x < xRangeA || 
					p.y > yRangeB || p.y < yRangeA ) stack.push( i ); //Recycle Item
				else{
					for(a of this.areas){
						if(a.x == p.x && a.y == p.y){ a.idx = i; break; }
					}
				}
			}

			//......................................
			//Reuse old items for new areas, update them if available.
			while(stack.length > 0){
				i = stack.pop();
				p = this.pool[ i ];

				for(a of this.areas){
					if(a.idx == null){
						a.idx	= i;
						p.x		= a.x;
						p.y		= a.y;


						p.item.setPosition(p.x * this.unitSize, 0.01, p.y * this.unitSize);

						if(this.recycleHandler) this.recycleHandler(p.x, p.y, p.item);
						break;
					}
				}
			}
		}

	//=============================================================
	// Helper Functions
		debug(){
			var txt = "";
			for(var i=0; i < 9; i++){
				txt += this.areas[i].x + ":" + this.areas[i].y + " \t ";
				if( ((i+1) % 3) == 0 ) txt += "\n";
			}
			console.log(txt);
			return this;
		}
}

export default PatchNine;