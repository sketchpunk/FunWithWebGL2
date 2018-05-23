import Voxel		from "./Voxel.js";
import Vao			from "../../fungi/Vao.js";
import Renderable	from "../../fungi/rendering/Renderable.js";

class VoxelRenderable extends Renderable{
	constructor(name, vc, matName){
		super(name, null, matName);
		this.drawMode = 4; //gl.ctx.TRIANGLES;

		var vAry = [], iAry = [];
		Voxel.buildMesh(vc, vAry, iAry);

		this.vao = Vao.standardRenderable(name, Voxel.COMPLEN, vAry, null, null, iAry);
	}
}

export default VoxelRenderable;