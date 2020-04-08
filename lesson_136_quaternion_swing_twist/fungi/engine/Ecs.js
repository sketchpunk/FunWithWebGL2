
//####################################################################################
// Can not use anything less then Uint32, the way bit shifting is done by
// looping back around when going over the int limit, 
// so bit shift if 32 will only set the first bit
const IDX_BIT = 5; // 5 bit shift, value of 32.
class Bitset{
	constructor(){
		this.bits = new Uint32Array( 1 );
	}

	//////////////////////////////////////////////////////////
	// 
	//////////////////////////////////////////////////////////
		get bit_count(){ return this.bits.length * 32; }

		reset(){
			for( let i=0; i < this.bits.length; i++ ) this.bits[ i ] = 0;
			return this;
		}
	
		hash(){
			// Simple String hash algorithm rewritten to break down
			// each int as 4 bytes to treat each byte as a char.
			//    let hash = 5381, i = str.length;
			//    while(i) hash = (hash * 33) ^ str.charCodeAt(--i)
			//    return hash >>> 0; 

			let b, hash = 5381;
			for( b of this.bits ){
				hash = (hash * 33) ^ ( b & 255 );
				hash = (hash * 33) ^ ( (b >>> 8) & 255 );
				hash = (hash * 33) ^ ( (b >>> 16) & 255 );
				hash = (hash * 33) ^ ( (b >>> 24) & 255 );
			}
			return hash >>> 0; // Force Negative bit to Positive;
		}

		get_iterator(){
			let i=0, len = this.bits.length * 32;
			return ()=>{
				let rtn = null;
				while( i < len && rtn == null ){
					if( (this.bits[ i >>> IDX_BIT ] & (1 << i) ) != 0 ) rtn = i;
					i++;
				}
				return rtn;
			};
		}

	//////////////////////////////////////////////////////////
	// Bit Operations
	//////////////////////////////////////////////////////////
		has( bi ){
			let i = bi >>> IDX_BIT;
			if( i >= this.bits.length ) return false;
			return ( this.bits[i] & (1 << bi) ) != 0;
		}

		on( bi ){
			let i = this._resize_idx( bi );
			this.bits[ i ] |= 1 << bi;
			return this;
		}

		off( bi ){
			let i = this._resize_idx( bi );
			this.bits[ i ] &= ~(1 << bi); //Bit Shift 1, Flip all bits to create a mask, then bitAnd to set only 1s as 1.
			return this;
		}

		flip( bi ){
			let i = this._resize_idx( bi );
			this.bits[ i ] ^= 1 << bi;
			return this;
		}

		is_mask( mask ){
			if( this.bits.length < mask.bits.length ) return false;	
			for( let i=0; i < mask.bits.length; i++ ){
				if( (this.bits[i] & mask.bits[i]) != mask.bits[i] ) return false;
			}
			return true;
		}

	//////////////////////////////////////////////////////////
	// Private Helpers
	//////////////////////////////////////////////////////////

		// Calc Index by shifting away an integer value of 32
		// then resize the bit array if index is over the current capacity.
		_resize_idx( bi ){
			let i = bi >>> IDX_BIT;
			if( i >= this.bits.length ){
				let j, ary = new Uint32Array( i+1 );
				for( j=0; j < i; j++ ) ary[ j ] = this.bits[ j ];
				this.bits = ary;
			}
			return i;
		}
}

class SortedArray extends Array{
	constructor( sFunc, size = 0 ){
		super( size );
		this._sort_index = sFunc
	}

	add( itm ){
		let saveIdx	= this._sort_index( this, itm );

		if( saveIdx == -1 ) this.push( itm );
		else{
			this.push( null );								// Add blank space to the array

			let x;
			for(x = this.length-1; x > saveIdx; x-- ){		// Shift the array contents one index up
				this[ x ] = this[ x-1 ];
			}

			this[ saveIdx ] = itm;							// Save new Item in its sorted location
		}

		return this;
	}
}

function sys_idx( ary, itm ){
	let s, i=-1, saveIdx = -1;
	for( s of ary ){
		i++;
		if(s.priority < itm.priority) continue;							// Order by Priority First
		if(s.priority == itm.priority && s.order < itm.order) continue;	// Then by Order of Insertion
		
		saveIdx = i;
		break;
	}
	return saveIdx;
}


/*####################################################################################
	Components
	Creates a Factory to generate new Components which for ECS should just be data only
####################################################################################*/

class Components{
	static reg( com ){
		if( this.names.has( com.name ) ){ console.error( "Component name already exists : %s", com.name ); return this; }

		com.prototype.component_type_id	= this.list.length;
		com.prototype.component_id 		= null;
		com.prototype.entity_id			= null;
		com.prototype.recycled			= false;

		this.names.set( com.name, com.prototype.component_type_id );
		this.list.push({
			name 		: com.name,
			object		: com,
			cache		: new Array(),	// All Component Instances
			recycle 	: new Array(),	// List it Indexes of components to recycle
		});

		return this;
	}

