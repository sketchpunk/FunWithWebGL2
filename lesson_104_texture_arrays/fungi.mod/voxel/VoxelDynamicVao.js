import Vao				from "../../fungi/Vao.js";
import DynamicBuffer	from "../../fungi/data/DynamicBuffer.js";
import { Components }	from "../../fungi/Ecs.js";

class VoxelDynamicVao{
	constructor(){
		this.verts		= null;
		this.uv			= null;
		this.index 		= null;
	}

	////////////////////////////////////////////////////////////////////
	// INITIALIZERS
	////////////////////////////////////////////////////////////////////
		static init(e, name, x=2, y=2, z=2, scale=0.2, initVal=0 ){
			let vdv = e.com.VoxelDynamicVao;
			if(!vdv) vdv = e.addByName("VoxelDynamicVao");

			let vao		= Vao.standardEmpty(name, 4, 1, 0, 1, 1);
			vdv.verts	= DynamicBuffer.newFloat(vao.bVertices.id, 4, 1);
			vdv.uv		= DynamicBuffer.newFloat(vao.bUV.id, 2, 1);
			vdv.index	= DynamicBuffer.newElement(vao.bIndex.id, 1);

			e.com.Drawable.vao = vao;

			return e;
		}
} Components(VoxelDynamicVao);

export default VoxelDynamicVao;