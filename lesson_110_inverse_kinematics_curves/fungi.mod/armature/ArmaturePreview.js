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
		e.com.Armature.vaoPreview	= e.com.Drawable.vao;
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
		e.com.Armature.vaoPreview	= e.com.Drawable.vao;
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


	static vao(e, vName, verts, faces = null){
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

		if(faces) oVao.indexBuffer("bIndex", faces)

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


	/*
	constructor(name, arm, jointLen = 0.5, matName = "ArmaturePreview"){
		super(name, null, matName);
		this.armature = arm;
		this.drawMode = gl.ctx.LINES;

		var verts	= [0,0,0,0, 0,jointLen,0,1],
			offset	= arm.getFlatWorldSpace(),
floatBuffer(name, aryData, attrLoc, compLen=3, stride=0, offset=0, isStatic=true, isInstance=false){
			oVao 	= new Vao().create()
				.floatBuffer("bVertices", verts, Shader.ATTRIB_POSITION_LOC, 4)
				.floatBuffer("bOffset", offset, ATTRIB_QD_ROT_LOC, 4, 32, 0, true, true)	// QR (Rotation)
				.partitionFloatBuffer(ATTRIB_QD_POS_LOC, 4, 32, 16, true)					// QD (Translation)
				.setInstanced( offset.length / 8 );

		this.vao = oVao.finalize(name);
		oVao.cleanup();
	}

	//TODO Only Update if dirty;
	update(){
		var offset = this.armature.getFlatWorldSpace(offset);
		gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, this.vao.bOffset.id);
		gl.ctx.bufferSubData(gl.ctx.ARRAY_BUFFER, 0, offset, 0, null);
		gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, null);
	}
	*/
}

export default ArmaturePreview;