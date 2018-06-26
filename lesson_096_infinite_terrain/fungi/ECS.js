/*------------------------------------------------------
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

------------------------------------------------------*/
let nextComponentID = 0;
function Components(com){
	switch(typeof com){
		//..................................
		// Register Function or Class to the Components List
		case "function":
			if(Components.list.has(com.name)){
				console.log("Component name already exist : %s", com.name);
				return Components;
			}

			let typeID = ++nextComponentID;				//Get Next ID Number
			com.prototype.componentTypeID = typeID;		//Add Type ID to Object's Prototype
			com.prototype.entity = null;				//Entity Component is Attached To.

			Components.list.set(com.name, { 		//Add object to list with extra meta data that may be needed.
				typeID	: typeID, 
				object	: com 
			});

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
Components.list = new Map();


/*------------------------------------------------------
Entities
Basicly just a container for a list of Components
------------------------------------------------------*/
let nextEntityID = 0;
function newEntityID(){ 
	//return (+new Date()).toString(16) + (Math.random() * 100000000 | 0).toString(16) + (++nextEntityID);
	return (+new Date()) + (Math.random() * 100000000 | 0) + (++nextEntityID);
}

class Entity{
	constructor(name = ""){
		this.id		= newEntityID();
		this.name	= name;
		this.active	= true;
		this.com	= {};
	}

	//--------------------------------
	// Handle Components
	_add(c){
		c.entity = this;
		this.com[ c.constructor.name ] = c;
	}

	add(com){
		var c = null;

		switch(typeof com){
			//..............................
			case "string":
				if(!(c = Components(com))) console.log("Could not found component ", com);
			break;
			
			//..............................
			case "function": c = com; break;

			//..............................
			case "object": //Most Likey an Array
				if(Array.isArray(com)){
					let i, c;
					for(i of com){
						if( c = Components(i) )	this._add( c );
						else					console.log("Could not found component ", i);
					}
				}else console.log("Array not passed to Entity.add");
			break;

			//..............................
			default: console.log("Unknown type passed to Entity.add", typeof com, com); break;
		}

		if(c) this._add(c); //this.com[ c.constructor.name ] = c;
		return this;
	}

	remove(name){
	}
}


/*------------------------------------------------------
Assemblages
Some predefined entities, to make it easy to create common entity objects
with the right set of components.

Ex:

Assemblages.add("particle", ["Movement", "Transform"]);
var ent = Assemblages.new("particle","MyParticle");
------------------------------------------------------*/
class Assemblages{
	static add(name, comList){
		Assemblages.list.set(name, {
			componentList : comList
		});

		return Assemblages;
	}

	static new(aName, eName="New_Entity"){
		let itm = Assemblages.list.get(aName);

		if(itm)	return new Entity(eName).add( itm.componentList );
		else 	console.log("No Assemblages Named ", name);

		return null;
	}
}

Assemblages.list = new Map();


/*------------------------------------------------------
Systems
Logic that will execute on the component data of an entity
------------------------------------------------------*/
class System{
	constructor(){
		this.requiredComponents = new Array();
	}
}


/*------------------------------------------------------
World
Hold the list of entities and Systems

Ex:
var gWorld = new World();
gWorld.addTemplate("particle", ["Movement", "Transform"]);
var ent = gWorld.newEntity("particle","MyParticle");

------------------------------------------------------*/
class World{
	constructor(){
		this.Entities		= new Map();
		this.Systems		= new Array();
		this.FilteredLists	= new Map();
	}

	//----------------------------------------------
	newEntity(aName, eName="New_Entity"){
		let e = Assemblages.new(aName);

		if(e){
			this.addEntity(e);
			return e;
		}

		return null;
	}

	addEntity(e){
		this.Entities.set( e.id, e );
		return this;
	}

	removeEntity(eID){	
		console.log("removeEntity not implemented");
		return this;
	}

	//----------------------------------------------
	addSystem(s){
		var listName = s.requiredComponents.sort().join("_");

		if(!this.FilteredLists.has(listName)){
			this.FilteredLists.set(listName, {
				entities : null,
				components : s.requiredComponents.splice(0)
			});
		}

		this.Systems.push({ system:s, listName: listName });
		return this;
	}

	systemUpdate(dt, ss){
		let s, l;
		for(s of this.Systems){
			l = this.FilteredLists.get( s.listName );
			s.system.update(dt, ss, l.entities );
		}
		return this;
	}

	//----------------------------------------------
	updateFilteredLists(){
		var i;
		for([,i] of this.FilteredLists) i.entities = this.filter( i.components );
		return this;
	}

	filter(comList){
		let out		= new Array(),
			cLen	= comList.length,
			cFind	= 0,
			e,c;

		for([,e] of this.Entities){
			cFind = 0;
			for(c of comList){
				if(! e.com[c])	break;		//Break Loop if Component Not Found
				else 			cFind++;	//Add to Find Count if Component Found.
			}
			if(cFind == cLen) out.push( e );
		}
		return out;
	}
}



/*------------------------------------------------------
Events
Use the DOM Custom Event Handling functionality by creating a
text node as the base. This gives full event features plus 
if one event callback crashes, it won't crash the wholes stack.
Also allows the use of e.preventDefault() and e.stopPropagation()

Ex:
var eHandler = new EventHandler();

eHandler.add("test",function(e){ console.log("test", e.detail, e); })

eHandler.dispatch(new Event("test"));
eHandler.dispatch(new CustomEvent("test", { detail: "woot" }) );

eHandler.dispatchEvent("test", {detail:"test"});
eHandler.dispatchEvent("test");
------------------------------------------------------*/
class EventHandler{
	constructor(){
		this._domNode	= document.createTextNode(null);
		this.add		= this._domNode.addEventListener.bind(this._domNode);
		this.remove		= this._domNode.removeEventListener.bind(this._domNode);
		this.dispatch	= this._domNode.dispatchEvent.bind(this._domNode);
	}

	dispatchEvent(eName, data=null){
		this.dispatch( (!data)? new Event(eName) : new CustomEvent(eName, data) );
	}
}

/*------------------------------------------------------
EXPORT
------------------------------------------------------*/

export { World, Components, Entity, Assemblages, System, EventHandler };