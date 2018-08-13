///////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////

function hashCode(str){ //Create an hash Int based on string input.
	let hash = 5381, i = str.length;
	while(i) hash = (hash * 33) ^ str.charCodeAt(--i)
	return hash >>> 0; //Force Negative bit to Positive;
}


function randomID(){
	return (+new Date()) + (Math.random() * 100000000 | 0) + (++randomID.nextID);
} randomID.nextID = 0;


/*/////////////////////////////////////////////////////////////////////////////////
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
/////////////////////////////////////////////////////////////////////////////////*/
function Components(com){
	switch(typeof com){
		//..................................
		// Register Function or Class to the Components List
		case "function":
			if(Components.list.has(com.name)){
				console.log("Component name already exist : %s", com.name);
				return Components;
			}

			let typeID = hashCode(com.name);						// Generate Hash Integer
			com.prototype.componentTypeID	= typeID;				// Add Type ID to Object's Prototype
			com.prototype.entity			= null;					// Reference to the Entity attached To.

			Components.list.set(com.name, { 			// Add object to list with extra meta data that may be needed.
				typeID	: typeID, 
				object	: com 
			});

			//console.log("Registered Component : %s, TypeID: %s", com.name, typeID );

			return Components;
		break;

		//---------------------------------
		// Create a new component by using its Name
		case "string":
			let c = Components.list.get(com);
			return (c)? new c.object() : null;
		break;

		//---------------------------------
		// Create a new component by using its TypeID
		case "number":
			let v;
			for([,v] of Components.list){
				if( v.typeID == com ) return new v.object();
			}
		break;
	}
	return null;
}
Components.list		= new Map();
Components.exists 	= function(name){ return Components.list.has(name); }
Components.dispose	= function(c){ c.entity = null; }



/*/////////////////////////////////////////////////////////////////////////////////
	Entities
	Basicly just a container for a list of Components

	var ent = new Entity("test", ["Transform","Drawable"]);
/////////////////////////////////////////////////////////////////////////////////*/
class Entity{
	constructor(name = "", comList = null){
		this.id		= randomID();	// Used as the Key in entities list
		this.name	= name;			// Given name of entity
		this.active	= true;			// Is entity Active
		this.com	= {};			// List of components

		if( comList ) this.addByArray( comList );
	}

	//--------------------------------
	// COMPONENTS
		//Add component instance to Entity
		addCom(c){
			if(!c.componentTypeID){
				console.log("Entity.addCom : not an component instance");
				return this;
			}

			c.entity						= this;
			this.com[ c.constructor.name ]	= c;
			return this;
		}

		//Add Component by Component Name, Pass in Component Instance or Array of Component Names
		addByName(cName){
			let c;
			if(!(c = Components(cName))){
				console.log("Could not found component ", cName);
				return null;
			}
			this.addCom( c );
			return c;
		}

		addByArray(ary){
			let i, c;
			for(i of ary){
				if( c = Components(i) )	this.addCom( c );
				else					console.log("Could not found component ", i);
			}
			return this;
		}

		removeCom(name){
			if( this.com [ name ] ){
				Components.dispose( this.com [ name ] );
				delete this.com [ name ];
			}else 					console.log("Entity.removeCom name not found : ", name);
			return this;
		}
	//--------------------------------
	// Object Handling
		static dispose(e){
			let c;
			for( c in e.com ) e.removeCom( c );
		}
}


/*/////////////////////////////////////////////////////////////////////////////////
	Assemblages
	Some predefined entities, to make it easy to create common entity objects
	with the right set of components.

	Ex:

	Assemblages.add("particle", ["Movement", "Transform"]);
	var ent = Assemblages.new("particle","MyParticle");
/////////////////////////////////////////////////////////////////////////////////*/
class Assemblages{
	static async add(name, comList){
		//..............................
		//Dynamicly Load in components that are not registered.
		for(let c of comList){
			if(!Components.exists(c)) await import(`./components/${c}.js`);
		}

		//..............................
		//Create Assemblage Item
		Assemblages.list.set(name, { componentList : comList });

		//console.log("New Assemblage : %s with components : %s", name, comList.join(", ") );
		return Assemblages;
	}

