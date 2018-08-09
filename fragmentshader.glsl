precision mediump float;

varying vec3 fragPos;
varying vec3 fragNormal;
varying vec2 fragTexCoord;

uniform sampler2D texture;
uniform vec3 cameraPos;

uniform vec3 maskColor;

const vec3 lightPos = vec3(-1.0, 3.0, -2.0);

const vec3 ambientColor = vec3(0.5, 0.5, 0.5);
const vec3 diffuseColor = vec3(1.0, 1.0, 1.0);

void main() 
{
	vec3 normal = normalize(fragNormal);
	vec3 lightDir = normalize(lightPos - fragPos);

	float diff  = max(dot(lightDir,normal), 0.0);
	float specular = 0.0;

	if(diff  > 0.0) 
	{
		vec3 viewDir = normalize(cameraPos - fragPos);
		vec3 halfDir = normalize(lightDir + viewDir);
		
		float specAngle = max(dot(halfDir, normal), 0.0);
		specular = pow(specAngle, 32.0);
	}

	gl_FragColor = vec4(ambientColor + diff  * diffuseColor + specular * diffuseColor, 1.0) * texture2D(texture, fragTexCoord);
	gl_FragColor.xyz += maskColor;
}