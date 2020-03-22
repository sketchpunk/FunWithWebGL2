import gl		from "./gl.js";
import Colour	from "./Colour.js";
import Cache	from "./Cache.js";

//######################################################################################
// Parse Shader Data into bits that we can use to start building the shader.
function parse_to_json( sh_txt ){
	let rtn = { shader:null, materials:null, vertex:null, fragment:null },
		txt, itm, aPos, bPos;

	for( itm in rtn ){
		// ---------------------------------------
		// Find the position of the Tags
		aPos	= sh_txt.indexOf("<" + itm + ">") + itm.length + 2;
		bPos	= sh_txt.indexOf("<\\" + itm + ">");

		if( aPos == -1 || bPos == -1 || bPos <= aPos ){
			if(itm == "materials") continue; //Materials is optionl, no need to error our because of it
			console.error("Error parsing shader, missing ", itm);
			return null;
		}

		// ---------------------------------------
		txt	= sh_txt.substring( aPos, bPos );
		switch(itm){
			case "shader": case "materials": // These are JSON elements, parse them so they're ready for use.
				try{ rtn[ itm ] = JSON.parse( txt ); }
				catch(err){ console.error( err.message, "\n" , txt ); return null; }
			break;
			default: rtn[ itm ] = txt.trim(); break;
		}
	}

	return rtn;
}


//######################################################################################
class Shader{
	constructor( name ){
		this.name		= name;
		this.program 	= null;
		this.tex_slot	= 0;
		this.uniforms	= new Map();

		this.options 	= {
			depthTest			: true,
			blend				: false,
			sampleAlphaCoverage : false,
			cullFace			: true,
		}
	}

	///////////////////////////////////////////////////////
	// 
	///////////////////////////////////////////////////////
		
		bind(){ gl.ctx.useProgram( this.program ); return this; }
		unbind(){ gl.ctx.useProgram( null ); return this; }

		dispose(){
			//unbind the program if its currently active
			if( gl.ctx.getParameter( gl.ctx.CURRENT_PROGRAM ) === this.program) gl.ctx.useProgram( null );
			gl.ctx.deleteProgram( this.program );

			// Remove from Cache
			Cache.shaders.delete( this.name );
			return this;
		}	

		opt_blend( b ){ this.options.blend = b; return this; }
		opt_cullface( b ){ this.options.cullFace = b; return this; }

	///////////////////////////////////////////////////////
	// 
	///////////////////////////////////////////////////////
		
		add_uniforms( ary ){
			let i;
			for( i of ary ) this.add_uniform( i.name, i.type, i.value );
			return this;
		}

		add_uniform( u_name, u_type, u_value=null ){
			let loc = gl.ctx.getUniformLocation( this.program, u_name );

			if( loc ){
				this.uniforms.set( u_name, { 
					loc, 
					type	: u_type,
					value	: ( !u_value )? null : Shader.parse_data( u_value, u_type ),
				});
			}else console.error( "add_uniform : Uniform not found %s ", u_name );

			return this;
		}

		add_uniform_blocks( ary ){
			for( let i=0; i < ary.length; i++ ) this.add_uniform_block( ary[ i ] );
			return this;
		}

		add_uniform_block( ubo_name ){
			// Check if UBO exists in the shader
			let bIdx = gl.ctx.getUniformBlockIndex( this.program, ubo_name );
			if( bIdx > 1000 ){ console.log("Ubo not found in shader %s : %s ", this.name, ubo_name ); return this; }

			let ubo = Cache.get_ubo( ubo_name );
			if( !ubo ){ console.log( "Can not find UBO in fungi cache : %s for %s", ubo_name, this.name ); return this; }

			//console.log( "prepare UBO", uboName, ubo.bindPoint, bIdx );
			gl.ctx.uniformBlockBinding( this.program, bIdx, ubo.bind_pnt );
			return this;
		}

		reset_tex_slot(){ this.tex_slot = 0; return this; }
		
