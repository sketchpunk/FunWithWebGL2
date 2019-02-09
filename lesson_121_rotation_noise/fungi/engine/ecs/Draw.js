import { Components, System }	from "../Ecs.js";
import Renderer from "../Renderer.js";
import Cache	from "../../core/Cache.js";

//#########################################################################
class Draw{
	constructor(){ 
		this.items	= [];
		this.onDraw	= null;
	}

	add( vao, material=null, mode=4 ){ // 4 == gl.TRIANGLE
		if( material != null && typeof material == "string" ){
			material = Cache.getMaterial( material );
		}

		this.items.push( { vao, material, mode } );
		return this;
	}
} Components( Draw );


//#########################################################################
const QUERY_COM = [ "Node", "Draw" ];

class DrawSystem extends System{
	static init( ecs, priority = 950 ){ 
		ecs.addSystem( new DrawSystem(), priority );
	}

	constructor(){ 
		super();
		this.render = new Renderer();
	}

	update( ecs ){
		let i, e, d, ary = ecs.queryEntities( QUERY_COM );

		this.render.beginFrame(); // Prepare to start rendering new frame

		for( e of ary ){
			// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// If entity isn't active Or there are no VAOs in the draw component
			// then continue to the next entity for rendering.
			if( !e.info.active || e.Draw.items.length == 0 ) continue;
			
			// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			d = e.Draw;
			if( !d.onDraw ){ // No Custom Manual Control Over Rendering
				
				// Get ModelMatrix sent to GPU plus whatever else
				this.render.loadEntity( e );

				// Loop threw all available VAOs to draw
				for( i of d.items ){
					if( i.vao.elmCount == 0 ) continue;

					this.render.loadMaterial( i.material );
					this.render.draw( i );
				}

			}else d.onDraw( this.render, e ); // Run custom Rendering
		}

		//console.log( ary );
	}
}


//#########################################################################
export default Draw;
export { DrawSystem };