import Voxel		from "./Voxel.js";
import VChunk		from "./VoxelChunk.js";
import { System }	from "../../fungi/Ecs.js";

const QUERY_COM = ["VoxelChunk", "VoxelDynamicVao"];

class DynamicVoxelSystem extends System{
	constructor(){ super(); }

	update(ecs){
		let ary		= ecs.queryEntities( QUERY_COM ),
			vAry	= new Array(),
			uAry	= new Array(),
			iAry	= new Array(),
			vc, vdv, e;

		for( e of ary ){
			if(!e.active || !e.com.VoxelChunk.isModified) continue;

			//Short Cuts
			vc	= e.com.VoxelChunk;
			vdv = e.com.VoxelDynamicVao;
			
			//Build Mesh
			Voxel.buildMesh(vc, VChunk.get, vAry, iAry, uAry);

			//Send Mesh to GPU
			vdv.verts.pushToGPU(vAry);
			vdv.uv.pushToGPU(uAry);
			vdv.index.pushToGPU(iAry);
			e.com.Drawable.vao.elmCount = vdv.index.getComponentCnt();

			//Clear out Arrays
			vAry.length = 0;
			uAry.length = 0;
			iAry.length = 0;

			vc.isModified = false;
			//console.log("updated voxel", e.name);
		}
	}
}

export default DynamicVoxelSystem;