class GridAxisShader extends Shader{
	constructor(gl,pMatrix){
		var vertSrc = '#version 300 es\n' +
			'in vec3 a_position;' +
			'layout(location=4) in float a_color;' +
			'uniform mat4 uPMatrix;' +
			'uniform mat4 uMVMatrix;' +
			'uniform mat4 uCameraMatrix;' +
			'uniform vec3 uColor[4];' +
			'out lowp vec4 color;' +
			'void main(void){' +
				'color = vec4(uColor[ int(a_color) ],1.0);' +
				'gl_Position = uPMatrix * uCameraMatrix * uMVMatrix * vec4(a_position, 1.0);' +
			'}';
		var fragSrc = '#version 300 es\n' +
			'precision mediump float;' +
			'in vec4 color;' +
			'out vec4 finalColor;' +
			'void main(void){ finalColor = color; }';

		super(gl,vertSrc,fragSrc);

		//Standrd Uniforms
		this.setPerspective(pMatrix);

		//Custom Uniforms 
		var uColor	= gl.getUniformLocation(this.program,"uColor");
		gl.uniform3fv(uColor, new Float32Array([ 0.8,0.8,0.8,  1,0,0,  0,1,0,  0,0,1 ]));

		//Cleanup
		gl.useProgram(null);
	}
}