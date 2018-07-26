export default {
	//............................
	//Main Objects
	camera		: null,
	loop		: null,
	ecs			: null,
	input		: null,
	components	: null,
	assemblages	: null,

	//............................
	//Shared Global Data
	deltaTime		: 0,
	sinceStart		: 1,

	//............................
	//Resources 
	shaders		: new Map(),
	materials	: new Map(),
	vaos		: new Map(),
	ubos		: new Map(),
	textures	: new Map(),
	tempCache	: new Map(),

	getShader	: function(key){
		var m = this.shaders.get(key);
		if(!m){ console.log("Shader Not Found %s", key); return null; }
		return m;
	},

	getMaterial	: function(key){
		var m = this.materials.get(key);
		if(!m){ console.log("Material Not Found %s", key); return null; }
		return m;
	},

	getUBO		: function(key){
		var m = this.ubos.get(key);
		if(!m){ console.log("UBO Not Found %s", key); return null; }
		return m;
	},

	getTexture	: function(key){
		var m = this.textures.get(key);
		if(!m){ console.log("Texture Not Found %s", key); return null; }
		return m;
	},

	popTempCache : function(key){
		var m = this.tempCache.get(key);
		if(!m){ console.log("TempCache Not Found %s", key); return null; }

		this.tempCache.delete(key);
		return m;
	},

	//............................
	//Constants
	PNT			: 0,
	LINE		: 1,
	LINE_LOOP	: 2,
	LINE_STRIP	: 3,
	TRI			: 4,
	TRI_STRIP	: 5
};