	static mk( name ){
		//console.log("Make Component: ", name );

		let idx = this.names.get( name );
		if( idx == undefined ){ console.error( "Component name unknown : %s", name ); return null; }

		let c, com = this.list[ idx ];

		if( com.recycle.length > 0 ){
			let i = com.recycle.pop();
			c = com.cache[ i ];
			c.recycled = false;

			if( com.object.reset ) com.object.reset( c );
		}else{
			c = new com.object();
			c.component_id = com.cache.length;
			com.cache.push( c );
		}

		return c;
	}

	static dispose( c ){
		c.entity_id	= null;
		c.recycled	= true;

		this.list[ c.component_type_id ]
			.recycle
			.push( c.component_id );
	}

	static get_cache( name ){
		let idx = this.names.get( name );
		if( idx == undefined ){ console.error( "Component name unknown : %s", name ); return null; }
		return this.list[ idx ].cache;
	}

	static create_bit_mask( name_ary, bs = null ){
		let n, i;

		bs = bs || new Bitset();
		for( n of name_ary ){
			i = this.names.get( n );
			if( i == undefined ){ console.error( "Component name unknown : %s", name ); return null; }
			bs.on( i );
		}

		return bs;
	}

	static get_id( name ){
		let idx = this.names.get( name );
		if( idx == undefined ){ console.error( "Component name unknown : %s", name ); return null; }
		return idx;
	}

	static get_name( idx ){ return this.list[ idx ].name; }
	static get_names_by_bitset( bs ){
		let next 	= bs.get_iterator(),
			names 	= new Array();

		let i;
		while( (i = next()) != null ){
			names.push( this.list[ i ].name );
		}
		return names;
	}
}

Components.list		= new Array();	// List of Components
Components.names	= new Map();	// Name to Index mapping of components


//####################################################################################
class Tags{
	static reg(){
		let i;
		for( i of arguments ){
			if( this.list.has( i ) )	console.error( "Tag already exists:", i );
			else 						this.list.set( i, this.bit_id++ );	
		}
		return this;
	}

	static create_bit_mask( name_ary, bs = null ){
		let n, i;

		bs = bs || new Bitset();
		for( n of name_ary ){
			i = this.list.get( n );
			if( i == undefined ){ console.error( "Tag name unknown : %s", name ); return null; }
			bs.on( i );
		}

		return bs;
	}

	static get_id( name ){
		let idx = this.list.get( name );
		if( idx == undefined ){ console.error( "Tag name unknown : %s", name ); return null; }
		return idx;
	}
}

Tags.bit_id	= 0;
Tags.list 	= new Map();


//####################################################################################
class Entity{
	constructor( name="" ){
		this.info 	= {
			id 			: 0,			// Idenifier for Entity  randomID()
			name		: name,			// Given name of entity
			active		: true,			// Is entity Active
			recycled	: false,
			components 	: new Bitset(),	// Bitset of Components Assigned to Entity
			tags 		: new Bitset(),	// Bitset of Tags Assigned to Entity
		};
	}

	//////////////////////////////////////////////////////////
	//
	//////////////////////////////////////////////////////////
		add_com( name ){
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Error Checking
			if( this.info.recycled ){ console.error("Can not add component to a recycled entity."); return null; }
			if( this[ name ] ){ console.error("Entity already has a component assigned by the name:", name ); return null; }

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Get new Component
			let c = Components.mk( name );
			if( !c ) return null;
			
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Assign it to the entity
			c.entity_id = this.info.id;						// Set Entity ID that component is attached too.
			this[ c.constructor.name ] = c;					// Set Object Reference onto entity
			this.info.components.on( c.component_type_id );	// Set Component Bit 
			return c;
		}

		rm_com( name ){
			let i = Components.get_id( name );
			if( i == null ){
				console.error("Unknown component to remove from entity, %s", name );
				return this;
			}

			let c = this[ name ];						// Get Component Ref		
			delete this[ name ];						// Remove it from Entity Object

			this.info.components.off( c.component_type_id );	// Turn off bit
			Components.dispose( c );					// Call dispose of components
			return this;
		}

		clear_com(){
			let names = Components.get_names_by_bitset( this.info.components );
			if( names.length == 0 ) return this;

			let c, n;
			for( n of names ){
				c = this[ n ];
				delete this[ n ];
				Components.dispose( c );
			}

			this.info.components.reset();
			return this;
		}

	//////////////////////////////////////////////////////////
	//
	//////////////////////////////////////////////////////////
		add_tag( name ){
			let idx = Tags.get_id( name );
			if( idx == null ) return this;
			this.info.tags.on( idx );
			return this;
		}

