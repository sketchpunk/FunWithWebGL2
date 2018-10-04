import Armature	from "./Armature.js";
import Shader	from "../../fungi/Shader.js";
import Vao		from "../../fungi/Vao.js";
import Fungi	from "../../fungi/Fungi.js";
import gl		from "../../fungi/gl.js";
import { Components }	from "../../fungi/Ecs.js";

const ATTRIB_ROT_LOC 	= 8; //Shader.ATTRIB_JOINT_IDX_LOC		= 8;
const ATTRIB_POS_LOC 	= 9; //Shader.ATTRIB_JOINT_WEIGHT_LOC	= 9;
const ATTRIB_LEN_LOC	= 10;
const ATTRIB_SCALE_LOC	= 11;

class ArmaturePreview{
	constructor(){
		this.flatRotation	= null;
		this.flatPosition	= null;
		this.flatScale		= null;
	}


	static init(e){
		let arm	= e.com.Armature,
			ap	= new ArmaturePreview();

		if(arm.bones.length == 0){
			console.log("Armature does not have any bones. Bones needed to setup ArmaturePreview");
			return e;
		}

		ap.flatRotation	= new Float32Array( arm.bones.length * 4 );
		ap.flatPosition	= new Float32Array( arm.bones.length * 3 );
		ap.flatScale	= new Float32Array( arm.bones.length * 3 );

		e.addCom(ap);
		return e;
	}


	////////////////////////////////////////////////////////////////////
	//
	////////////////////////////////////////////////////////////////////
		static useStick(e, name){
			let verts	= [0,0,0,0, 0,1,0,1];
			e.com.Drawable.vao			= ArmaturePreview.vao(e, name, verts);
			e.com.Drawable.drawMode		= Fungi.LINE;
			//e.com.Armature.vaoPreview	= e.com.Drawable.vao;
			return this;
		}

		static useDiamond(e, name){
			const	pxz	= 0.06,
					py	= 0.1;

			const verts	= [
				0, 0, 0, 0,				// 0 Bottom
				0, 1, 0, 1,				// 1 Top
				-pxz, py,  pxz, 0,		// 2 Bot Left
				 pxz, py,  pxz, 0,		// 3 Bot Right
				 pxz, py, -pxz, 0,		// 4 Top Right
				-pxz, py, -pxz, 0		// 5 Top Left
			];

			const faces = [ 1,2,3, 1,3,4,  1,4,5,  1,5,2,
							 0,3,2, 0,4,3,  0,5,4,  0,2,5 ];
			
			e.com.Drawable.vao			= ArmaturePreview.vao(e, name, verts, faces);
			e.com.Drawable.drawMode		= Fungi.TRI;
			//e.com.Armature.vaoPreview	= e.com.Drawable.vao;
			return this;
		}

		static useDiamondWire(e, name){
			const	pxz	= 0.06,
					py	= 0.1;

			const verts	= [
				0, 0, 0, 0,				// 0 Bottom
				0, 1, 0, 1,				// 1 Top
				-pxz, py,  pxz, 0,		// 2 Bot Left
				 pxz, py,  pxz, 0,		// 3 Bot Right
				 pxz, py, -pxz, 0,		// 4 Top Right
				-pxz, py, -pxz, 0		// 5 Top Left
			];

			const faces = [ 1,2,1,3,1,4,1,5,
							0,2,0,3,0,4,0,5,
							2,3,3,4,4,5,5,2 ];
			
			e.com.Drawable.vao			= ArmaturePreview.vao(e, name, verts, faces);
			e.com.Drawable.drawMode		= Fungi.LINE;
			//e.com.Armature.vaoPreview	= e.com.Drawable.vao;
			return this;
		}

