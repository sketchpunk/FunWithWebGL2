import * as modA from "./modA.js";
console.log("Loading ModB");

modA.setTest("modB Rules");

export default {
	one:1,
	two:2,
	three:3,
	func:function(){ console.log("modB func"); }
}