		rm_tag( name ){
			let idx = Tags.get_id( name );
			if( idx == null ) return this;
			this.info.tags.off( idx );
			return this;
		}

		clear_tag(){ this.info.tags.reset(); return this; }
}


//####################################################################################
let gSystemCount = 0; // Used to create an Order ID for Systems when added to an ECS Object
class Ecs{
	constructor(){
		this.entities			= new Array();
		this.entities_recycle	= new Array();
		this.systems			= new SortedArray( sys_idx );

		this.query_cache		= new Map();
	}

	//////////////////////////////////////////////////////
	// ENTITIES
	//////////////////////////////////////////////////////
		entity( e_name="New_Entity", com_list = null ){
			let i, e;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Reuse one or create a new entity
			if( this.entities_recycle.length > 0 ){
				i = this.entities_recycle.pop();
				e = this.entities[ i ];

				e.info.recycled = false;
				e.info.name 	= e_name;
				e.info.active	= true;
			}else{
				e			= new Entity( e_name );
				e.info.id	= this.entities.length;
				this.entities.push( e );
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( com_list ){
				if( typeof(com_list) == "string" )	e.add_com( this.com_list );
				else{
					let c;
					for( c of com_list ) e.add_com( c );
				}
			}

			return e;	
		}

		rm_entity( e ){
			if( e.info.recycled ) return this;

			e.clear_com();
			e.info.active	= false;
			e.info.recycled = true;

			this.entities_recycle.push( e.info.id );

			return this;
		}

	//////////////////////////////////////////////////////
	// SYSTEMS
	//////////////////////////////////////////////////////
		sys_add( sys, priority = 50, active = true ){
			let itm = {
				cls 	: null,				// System Class Instance if it s a Class
				fn 		: null,				// System function or Pointer to Class RUN
				order	: ++gSystemCount,
				name	: null,
				priority, 
				active,
			};

			if( sys.constructor.name == "Function" ){
				itm.fn		= sys;
				itm.name	= sys.name;
			}else{
				itm.cls		= sys;
				itm.name	= sys.constructor.name;
				itm.fn		= sys.run.bind( sys );
			}

			this.systems.add( itm );
			return this;
		}

		sys_run(){
			let s;
			for( s of this.systems ) if( s.active ) s.fn( this );
			return this;
		}

		sys_rm( sName ){
			let i;
			for( i=0; i < this.systems.length; i++ ){
				if( this.systems[ i ].name == sName ){
					let ss = this.systems.splice( i, 1 );
					ss.cls	= null;
					ss.fn	= null;
					break;
				}
			}
			return this;
		}

		sys_active( sName, state = true ){
			let i;
			for( i of this.systems ) if( i.name == sName ){ i.active = state; break; }
			return this;	
		}

	//////////////////////////////////////////////////////
	// QUERIES
	//////////////////////////////////////////////////////
		
		query_entities( com_list, sort_fn=null ){
			let bit_mask 	= Components.create_bit_mask( com_list ),
				bit_hash 	= bit_mask.hash(),
				query_name	= "bitmask_" + bit_hash;

			// Check if query is cached.
			if( this.query_cache.has( query_name ) ) return this.query_cache.get( query_name );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let e, out = new Array();
			for( e of this.entities ){
				if( !e.info.components.is_mask( bit_mask ) ) continue;
				out.push( e );
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Save Results for later reuse
			if(out.length > 0){
				this.query_cache.set( query_name, out );
				if( sort_fn ) out.sort( sort_fn );
			}

			return out;
		}

		query_comp( name, sort_fn=null ){
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Check Cache for Sorted Components
			if( sort_fn ){
				let out = this.query_cache.get( "comp_" + name + "_" + sort_fn.name );
				if( out ) return out;
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~	
			let com_cache = Components.get_cache( name );
			if( !com_cache ) return null;
			
			if( sort_fn ){
				let out = [ ...com_cache ];
				out.sort( sort_fn );
				this.query_cache.set( "comp_" + name + "_" + sort_fn.name, out );
				return out;
			}

			return com_cache; // No Sort, Just pass cache array
		}

		query_tags( com_list, sort_fn=null ){
			let bit_mask 	= Tags.create_bit_mask( com_list ),
				bit_hash 	= bit_mask.hash(),
				query_name	= "tag_bitmask_" + bit_hash;

			// Check if query is cached.
			if( this.query_cache.has( query_name ) ) return this.query_cache.get( query_name );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let e, out = new Array();
			for( e of this.entities ){
				if( !e.info.tags.is_mask( bit_mask ) ) continue;
				out.push( e );
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Save Results for later reuse
			if(out.length > 0){
				this.query_cache.set( query_name, out );
				if( sort_fn ) out.sort( sort_fn );
			}

			return out;
		}
}

export default Ecs;
export { Components, Entity, Tags }