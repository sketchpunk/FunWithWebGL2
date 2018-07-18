import Armature	from "./Armature.js";
import Shader	from "../../fungi/Shader.js";
import Vao		from "../../fungi/Vao.js";
import Fungi	from "../../fungi/Fungi.js";
import gl		from "../../fungi/gl.js";

const ATTRIB_QD_ROT_LOC = 8; //Shader.ATTRIB_JOINT_IDX_LOC		= 8;
const ATTRIB_QD_POS_LOC = 9; //Shader.ATTRIB_JOINT_WEIGHT_LOC	= 9;
const ATTRIB_LEN_LOC	= 10;

class ArmaturePreview{
	static init(e){
		let arm = (e instanceof Armature)? e : e.com.Armature;

		if(arm.joints.length == 0){
			console.log("Armature does not have any bones. Bones needed to setup ArmaturePreview");
			return e;
		}

		arm.flatWorldSpace = new Float32Array( arm.joints.length * 8 );
		return e;
	}

	static useStick(e, name){
		let verts	= [0,0,0,0, 0,1,0,1];
		e.com.Drawable.vao			= ArmaturePreview.vao(e, name, verts);
		e.com.Drawable.drawMode		= Fungi.LINE;
		e.com.Armature.vaoPreview	= e.com.Drawable.vao;
		return this;
	}

	static vao(e, vName, verts){
		let arm = (e instanceof Armature)? e : e.com.Armature;
		ArmaturePreview.flattenData(arm);

		//..........................................
		//Get a list of length of the bone that the joint represent
		let lenAry = new Float32Array( arm.joints.length );
		for(let i=0; i < arm.joints.length; i++){
			lenAry[i] = arm.joints[i].length;
		}

		//..........................................
		let oVao = new Vao().create()
			.floatBuffer("bVertices", verts, Shader.ATTRIB_POSITION_LOC, 4)
			.floatBuffer("bLengths", lenAry, ATTRIB_LEN_LOC, 1, 4, 0, true, true)
			.floatBuffer("bOffset", arm.flatWorldSpace, ATTRIB_QD_ROT_LOC, 4, 32, 0, true, true)	// QR (Rotation)
			.partitionFloatBuffer(ATTRIB_QD_POS_LOC, 4, 32, 16, true)								// QD (Translation)
			.setInstanced( arm.joints.length );

		let vao = oVao.finalize(name);
		oVao.cleanup();

		return vao;
	}

	static flattenData(e){
		let arm = (e instanceof Armature)? e : e.com.Armature;
		Armature.flatWorldSpace(arm, arm.flatWorldSpace);
		return this;
	}

	static updateBuffer(e){
		gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, e.com.Armature.vaoPreview.bOffset.id);
		gl.ctx.bufferSubData(gl.ctx.ARRAY_BUFFER, 0, e.com.Armature.flatWorldSpace, 0, null);
		gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, null);

		return this;
	}
}

export default ArmaturePreview;