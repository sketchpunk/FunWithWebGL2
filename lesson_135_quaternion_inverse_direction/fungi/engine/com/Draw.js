import App 		from "../../App.js";
import Renderer	from "../Renderer.js";
//import Cache	from "../../core/Cache.js";

//#########################################################################
class Draw{
	static init( priority = 950 ){
		App.Components.reg( this );
		App.ecs.sys_add( new DrawSys(), priority );
	}

	constructor(){ 
		this.items		= [];
		this.priority 	= 500;
	}

	add( mesh, material=null, mode=App.Mesh.TRI ){
		if( material != null && typeof material == "string" ){
			//material = Cache.getMaterial( material );
		}

		this.items.push( { mesh, material, mode } );
		return this;
	}
}


//#########################################################################
class DrawSys{
	constructor(){ 
		this.render = new Renderer();
	}

	run( ecs ){
		let i, e, d, ary = ecs.query_comp( "Draw", draw_priority_sort, "draw_priority" );
		
		this.render.begin_frame(); // Prepare to start rendering new frame

		for( d of ary ){
			e = ecs.entities[ d.entity_id ];

			// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			// If entity isn't active Or there are no VAOs in the draw component
			// then continue to the next entity for rendering.
			if( !e.info.active || e.Draw.items.length == 0 ) continue;
			//console.log( e.info.name, e.Draw.priority );
			// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			//d = e.Draw;
			//if( !d.onDraw ){ // No Custom Manual Control Over Rendering
				
				// Get ModelMatrix sent to GPU plus whatever else
				this.render.load_entity( e );

				// Loop threw all available VAOs to draw
				for( i of d.items ){
					if( i.elm_cnt == 0 ) continue;
					this.render.load_material( i.material );
					this.render.draw( i );
				}

			//}else d.onDraw( this.render, e ); // Run custom Rendering
		}

		this.render.end_frame(); // Prepare to start rendering new frame
	}
}

function draw_priority_sort( a, b ){
	return (a.priority == b.priority) ? 0 :
			(a.priority < b.priority) ? -1 : 1;
}


//#########################################################################
export default Draw;