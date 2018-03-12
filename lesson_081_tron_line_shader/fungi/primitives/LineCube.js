import gl,{ VAO }	from "../gl.js";
import Renderable	from "../entities/Renderable.js";

function LineCube(matName,x1,y1,z1, x2,y2,z2){
	//TopLeft,TopRight,BotRight,BotLeft
	var b = [	[x1,y1,z1], [x2,y1,z1],
				[x2,y1,z2], [x1,y1,z2] ],
		t = [	[x1,y2,z1], [x2,y2,z1],
				[x2,y2,z2], [x1,y2,z2] ],
		ii;

	var aVert = new Array();
	for(var i=0; i < 4; i++){
		ii = (i+1) % 4;
		aVert.push(
			 //Draw Bottom
			b[i][0], b[i][1], b[i][2],
			b[ii][0], b[ii][1], b[ii][2],

			//Draw Top
			t[i][0], t[i][1], t[i][2],
			t[ii][0], t[ii][1], t[ii][2],
			
			//draw sides
			b[i][0], b[i][1], b[i][2],
			t[i][0], t[i][1], t[i][2]
		);
	}


	var entity = new Renderable( VAO.standardRenderable("LineCube",3,aVert) ,matName);
	entity.name = "LineCube";
	entity.drawMode = gl.ctx.LINES;

	return entity;
}

export default LineCube;