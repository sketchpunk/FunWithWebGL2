import Fungi			from "../Fungi.js";
import { Components }	from "../Ecs.js";

class Drawable{
	constructor(){
		this.vao		= null;
		this.drawMode	= Fungi.TRI;
		this.material	= null;
		this.options 	= { cullFace:true }
	}
} Components(Drawable);

export default Drawable;