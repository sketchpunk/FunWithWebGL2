import gl 		from "./gl.js";
import Cache	from "./Cache.js";
import Shader	from "./Shader.js";

const BUF_V_NAME	= "vertices";
const BUF_N_NAME	= "normal";
const BUF_UV_NAME	= "uv";
const BUF_IDX_NAME	= "indices";
const BUF_BI_NAME	= "boneIndex";
const BUF_BW_NAME	= "boneWeight";


//##################################################################
class Buffer{
	static array( target, aryData, isStatic, dataType, attrLoc, compLen=3, stride=0, offset=0, isInstance=false ){
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Create and Bind New Buffer
		let id = gl.ctx.createBuffer();
		gl.ctx.bindBuffer( target, id );

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Depending on type, 
		switch( target ){
			case gl.ctx.ELEMENT_ARRAY_BUFFER:
				gl.ctx.bufferData( target, aryData, (isStatic)? gl.ctx.STATIC_DRAW : gl.ctx.DYNAMIC_DRAW );
				break;

			case gl.ctx.ARRAY_BUFFER:
				gl.ctx.bufferData( target, aryData, (isStatic)? gl.ctx.STATIC_DRAW : gl.ctx.DYNAMIC_DRAW );
				gl.ctx.enableVertexAttribArray( attrLoc );
				gl.ctx.vertexAttribPointer( attrLoc, compLen, dataType, false, stride, offset );
				break;
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		if( isInstance == true ) gl.ctx.vertexAttribDivisor( attrLoc, 1 );

		return { id };
	}

	static empty( target, byteCount, isStatic, dataType, attrLoc, compLen=3, stride=0, offset=0, isInstance=false ){
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Create and Bind New Buffer
		let id = gl.ctx.createBuffer();
		gl.ctx.bindBuffer( target, id );
		gl.ctx.bufferData( target, byteCount, (isStatic)? gl.ctx.STATIC_DRAW : gl.ctx.DYNAMIC_DRAW );

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		switch( target ){
			case gl.ctx.ARRAY_BUFFER:
				gl.ctx.enableVertexAttribArray( attrLoc );
				gl.ctx.vertexAttribPointer( attrLoc, compLen, dataType, false, stride, offset );
				break;
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		if( isInstance == true ) gl.ctx.vertexAttribDivisor( attrLoc, 1 );

		return { id };
	}

	static partition( dataType, attrLoc, compLen=3, stride=0, offset=0, isInstance=false ){
		gl.ctx.enableVertexAttribArray( attrLoc );
		gl.ctx.vertexAttribPointer( attrLoc, compLen, dataType, false, stride, offset );

		if(isInstance) gl.ctx.vertexAttribDivisor( attrLoc, 1 );
	}

	static mat4Array( aryData, attrLoc, isStatic = true, isInstance = false ){
		let id = gl.ctx.createBuffer();

		gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, id);
		gl.ctx.bufferData(gl.ctx.ARRAY_BUFFER, ary, (isStatic)? gl.ctx.STATIC_DRAW : gl.ctx.DYNAMIC_DRAW );
		
		// Matrix is treated like an array of vec4, So there is actually 
		// 4 attributes to setup that actually makes up a single mat4.
		gl.ctx.enableVertexAttribArray( attrLoc );
		gl.ctx.vertexAttribPointer( attrLoc,	4, gl.ctx.FLOAT, false, 64, 0 );

		gl.ctx.enableVertexAttribArray( attrLoc+1 );
		gl.ctx.vertexAttribPointer( attrLoc+1,	4, gl.ctx.FLOAT, false, 64, 16);
		
		gl.ctx.enableVertexAttribArray( attrLoc+2 );
		gl.ctx.vertexAttribPointer( attrLoc+2,	4, gl.ctx.FLOAT, false, 64, 32);
		
		gl.ctx.enableVertexAttribArray( attrLoc+3 );
		gl.ctx.vertexAttribPointer( attrLoc+3,	4, gl.ctx.FLOAT, false, 64, 48);
		
		if( isInstance ){
			gl.ctx.vertexAttribDivisor( attrLoc,	1 );
			gl.ctx.vertexAttribDivisor( attrLoc+1,	1 );
			gl.ctx.vertexAttribDivisor( attrLoc+2,	1 );
			gl.ctx.vertexAttribDivisor( attrLoc+3,	1 );
		}

		return { id };
	}

	static fromBin( target, dataView, bStart, bLen, isStatic, dataType, attrLoc, compLen=3, stride=0, offset=0 ){
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Create and Bind New Buffer
		let id = gl.ctx.createBuffer();
		gl.ctx.bindBuffer( target, id );

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Copy data from ArrayBuffer/DataView to the GPU
		gl.ctx.bufferData( target, dataView, (isStatic)? gl.ctx.STATIC_DRAW : gl.ctx.DYNAMIC_DRAW, bStart, bLen );

		// If a data buffer, do some extra setup for shaders
		if( target == gl.ctx.ARRAY_BUFFER ){
			gl.ctx.enableVertexAttribArray( attrLoc );
			gl.ctx.vertexAttribPointer( attrLoc, compLen, dataType, false, stride, offset );
		}

		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		return { id };
	}
}


//##################################################################
class Vao{
	constructor(){
		this.id				= gl.ctx.createVertexArray();
		this.name			= "";
		this.elmCount		= 0;
		this.isIndexed		= false;
		this.isInstanced	= false;
		this.buf 			= {};
	}

