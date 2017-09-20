console.log("Loading ModA");

let test = "Unchanged";
const CONST = "some constant";

function outTest(){ console.log(test); }
function setTest(v){ test = v; }

class Cls{
	constructor(){

	}
	static log(v){ console.log(v); }
}

export default outTest;

export let log = (o)=>{ console.log(o); }

export { setTest, Cls, CONST }