	static new(aName, eName="New_Entity"){
		let itm = Assemblages.list.get(aName);

		if(itm)	return new Entity(eName, itm.componentList);
		else 	console.log("No Assemblage with the name: ", name);

		return null;
	}
}

Assemblages.list = new Map();


/*/////////////////////////////////////////////////////////////////////////////////
	Systems
	Logic that will execute on the component data of an entity
/////////////////////////////////////////////////////////////////////////////////*/
class System{
	constructor(){ this.active = true; }
}


/*/////////////////////////////////////////////////////////////////////////////////
Ecs
/////////////////////////////////////////////////////////////////////////////////*/
let gSystemCount = 0; //Used to create an Order ID for Systems when added to an ECS Object

class Ecs{
	constructor(){
		this.Entities		= new Map();
		this.Systems		= new Array();
		this.QueryCache		= new Map();
	}


	//----------------------------------------------
	// ENTITIES
		//Create a new Entity based on an Aessmblage Name
		newAssemblage(aName, eName="New_Entity"){
			let e = Assemblages.new(aName, eName);

			if(e){ this.addEntity(e); return e; }
			return null;
		}

		//Create a new Entity and add to the list automaticly
		newEntity(eName="New_Entity", comList = null){
			let e = new Entity(eName, comList);

			if(e){ this.addEntity(e); return e; }
			return null;
		}

		//Add Entity Instance to the List
		addEntity(e){ this.Entities.set( e.id, e ); return this; }


		removeEntity(eID){
			let e = this.Entities.get(eID);
			if(e){
				Entity.dispose( e );
				this.Entities.remove( eID );
			}else console.log("Entity does not exist when trying to remove : ", eID);

			return this;
		}


	//----------------------------------------------
	// SYSTEMS
		addSystem(system, priority = 50){
			let order	= ++gSystemCount,
				itm		= { system, priority, order, name:system.constructor.name },
				saveIdx	= -1,
				i 		= -1,
				s;

			//...................................
			//Find where on the area to put the system
			for(s of this.Systems){
				i++;

				if(s.priority < priority) continue;						//Order by Priority First
				if(s.priority == priority && s.order < order) continue;	//Then by Order of Insertion

				saveIdx = i;
				break;
			}

			//...................................
			//Insert system in the sorted location in the array.
			if(saveIdx == -1) this.Systems.push(itm);
			else{
				this.Systems.push(null);								//Add blank space to the array

				for(var x = this.Systems.length-1; x > saveIdx; x--){	//Shift the array contents one index up
					this.Systems[x] = this.Systems[x-1];
				}

				this.Systems[saveIdx] = itm;							//Save new Item in its sorted location
			}

			//console.log("Adding System: %s with priority: %s and insert order of %d", system.constructor.name, priority, order);
			return this;
		}

		updateSystems(){
			let s;
			for(s of this.Systems) s.system.update( this );
			return this;
		}

		removeSystem(sName){
			let i;
			for(i=0; i < this.Systems.length; i++){
				if(this.Systems[i].name == sName){
					this.Systems.splice(i,1);
					//console.log("Removing System :", sName);
					break;
				}
			}
			return this;
		}


	//----------------------------------------------
	// QUERIES
		queryEntities(comList, sortFunc=null){
			//.............................
			//Check if query has already been cached
			let queryName	= "query~" +comList.join("_"),
				out			= this.QueryCache.get(queryName);
			if(out) return out;

			//.............................
			//Not in cache, Run search
			let cLen	= comList.length,
				cFind	= 0,
				e,c;

			out	= new Array();
			for([,e] of this.Entities){
				cFind = 0;
				for(c of comList){
					if(! e.com[c])	break;		//Break Loop if Component Not Found
					else 			cFind++;	//Add to Find Count if Component Found.
				}
				if(cFind == cLen) out.push( e );
			}

			//.............................
			//Save Results for other systems
			if(out.length > 0){
				this.QueryCache.set(queryName, out);
				if(sortFunc) out.sort(sortFunc);
			}
			return out;
		}
}


///////////////////////////////////////////////////////////////////////////////////
export { Components, Assemblages, Entity, System };
export default Ecs;