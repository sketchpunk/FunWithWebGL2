export default {
	//////////////////////////////////////////////
	// Resources
	////////////////////////////////////////////// 
		shader		: new Map(),
		material	: new Map(),
		//vao			: new Map(),
		ubo			: new Map(),
		texture		: new Map(),
		//tempCache	: new Map(),

	//////////////////////////////////////////////
	// 
	//////////////////////////////////////////////
		set_shader : function( name, v ){ this.shader.set( name, v ); return this; },
		has_shader : function( name ){ return this.shader.has( name ); },
		get_shader : function( key ){
			var m = this.shader.get( key);
			if(!m){ console.log( "Shader Not Found %s", key ); return null; }
			return m;
		},

		set_material : function( name, v ){ this.material.set( name, v ); return this; },
		get_material : function( key ){
			var m = this.material.get( key );
			if(!m){ console.log( "Material Not Found %s", key ); return null; }
			return m;
		},
		

		has_ubo	: function( name ){ return this.ubo.has( name ); },
		set_ubo	: function( v ){ this.ubo.set( v.name, v ); return this; },
		get_ubo	: function( key ){
			var x = this.ubo.get( key );
			if(!x){ console.warn( "UBO Not Found %s", key ); return null; }
			return x;
		},


		set_tex	: function( k, v ){ this.texture.set( k, v ); return this; },
		get_tex	: function( key ){
			var m = this.textures.get( key );
			if(!m){ console.log( "Texture Not Found %s", key ); return null; }
			return m;
		},

		/*
		has_vao		: function( key ){ return this.vaos.has( key ); },
		get_vao		: function( key ){
			var m = this.vao.get(key);
			if(!m){ console.log( "VAO Not Found %s", key ); return null; }
			return m;
		},



		popTempCache : function( key ){
			var m = this.tempCache.get(key);
			if(!m){ console.log( "TempCache Not Found %s", key ); return null; }

			this.tempCache.delete(key);
			return m;
		},
		*/
};