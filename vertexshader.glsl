precision mediump float;

attribute vec3 vertexPosition;
attribute vec3 vertexNormal;
attribute vec2 vertexTexCoord;

uniform mat4 mWorld;
uniform mat4 mView;
uniform mat4 mProj;

varying vec3 normal;
varying vec2 texCoord;

void main()
{
	normal = vertexNormal;
	texCoord = vertexTexCoord;
	
	gl_Position = mProj * mView * mWorld * vec4(vertexPosition, 1.0);
}