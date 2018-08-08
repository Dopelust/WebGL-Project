precision mediump float;

attribute vec3 vertexPosition;
attribute vec3 vertexNormal;
attribute vec2 vertexTexCoord;

uniform mat4 mWorld;
uniform mat4 mView;
uniform mat4 mProj;

varying vec3 fragPos;
varying vec3 fragNormal;
varying vec2 fragTexCoord;

void main()
{
	fragNormal = vertexNormal;
	fragTexCoord = vertexTexCoord;
	
	vec4 pos = mWorld * vec4(vertexPosition, 1.0);
	fragPos = vec3(pos);
	
	gl_Position = mProj * mView * mWorld * vec4(vertexPosition, 1.0);
}