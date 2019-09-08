///////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////

function hashCode( str ){ // Create an hash Int based on string input.
	let hash = 5381, i = str.length;
	while(i) hash = (hash * 33) ^ str.charCodeAt(--i)
	return hash >>> 0; // Force Negative bit to Positive;
}

//function randomID(){
//	return (+new Date()) + (Math.random() * 100000000 | 0) + (++randomID.nextID);
//} randomID.nextID = 0;

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

	Ex:
	Components(
		class Test{
			constructor(){
				this.x = 0;
			}
		}
	);

	var com = Components("Test"); 	// New Component by calling its name
	var com = Components(1); 		// New Component by calling its ComponentTypeID

	both returns "new Test()";
####################################################################################*/
function Components( com ){
	switch( typeof com ){
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Register Function or Class to the Components List
		case "function":
			if(Components.list.has( com.name )){
				console.log( "Component name already exist : %s", com.name );
				return Components;
			}

			let typeID = hashCode( com.name );						// Generate Hash Integer
			com.prototype.componentTypeID	= typeID;				// Add Type ID to Object's Prototype
			com.prototype.entityID			= null;					// Reference to the Entity attached To.
			com.prototype.recycled			= false;				

			Components.list.set( com.name, { 			// Add object to list with extra meta data that may be needed.
				typeID	: typeID, 
				object	: com,
				cache 	: new Array(),
			});

			//console.info( "Registered Component : %s, TypeID: %s", com.name, typeID );

			return Components;
		break;

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Create a new component by using its Name
		case "string":
			
			let cInfo = Components.list.get( com );
			if( !cInfo ){
				console.error("Component not found ", com);
				return null;
			}

			//................................
			// Find Something to reuse
			let c, i;
			for(i=0; i < cInfo.cache.length; i++ ){
				if( cInfo.cache[i].recycled ){
					//console.log("Recycle Component of", com );
					c = cInfo.cache[i];
					c.recycled = false;

					if( cInfo.object.reset ) cInfo.object.reset( c );
					break;
				}
			}

			//................................
			// Create New Instance
			if( !c ) cInfo.cache.push( c = new cInfo.object() );

			return c;
		break;
	}
	return null;
}
Components.list		= new Map();
Components.get_ref 	= function( name ){ return Components.list.get( name ).object; }
Components.exists 	= function( name ){ return Components.list.has( name ); }
Components.dispose	= function( c ){ 
	c.entityID = null;
	c.recycled = true;
}


/*####################################################################################
	Entities
	Basicly just a container for a list of Components

	var ent = new Entity("test", ["Transform","Drawable"]);
####################################################################################*/
class Entity{
	constructor( name = "", comList = null ){
		this.info 	= {
			id 			: 0,		// Idenifier for Entity  randomID()
			name		: name,		// Given name of entity
			active		: true,		// Is entity Active
			recycled	: false,
			tag			: null,
		};

		if( comList ) Entity.com_fromArray( this, comList );
	}

	///////////////////////////////////////////////
	// COMPONENTS
	///////////////////////////////////////////////

		//Add component instance to Entity
		static com_add( e, c ){
			if( !c.componentTypeID ){
				console.error("Entity.addCom : not an component instance");
				return this;
			}

			c.entityID				= e.info.id;
			e[ c.constructor.name ]	= c;
			return this;
		}

		//Add Component by Component Name, Pass in Component Instance or Array of Component Names
		static com_fromName( e, cName ){
			let c;
			if( !(c = Components( cName )) ) return null;

			Entity.com_add( e, c );
			return c;
		}

		static com_fromArray( e, ary ){
			let i, c;
			for( i of ary ) if( c = Components(i) ) Entity.com_add( e, c );
			return Entity;
		}

		static com_rm( e, name ){
			if( e[ name ] ){
				Components.dispose( e[ name ] );
				delete e[ name ];
			}else console.log("Entity.removeCom name not found : ", name);
			return Entity;
		}


	//////////////////////////////////////////////
	// Object Handling
	//////////////////////////////////////////////
		static dispose( e ){
			let c;
			for( c in e ){
				if( c == "info") continue;

				//console.log("Rm Com", c ," in", e.info.name );
				Entity.com_rm( e, c );
			}
		}
}


/*####################################################################################
	Systems
	Logic that will execute on the component data of an entity
	NOTE: After changes, Systems don't really need to extend from System.
####################################################################################*/
class System{
	constructor(){}
	run( ecs ){
		console.log( "Run not implemented for: ", this.constructor.name );
	}
}