	///////////////////////////////////////////////////////
	// TEMPLATES
	///////////////////////////////////////////////////////
		static buildStandard( name, vertCompLen, aryVert, aryNorm=null, aryUV=null, aryInd=null ){
			let vao 		= new Vao(),
				elmCount	= 0;

			// Vertices are mandatory
			Vao	.bind( vao )
				.floatBuffer( vao, BUF_V_NAME, aryVert, Shader.POSITION_LOC, vertCompLen );

			// Build Optional Buffers
			if( aryNorm ) 	Vao.floatBuffer( vao, BUF_N_NAME, aryNorm, Shader.NORMAL_LOC, 3 );
			if( aryUV )		Vao.floatBuffer( vao, BUF_UV_NAME, aryUV, Shader.UV_LOC, 2 );
			if( aryInd ){
				Vao.indexBuffer( vao, BUF_IDX_NAME, aryInd );
				elmCount = aryInd.length;
			}else elmCount = aryVert.length / vertCompLen;

			// Done
			Vao.finalize( vao, name, elmCount );
			return vao;
		}

		static buildSkinning( name, vertCompLen, aryVert, aryNorm=null, aryUV=null, aryInd=null, aryBones = null, aryWeight = null, boneLimit=4 ){
			let vao 		= new Vao(),
				elmCount	= 0;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Vertices are mandatory
			Vao	.bind( vao )
				.floatBuffer( vao, BUF_V_NAME, aryVert, Shader.POSITION_LOC, vertCompLen );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Build Optional Buffers
			if( aryNorm ) 	Vao.floatBuffer( vao, BUF_N_NAME, aryNorm, Shader.NORMAL_LOC, 3 );
			if( aryUV )		Vao.floatBuffer( vao, BUF_UV_NAME, aryUV, Shader.UV_LOC, 2 );

			if( boneLimit > 0 ){
				Vao.floatBuffer( vao, BUF_BI_NAME, aryBones,	Shader.BONE_IDX_LOC,	boneLimit );
				Vao.floatBuffer( vao, BUF_BW_NAME, aryWeight,	Shader.BONE_WEIGHT_LOC,	boneLimit );
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( aryInd ){
				Vao.indexBuffer( vao, BUF_IDX_NAME, aryInd );
				elmCount = aryInd.length;
			}else elmCount = aryVert.length / vertCompLen;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Done
			Vao.finalize( vao, name, elmCount );
			return vao;
		}


		static buildEmpty( name, vertCompLen=3, vertCnt=4, normLen=0, uvLen=0, idxLen=0 ){
			let vao = new Vao();

			// Vertices are mandatory
			Vao.bind( vao ).emptyFloatBuffer( vao, BUF_V_NAME,
				Float32Array.BYTES_PER_ELEMENT * vertCompLen * vertCnt, 
				Shader.POSITION_LOC, vertCompLen );

			// Build Optional Buffers
			if( uvLen > 0 )		Vao.emptyFloatBuffer( vao, BUF_UV_NAME, Float32Array.BYTES_PER_ELEMENT * 2 * uvLen, Shader.UV_LOC, 2 );
			if( idxLen < 0 )	Vao.emptyIndexBuffer( vao, BUF_IDX_NAME, Uint16Array.BYTES_PER_ELEMENT * idxLen, false );

			// Done
			Vao.finalize( vao, name, 0 );
			return vao;
		}

		// Build a VAO from ArrayBuffer, like a Gltf Bin File.
		// Spec holds the buffers stored in the bin: bufferName:{ byteStart, byteLen, ElmCount, CompLength }
		static buildFromBin( name, spec, bin ){
			let dv 	= ( bin instanceof ArrayBuffer )? new DataView( bin ) : bin, // To Bind to GL Buffers, need DataView but to bind to TypeArrays need ArrayBuffer
				vao	= new Vao();

			Vao.bind( vao );
			vao.buf[ BUF_V_NAME ] = Buffer.fromBin( gl.ctx.ARRAY_BUFFER, 
				dv, spec.vertices.byteStart, spec.vertices.byteLen,
				true, gl.ctx.FLOAT, Shader.POSITION_LOC, spec.vertices.compLen );

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( spec.normal ){
				vao.buf[ BUF_N_NAME ] = Buffer.fromBin( gl.ctx.ARRAY_BUFFER, 
					dv, spec.normal.byteStart, spec.normal.byteLen,
					true, gl.ctx.FLOAT, Shader.NORMAL_LOC, spec.normal.compLen );
			}

			if( spec.uv ){
				vao.buf[ BUF_UV_NAME ] = Buffer.fromBin( gl.ctx.ARRAY_BUFFER, 
					dv, spec.uv.byteStart, spec.uv.byteLen,
					true, gl.ctx.FLOAT, Shader.UV_LOC, spec.uv.compLen );
			}

			if( spec.indices ){
				vao.isIndexed = true;
				vao.buf[ BUF_IDX_NAME ] = Buffer.fromBin( gl.ctx.ELEMENT_ARRAY_BUFFER, 
					dv, spec.indices.byteStart, spec.indices.byteLen, true );
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( spec.joints && spec.weights ){
				// WEIGHTS
				vao.buf[ BUF_BW_NAME ] = Buffer.fromBin( gl.ctx.ARRAY_BUFFER, 
					dv, spec.weights.byteStart, spec.weights.byteLen,
					true, gl.ctx.FLOAT, Shader.BONE_WEIGHT_LOC, spec.weights.compLen );

				// JOINT INDICES
				// Can make this work BUT need to parse joints out of BIN as a Uint16 array, then pass
				// that to Buffer.array instead of fromBin. Javascript knows well enough how to convert
				// Uint16Array to Float32Array before saving it to the GPU. This is an issue because
				// there does not seem to be a way to use Uint16 Buffers other then Index. Only option is
				// to use float buffers, so this conversion is needed.
				if( spec.joints.arrayType == "Uint16" ){
					// elmCount * compLen = Total Uints ( not total bytes )
					let uiAry = new Uint16Array( bin, spec.joints.byteStart, spec.joints.elmCount * spec.joints.compLen );
					Vao.floatBuffer( vao, BUF_BI_NAME, uiAry, Shader.BONE_IDX_LOC, spec.joints.compLen );
				}else{
					console.error("VAO.buildFromBin : Joints are not the type Uint16 ");
					return vao;
				}
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			Vao.finalize( vao, name, ((spec.indices)? spec.indices.elmCount : spec.vertices.elmCount) );
			return vao;
		}


	///////////////////////////////////////////////////////
	// QUICK BUFFERS
	///////////////////////////////////////////////////////
		static index_bin( vao, dvBin, bStart, bLen ){
			//console.log("INDICES", bStart, bLen );
			vao.isIndexed = true;
			vao.buf[ BUF_IDX_NAME ] = Buffer.fromBin( gl.ctx.ELEMENT_ARRAY_BUFFER, dvBin, bStart, bLen, true );
			return this;
		}

		static vert_bin( vao, dvBin, bStart, bLen, compLen ){
			//console.log("VERTICES", bStart, bLen, compLen );
			vao.buf[ BUF_V_NAME ] = Buffer.fromBin( gl.ctx.ARRAY_BUFFER, dvBin, bStart, bLen, true, gl.ctx.FLOAT, Shader.POSITION_LOC, compLen );
			return this;
		}

		static norm_bin( vao, dvBin, bStart, bLen ){
			vao.buf[ BUF_N_NAME ] = Buffer.fromBin( gl.ctx.ARRAY_BUFFER, dvBin, bStart, bLen, true, gl.ctx.FLOAT, Shader.NORMAL_LOC, 3 );
			return this;
		}

		static uv_bin( vao, dvBin, bStart, bLen ){
			vao.buf[ BUF_UV_NAME ] = Buffer.fromBin( gl.ctx.ARRAY_BUFFER, dvBin, bStart, bLen, true, gl.ctx.FLOAT, Shader.UV_LOC, 2 );
			return this;
		}

		static weight_bin( vao, dvBin, bStart, bLen, compLen ){
			vao.buf[ BUF_BW_NAME ] = Buffer.fromBin( gl.ctx.ARRAY_BUFFER, dvBin, bStart, bLen, true, gl.ctx.FLOAT, Shader.BONE_WEIGHT_LOC, compLen );
			return this;
		}

		static joint_bin( vao, bin, bStart, elmCnt, compLen ){
			// JOINT INDICES
			// Can make this work BUT need to parse joints out of BIN as a Uint16 array, then pass
			// that to Buffer.array instead of fromBin. Javascript knows well enough how to convert
			// Uint16Array to Float32Array before saving it to the GPU. This is an issue because
			// there does not seem to be a way to use Uint16 Buffers other then Index. Only option is
			// to use float buffers, so this conversion is needed.

			// elmCount * compLen = Total Uints ( not total bytes )
			let uiAry = new Uint16Array( bin, bStart, elmCnt * compLen );
			this.floatBuffer( vao, BUF_BI_NAME, uiAry, Shader.BONE_IDX_LOC, compLen );
			return this
		}

	///////////////////////////////////////////////////////
	// STATIC FUNC
	///////////////////////////////////////////////////////
		
		static finalize( vao, name, elmCount = null ){
			vao.name = name;
			//console.log( name, elmCount );
			if( elmCount ) vao.elmCount = elmCount;

			// Clean up
			gl.ctx.bindVertexArray( null );
			gl.ctx.bindBuffer( gl.ctx.ARRAY_BUFFER, null );
			gl.ctx.bindBuffer( gl.ctx.ELEMENT_ARRAY_BUFFER, null );
			
			Cache.vaos.set( name, vao );
			return Vao;
		}

		static setInstanced( vao, cnt ){
			vao.isInstanced		= true;
			vao.instanceCount	= cnt;
			return Vao;
		}

		static bind( vao=null ){ gl.ctx.bindVertexArray( (vao)? vao.id : null ); return Vao; }
		
		static draw( vao, drawMode = gl.ctx.POINTS, doBinding=false ){
			if( doBinding ) gl.ctx.bindVertexArray( vao.id );

			if( vao.elmCount != 0 ){
				if( vao.isIndexed )	gl.ctx.drawElements( drawMode, vao.elmCount, gl.ctx.UNSIGNED_SHORT, 0 ); 
				else				gl.ctx.drawArrays( drawMode, 0, vao.elmCount );
			}

			if( doBinding ) gl.ctx.bindVertexArray( null );
			return Vao;
		}


	///////////////////////////////////////////////////////
	// FLOAT ARRAY BUFFERS
	///////////////////////////////////////////////////////

		static floatBuffer( vao, name, aryData, attrLoc, compLen=3, stride=0, offset=0, isStatic=true, isInstance=false ){
			let ary		= ( aryData instanceof Float32Array )? aryData : new Float32Array( aryData ),
				buf	= Buffer.array( gl.ctx.ARRAY_BUFFER, 
					ary, isStatic, gl.ctx.FLOAT, 
					attrLoc, compLen, stride, offset, isInstance );

			vao.buf[ name ] = buf;
			return Vao;
		}

		static partitionFloatBuffer( attrLoc, compLen, stride=0, offset=0, isInstance=false ){
			gl.ctx.enableVertexAttribArray(attrLoc);
			gl.ctx.vertexAttribPointer(attrLoc, compLen, gl.ctx.FLOAT, false, stride, offset);
			if(isInstance) gl.ctx.vertexAttribDivisor(attrLoc, 1);
			
			return Vao;
		}

		static emptyFloatBuffer( vao, name, byteCount, attrLoc, compLen, stride=0, offset=0, isStatic=false, isInstance=false){
			let buf = Buffer.empty( gl.ctx.ARRAY_BUFFER, 
				byteCount, isStatic, gl.ctx.FLOAT, 
				attrLoc, compLen, stride, offset, isInstance );
			
			vao.buf[ name ] = buf;
			return Vao;
		}


	///////////////////////////////////////////////////////
	// 
	///////////////////////////////////////////////////////
		/*
		static uint16Buffer( vao, name, aryData, attrLoc, compLen=3, stride=0, offset=0, isStatic=true, isInstance=false ){
			//let ary		= ( aryData instanceof Uint16Array )? aryData : new Uint32Array( aryData );
			console.log( aryData );
			let ary 	= new Float32Array( aryData );
			console.log( ary );
				
			//let buf	= Buffer.array( gl.ctx.ARRAY_BUFFER, 
			//		ary, isStatic, gl.ctx.UNSIGNED_SHORT, 
			//		attrLoc, compLen, stride, offset, isInstance );

			let buf	= Buffer.array( gl.ctx.ARRAY_BUFFER, 
					ary, isStatic, gl.ctx.FLOAT, 
					attrLoc, compLen, stride, offset, isInstance );

			console.log( "Uint16", compLen );

			vao.buf[ name ] = buf;
			return Vao;
		}	
		*/

	///////////////////////////////////////////////////////
	// ELEMENT ARRAY BUFFER ( INDEX BUFFER )
	///////////////////////////////////////////////////////
		
		static indexBuffer( vao, name, aryData, isStatic=true){
			let ary		= (aryData instanceof Uint16Array)? aryData : new Uint16Array(aryData),
				buf		= Buffer.array( gl.ctx.ELEMENT_ARRAY_BUFFER, ary, isStatic );

			vao.buf[ name ] = buf;
			vao.elmCount	= aryData.length;
			vao.isIndexed	= true;
			return Vao;
		}

		static emptyIndexBuffer( vao, name, byteCount, isStatic=false){
			vao.buf[ name ] = Buffer.empty( gl.ctx.ELEMENT_ARRAY_BUFFER, byteCount, isStatic );
			vao.isIndexed	= true;
			return Vao;
		}


	///////////////////////////////////////////////////////
	// SPECIALTY BUFFERS
	///////////////////////////////////////////////////////
		
		static mat4ArrayBuffer(vao, name, aryData, attrLoc, isStatic=true, isInstance=false){
			let ary = (aryData instanceof Float32Array)? aryData : new Float32Array(aryData);
			vao.buf[ name ] = Buffer.mat4Array( ary, attrLoc, isStatic, isInstance );
			return Vao;
		}

		//static updateAryBufSubData(bufID, offset, data){
		//	gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, bufID);
		//	gl.ctx.bufferSubData(gl.ctx.ARRAY_BUFFER, offset, data, 0, null);
		//	gl.ctx.bindBuffer(gl.ctx.ARRAY_BUFFER, null);
		//}
}

//##################################################################
export default Vao;
export { Buffer };