		set_uniform( u_name, u_value ){
			let itm	= this.uniforms.get( u_name );
			if( !itm ){ console.error( "set uniform not found %s in %s", u_name, this.name ); return this; }

			switch( itm.type ){
				case "float":	gl.ctx.uniform1f(	itm.loc, u_value ); break;
				case "afloat":	gl.ctx.uniform1fv(	itm.loc, u_value ); break;
				case "vec2":	gl.ctx.uniform2fv(	itm.loc, u_value ); break;
				
				case "rgb":
				case "vec3":	gl.ctx.uniform3fv(	itm.loc, u_value ); break;
				
				case "rgba":
				case "vec4":	gl.ctx.uniform4fv(	itm.loc, u_value ); break;
				
				case "int":		gl.ctx.uniform1i(	itm.loc, u_value ); break;

				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				case "mat4":	gl.ctx.uniformMatrix4fv(	itm.loc, false, u_value ); break;
				case "mat3":	gl.ctx.uniformMatrix3fv(	itm.loc, false, u_value ); break;
				case "mat2x4": 	gl.ctx.uniformMatrix2x4fv(	itm.loc, false, u_value ); break;
				case "mat3x4": 	gl.ctx.uniformMatrix3x4fv(	itm.loc, false, u_value ); break;

				//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
				case "sampler2D":
					//console.log( this.tex_slot, u_value._name_ );
					gl.ctx.activeTexture(	gl.ctx.TEXTURE0 + this.tex_slot );
					gl.ctx.bindTexture(		gl.ctx.TEXTURE_2D, u_value );
					gl.ctx.uniform1i(		itm.loc, this.tex_slot );
					this.tex_slot++;
					break;

				case "sampler2DArray":
					gl.ctx.activeTexture(	gl.ctx.TEXTURE0 + this.tex_slot );
					gl.ctx.bindTexture(		gl.ctx.TEXTURE_2D_ARRAY, u_value );
					gl.ctx.uniform1i(		itm.loc, this.tex_slot );
					this.tex_slot++;
					break;

				case "samplerCube":
					gl.ctx.activeTexture(	gl.ctx.TEXTURE0 + this.tex_slot );
					gl.ctx.bindTexture(		gl.ctx.TEXTURE_CUBE_MAP, u_value );
					gl.ctx.uniform1i(		itm.loc, this.tex_slot );
					this.tex_slot++;
					break;

				default: console.error("unknown uniform type %s for %s in %s", itm.type, u_name, this.name ); break;
			}
			return this;
		}

		new_material( name=null, u_struct=null ){
			let k, v, mat = new Material( name, this );

			// Copy Uniforms
			for( [ k, v ] of this.uniforms ) mat.uniforms.set( k, v.value );

			// Copy Options
			for( k in this.options ) mat.options[ k ] = this.options[ k ];

			// Load in custom Uniform Data if exists
			if( u_struct ){
				let n;
				for( n in u_struct ) mat.set_uniform( n, u_struct[ n ] );
			}		

			return mat;
		}

	///////////////////////////////////////////////////////
	// STATIC BUILERS
	///////////////////////////////////////////////////////