/*####################################################################################
Ecs
####################################################################################*/
let gSystemCount = 0; // Used to create an Order ID for Systems when added to an ECS Object

class Ecs{
	constructor(){
		this.entities		= new Array();
		this.systems		= new SortedArray( sys_idx ); //new Array();
		this.queryCache		= new Map();
	}


	//////////////////////////////////////////////////////
	// ENTITIES
	//////////////////////////////////////////////////////
		//Create a new Entity and add to the list automaticly
		entity( eName="New_Entity", comList = null ){
			let i, e;
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Reuse one or 
			for( i=0; i < this.entities.length; i++ ){
				if( this.entities[ i ].info.recycled ){
					//console.log("Recycling Entity");
					e = this.entities[ i ];
					e.info.recycled = false;
					e.info.name 	= eName;
					e.info.active	= true;
					break;	
				} 
			}

			if( !e ) e = this.entity_add( new Entity( eName ) );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( comList ){
				if( typeof(comList) == "string" )	Entity.com_fromName( e, comList );
				else 								Entity.com_fromArray( e, comList );
			}

			return e;
		}

		//Add Entity Instance to the List
		entity_add( e ){
			e.info.id = this.entities.length;
			this.entities.push( e ); 
			return e;
		}

		entity_rm( e ){
			e.info.active	= false;
			e.info.recycled	= true;
			Entity.dispose( e );
			return this;
		}

		entity_find( eName ){
			let e;
			for( e of this.entities ) if( e.info.name == eName ) return e;
			return null;
		}

		entity_by_id( id ){ return this.entities[ id ]; }


	//////////////////////////////////////////////////////
	// SYSTEMS
	//////////////////////////////////////////////////////
		sys_add( sys, priority = 50, active = true ){
			//if( ! sys instanceof System ){ console.error( "System not extended from system." ); return this; }

			this.systems.add({
				system	: sys,
				order	: ++gSystemCount,
				name	: sys.constructor.name,
				priority, 
				active,
			});

			return this;
		}

		sys_run(){
			let s;
			for( s of this.systems ) if( s.active ) s.system.run( this );
			return this;
		}

		sys_rm( sName ){
			let i;
			for( i=0; i < this.systems.length; i++ ){
				if( this.systems[ i ].name == sName ){
					this.systems.splice( i, 1 ); // console.log("Removing System :", sName);
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
		query_entities( comList, sortFunc=null ){
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			//Check if query has already been cached
			let queryName	= "query~" + comList.join("_"),
				out			= this.queryCache.get( queryName );
			if( out ) return out;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			//Not in cache, Run search
			let cLen	= comList.length,
				cFind	= 0,
				e,c;

			out	= new Array();
			for( e of this.entities ){
				cFind = 0;
				for(c of comList){
					if(! e[c])	break;		//Break Loop if Component Not Found
					else 		cFind++;	//Add to Find Count if Component Found.
				}
				if(cFind == cLen) out.push( e );
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			//Save Results for other systems
			if(out.length > 0){
				this.queryCache.set( queryName, out );
				if( sortFunc ) out.sort( sortFunc );
			}

			return out;
		}

		query_tag( tagName, sortFunc=null ){
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			//Check if query has already been cached
			let queryName	= "tag~" + tagName,
				out			= this.queryCache.get( queryName );
			if( out ) return out;
			out	= new Array();

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			//Not in cache, Run search
			let e;
			for( e of this.entities ) if( e.info.tag == tagName ) out.push( e );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			//Save Results for other systems
			if( out.length > 0 ){
				this.queryCache.set( queryName, out );
				if( sortFunc ) out.sort( sortFunc );
			}

			return out;
		}

		query_comp( name, sortFunc=null, cacheName=null ){
			let out;
			if( cacheName ){
				out = this.queryCache.get( cacheName );
				if( out ) return out;
			}

			out = Components.list.get( name );
			if( !out ){	console.error("Component not found ", com); return null; }
			if( out.cache.length == 0 ) return null;

			if( sortFunc ){
				out = [...out.cache];
				out.sort( sortFunc );

				if( cacheName ) this.queryCache.set( cacheName, out );
				return out;
			}	

			return out.cache;
		}
}


///////////////////////////////////////////////////////////////////////////////////
export { Components, Entity, System };
export default Ecs;