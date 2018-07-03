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

			console.log("Registered Component : %s, TypeID: %s", com.name, typeID );

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


export { Components, Entity };