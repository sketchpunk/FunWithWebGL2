import gl		from "./gl.js";
import Cache	from "./Cache.js";
import Shader 	from "./Shader.js";

class Material{
	constructor( name = "Untitled_Shader", shader = null ){
		if( shader && typeof shader == "string"  ) shader = Cache.getShader( shader );

		this.shader		= shader;
		this.name		= name;
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

		// push uniform data to the shader
		apply(){
			if( this.shader && this.uniforms.size > 0 ){
				let key, itm;
				this.shader.resetTextureSlot();

				for( [ key, itm ] of this.uniforms ){
					if(itm.value != null) this.shader.setUniform( key, itm.value );
				}
			}
			return this;
		}

		// modify stored uniform data
		update_uniform( uName, uValue ){
			let itm = this.uniforms.get(uName);
			if(!itm){
				console.error("Material.setUniform: not found %s for material %s",uName, this.name);
				return this;
			}

			let ut = this.shader.uniforms.get( uName ).type;
			itm.value = Shader.parse_data( uValue, ut );
			return this;
		}

		add_uniform( uName, uValue ){
			let u = { value:null };
			if( uValue ){
				let ut = this.shader.uniforms.get( uName ).type;
				u.value = Shader.parse_data( uValue, ut );
			}
			this.uniforms.set( uName, u );
			return this;
		}


	///////////////////////////////////////////////////////
	// STATIC METHODS
	///////////////////////////////////////////////////////

		// create new material based on shader and json data
		static build( shader, json = null ){
			let mat = new Material();
			if( json ) Material.loadJson( mat, shader, json );

			Cache.materials.set( mat.name, mat );
			return mat;
		}

		static clone( mat, name, cloneData=false ){
			if( typeof mat == "string" ) mat = Cache.getMaterial( mat );

			let key, itm, m = new Material( name, mat.shader );
			Cache.materials.set( name, m );
			
			for( [ key, itm ] of mat.uniforms ){
				//TODO, Create ability to clone data.
				m.add_uniform( key, null );
			}		

			return m;
		}

		// load initate materal from shader file
		static loadJson( mat, shader, json ){
			mat.shader	= shader;
			mat.name	= json.name;

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			let i;
			if( json.options ){
				for( i in json.options ){
					if( mat.options[ i ] !== undefined ) mat.options[ i ] = json.options[ i ];
				}
			}

			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if( json.uniforms && json.uniforms.length ){
				mat.uniforms.clear();
				for( i of json.uniforms ) mat.add_uniform( i.name, i.value );
			}
		}
}

//##################################################################
// Export
export default Material;	