		static useCircleLine(e, name){
			const radius	= 0.08;
			const seg		= 10;
			let c, s, a,
				piOffset	= -Math.PI/2,
				pi2			= Math.PI*2,
				segInv		= 1 / seg,
				verts		= [];

			verts.push( 0, 1, -radius, 1);

			for(let i=0; i <= seg; i++){
				a = piOffset + pi2 * segInv * i;
				c = Math.cos(a);
				s = Math.sin(a);

				verts.push( radius*c, 0, radius*s, 0);
			}

			e.com.Drawable.vao			= ArmaturePreview.vao(e, name, verts);
			e.com.Drawable.drawMode		= Fungi.LINE_STRIP;
			e.com.Armature.vaoPreview	= e.com.Drawable.vao;
			return this;
		}


	////////////////////////////////////////////////////////////////////
	//
	////////////////////////////////////////////////////////////////////
		static vao(e, vName, verts, faces = null){
			let arm	= e.com.Armature,
				ap	= e.com.ArmaturePreview;

			ArmaturePreview.flattenData( e );

			//..........................................
			//Get a list of length of the bone that the joint represent
			let bLen	= arm.bones.length,
				lenAry	= new Float32Array( bLen );

			for(let i=0; i < bLen; i++) lenAry[i] = arm.bones[i].com.Bone.length;

			//..........................................
			let oVao = new Vao().create()
				.floatBuffer("bVertices",	verts, Shader.ATTRIB_POSITION_LOC, 4)
				.floatBuffer("bLengths",	lenAry,				ATTRIB_LEN_LOC,		1, 0, 0, true, true)
				.floatBuffer("bRotation",	ap.flatRotation,	ATTRIB_ROT_LOC,		4, 0, 0, true, true)
				.floatBuffer("bPosition",	ap.flatPosition,	ATTRIB_POS_LOC,		3, 0, 0, true, true)
				.floatBuffer("bScale",		ap.flatScale,		ATTRIB_SCALE_LOC,	3, 0, 0, true, true)
				.setInstanced( bLen );

			if(faces) oVao.indexBuffer("bIndex", faces);

			let vao = oVao.finalize(name);
			oVao.cleanup();

			return vao;
		}


	////////////////////////////////////////////////////////////////////
	//
	////////////////////////////////////////////////////////////////////
		static flattenData(e){
			let i, ii, iii, n, 
				arm = e.com.Armature,
				ap 	= e.com.ArmaturePreview,
				pos = ap.flatPosition,
				rot = ap.flatRotation,
				sca = ap.flatScale;

			for(i=0; i < arm.bones.length; i++){
				n	= arm.bones[i].com.TransformNode;
				ii	= i * 4;
				iii	= i * 3;

				rot[ii+0]	= n.rotation[0];
				rot[ii+1]	= n.rotation[1];
				rot[ii+2]	= n.rotation[2];
				rot[ii+3]	= n.rotation[3];

				pos[iii+0]	= n.position[0];
				pos[iii+1]	= n.position[1];
				pos[iii+2]	= n.position[2];

				sca[iii+0]	= n.scale[0];
				sca[iii+1]	= n.scale[1];
				sca[iii+2]	= n.scale[2];
			}

			return this;
		}

		static updateBuffer(e){
			//gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, e.com.Armature.vaoPreview.bOffset.id);
			//gl.ctx.bufferSubData(gl.ctx.ARRAY_BUFFER, 0, e.com.Armature.flatWorldSpace, 0, null);
			let ap 	= e.com.ArmaturePreview,
				vao	= e.com.Drawable.vao;

			gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, vao.bRotation.id);
			gl.ctx.bufferSubData(gl.ctx.ARRAY_BUFFER, 0, ap.flatRotation, 0, null);

			gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, vao.bPosition.id);
			gl.ctx.bufferSubData(gl.ctx.ARRAY_BUFFER, 0, ap.flatPosition, 0, null);

			gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, vao.bScale.id);
			gl.ctx.bufferSubData(gl.ctx.ARRAY_BUFFER, 0, ap.flatScale, 0, null);

			gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, null);

			return this;
		}
} Components(ArmaturePreview);

export default ArmaturePreview;