		static from_inline( elm_name ){
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let elm = document.getElementById( elm_name );
			if( !elm ){
				console.log("Shader.from_inline : Not Found ", elm_name );
				return null;
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let json = parse_to_json( elm.innerText );
			return this.from_json( json );
		}

		// Compile and Build the Shader Program
		static from_json( json ){ 
			let sh = this.from_src( json.shader.name, json.vertex, json.fragment );
			if( !sh ) return null;
		
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Load Up Uniforms
			if( json.shader.uniforms && json.shader.uniforms.length > 0 ){
				sh.add_uniforms( json.shader.uniforms );
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Load Up Ubo
			if( json.shader.ubo && json.shader.ubo.length > 0 ){
				sh.add_uniform_blocks( json.shader.ubo );
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// Loadup Materials
			if( json.materials && json.materials.length > 0 ){
				let mat, m, i;
				for( m of json.materials ){
					mat = sh.new_material( m.name );
					
					if( m.options ){
						for( i in m.options ){
							if( m.options[ i ] !== undefined ) mat.options[ i ] = m.options[ i ];
						}
					}
			
					if( m.uniforms && m.uniforms.length ){
						for( i of m.uniforms ) mat.set_uniform( i.name, i.value );
					}

					console.log( mat );
				}
			}
			
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			return sh;
		}

		static from_src( name, src_vert, src_frag, tf_var = null, is_tf_interleaved = false ){
			// Compile the shader Code
			let prog = gl.create_shader( src_vert, src_frag, false, tf_var, is_tf_interleaved );
			if( !prog ) return null;

			// When successful, create struct to wrap the program
			let shader = new Shader( name );
			shader.program = prog;

			return shader;
		}

	///////////////////////////////////////////////////////
	// MISC STATIC METHODS
	///////////////////////////////////////////////////////

		static unbind(){ gl.ctx.useProgram( null ); return this; }

		// interpret data incase of custom types needs to be transformed into something else.
		static parse_data( value, type ){
			switch(type){
				case "rgb"	: value = Colour.rgb( value ); break;
				case "rgba"	: value = Colour.rgba( value ); break;
				case "sampler2D" : 
				case "samplerCube" :
					let tmp = ( value instanceof WebGLTexture )? value : Cache.get_tex( value ); 
					if(tmp == null){
						console.error( "Shader.parse_data: Texture not found", value );
						return this;
					}else value = tmp;
				break;
			}

			return ( Array.isArray( value ) && value.length == 0 )? null : value;
		}
}

// Constants
Shader.POS_LOC		= 0;
Shader.NORM_LOC		= 1;
Shader.UV_LOC		= 2;
Shader.COL_LOC		= 3;

Shader.BONE_IDX_LOC	= 8;
Shader.BONE_WGT_LOC	= 9;


//######################################################################################
class Material{
	constructor( name = "Untitled_Shader", shader = null ){
		if( shader && typeof shader == "string"  ) shader = Cache.get_shader( shader );

		this.name		= name;
		this.shader		= shader;
		this.uniforms	= new Map();

		this.options 	= {
			depthTest			: true,
			blend				: false,
			sampleAlphaCoverage : false,
			cullFace			: true,
		}
	}


	///////////////////////////////////////////////////////
	// METHODS
	///////////////////////////////////////////////////////
		// bind assigned shader
		bind(){ gl.ctx.useProgram( this.shader.program ); return this; }
		unbind(){ gl.ctx.useProgram( null ); }

		// push uniform data to the shader
		apply(){
			if( this.shader && this.uniforms.size > 0 ){
				this.shader.reset_tex_slot();

				let k, v;
				for( [ k, v ] of this.uniforms ){
					if( v != null ) this.shader.set_uniform( k, v );
				}
			}
			return this;
		}

		// modify stored uniform data
		set_uniform( u_name, u_value ){
			if( !this.uniforms.has( u_name ) ){
				console.error("Material.set_uniform: not found %s for material %s", u_name, this.name);
				return this;
			}

			let u_type = this.shader.uniforms.get( u_name ).type;
			this.uniforms.set( u_name, Shader.parse_data( u_value, u_type ) );

			return this;
		}

		opt_blend( b ){ this.options.blend = b; return this; }
		opt_cullface( b ){ this.options.cullFace = b; return this; }

		/*
		static clone( mat, name ){
			if( typeof mat == "string" ) mat = Cache.getMaterial( mat );

			let key, itm, m = new Material( name, mat.shader );
			Cache.materials.set( name, m );
			
			for( [ key, itm ] of mat.uniforms ){
				if( Array.isArray( itm ) )	m.uniforms.set( key, itm.slice(0) );
				else 						m.uniforms.set( key, itm );
			}		

			return m;
		}
		*/
}


//##################################################################
// Export
export default Shader;