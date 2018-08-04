function InitShader(gl, type, source)
{
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) 
	{
		console.error('ERROR COMPILING SHADER', gl.getShaderInfoLog(shader));
		return;
	}
	
	return shader;
}

var gl;

var InitDemo = function () 
{
	loadTextResource('vertexshader.glsl', function(vsErr, vsText)
	{
		if (vsErr)
		{
			alert('Fatal Error with getting vertex shader');
			console.error(vsErr);
		}
		else
		{
			loadTextResource('fragmentshader.glsl', function(fsErr, fsText)
			{
				if (fsErr)
				{
					alert('Fatal Error with getting fragment shader');
					console.error(fsErr);
				}
				else
				{
					loadJSONResource('cube.json', function(modelErr, modelObj)
					{
						if (modelErr)
						{
							alert('Fatal Error with getting cube model');
							console.error(modelErr);
						}
						else
						{
							loadImage('cobble.png', function(imgErr, img)
							{
								if (imgErr)
								{
									alert('Fatal Error with getting cube image');
									console.error(imgErr);
								}
								else
								{
									RunDemo(vsText, fsText, img, modelObj);
								}
							});
						}
					});
				}
			});
		}
	});
};

var isMouseDown = false;


var CreateVertexBufferObject = function(program, arrayBuffer, attribLocation, count)
{
	var cubeVBO = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVBO);
	gl.bufferData(gl.ARRAY_BUFFER, arrayBuffer, gl.STATIC_DRAW);
	
	var positionAttribLocation = gl.getAttribLocation(program, attribLocation);
	gl.vertexAttribPointer(positionAttribLocation, count, gl.FLOAT, gl.FALSE,Float32Array.BYTES_PER_ELEMENT * count, 0);
	gl.enableVertexAttribArray(positionAttribLocation);

};

var isMouseDown = false;

var currentMousePos = vec3.create();
var deltaMousePos = vec3.create();

function onMouseDown(e)
{
	isMouseDown = true;
	currentMousePos.x = e.x;
	currentMousePos.y = e.y;
}
function onMouseUp(e)
{
	isMouseDown = false
}
function onMouseMove(e)
{
	deltaMousePos.x = e.x - currentMousePos.x;
	deltaMousePos.y = e.y - currentMousePos.y;
	
	currentMousePos.x = e.x;
	currentMousePos.y = e.y;
}

var RunDemo = function(vertexShaderText, fragmentShaderText, cubeImage, cubeModel) 
{
	console.log('Test');
	
	var canvas = document.getElementById('game-surface');
	gl = canvas.getContext('webgl');
	
	if (!gl)
	{
		console.log("Using experimental");
		gl = canvas.getContext('experimental-webgl')
	}
	
	if (!gl)
		alert('Your browser does not support WebGL');
	
	canvas.onmousedown = onMouseDown;
    document.onmouseup = onMouseUp;
    document.onmousemove = onMouseMove;
	
	gl.viewport(0, 0, canvas.width, canvas.height);
	
	var vertexShader = InitShader(gl, gl.VERTEX_SHADER, vertexShaderText);
	var fragmentShader = InitShader(gl, gl.FRAGMENT_SHADER, fragmentShaderText);
	
	var program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS))
	{
		console.error('ERROR LINKING PROGRAM', gl.getProgramInfoLog(program));
		return;
	}
	
	gl.validateProgram(program);
	if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS))
	{
		console.error('ERROR VALIDATING PROGRAM', gl.getProgramInfoLog(program));
		return;
	}
	
	gl.useProgram(program);

	CreateVertexBufferObject(program, new Float32Array(cubeModel.meshes[0].vertices), 'vertexPosition', 3);
	CreateVertexBufferObject(program, new Float32Array(cubeModel.meshes[0].normals), 'vertexNormal', 3);
	CreateVertexBufferObject(program, new Float32Array(cubeModel.meshes[0].texturecoords[0]), 'vertexTexCoord', 2);
	
	var indices = [].concat.apply([], cubeModel.meshes[0].faces);
	
	var cubeIBO = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIBO);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
	
	var matWorldUniformLocation = gl.getUniformLocation(program, 'mWorld');
	var matViewUniformLocation = gl.getUniformLocation(program, 'mView');
	var matProjUniformLocation = gl.getUniformLocation(program, 'mProj');
	
	var worldMatrix = new Float32Array(16);
	var viewMatrix = new Float32Array(16);
	var projMatrix = new Float32Array(16);
	mat4.identity(worldMatrix);
	mat4.perspective(projMatrix, glMatrix.toRadian(45), canvas.width/canvas.height, 0.01, 100.0);
	
	gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
	gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, viewMatrix);
	gl.uniformMatrix4fv(matProjUniformLocation, gl.FALSE, projMatrix);
	
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.BACK);

	var cubeTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, cubeTexture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cubeImage);
	//gl.bindTexture(gl.TEXTURE_2D, null);
	
	var identityMatrix = new Float32Array(16);
	mat4.identity(identityMatrix);

	var cameraPos = vec3.fromValues(0,0,-8);
	var cameraUpPos = vec3.create();
	vec3.add(cameraUpPos, cameraPos, vec3.fromValues(0,1,0));
	
	var cameraTarget = vec3.fromValues(0,0,0);
	
	var quaternion = quat.create();
	
	var euler = vec3.create();
	
	var cameraRight = vec3.create();
	var cameraView  = vec3.create();
	
	var pitch = 0;
	
	var loop = function() 
	{
		vec3.set(euler, 0, 0, 0);
					
		if (isMouseDown)
		{
			vec3.subtract(cameraView, cameraTarget, cameraPos);
			vec3.normalize(cameraView, cameraView);
	
			vec3.cross(cameraRight, cameraView, vec3.fromValues(0,1,0));
			vec3.normalize(cameraRight, cameraRight);
			
			euler[0] -= deltaMousePos.y * 0.2 * cameraRight[0];
			euler[1] -= deltaMousePos.x * 0.2;
			euler[2] -= deltaMousePos.y * 0.2 * cameraRight[2];
			
			pitch -= deltaMousePos.y * 0.2;
			if (pitch > 60 || pitch < -60)
			{
				pitch += deltaMousePos.y * 0.2;
				vec3.set(euler, 0, euler[1], 0);
			}
		}
				
		quat.fromEuler(quaternion, euler[0], euler[1], euler[2])
		vec3.transformQuat(cameraPos, cameraPos, quaternion);
		mat4.lookAt(viewMatrix, cameraPos, cameraTarget, vec3.fromValues(0,1,0));
		gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, viewMatrix);
		
		gl.clearColor(0.25, 0.5, 1.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		mat4.translate(worldMatrix, identityMatrix, vec3.fromValues(0,-0.5,0));
		gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
		gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
		
		mat4.translate(worldMatrix, identityMatrix, vec3.fromValues(0,-0.5,1));
		gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
		gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
		
		mat4.translate(worldMatrix, identityMatrix, vec3.fromValues(0,-0.5,-1));
		gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
		gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
		
		mat4.translate(worldMatrix, identityMatrix, vec3.fromValues(-1,-0.5,0));
		gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
		gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
		
		mat4.translate(worldMatrix, identityMatrix, vec3.fromValues(1,-0.5,0));
		gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
		gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
		requestAnimationFrame(loop);
	};
	requestAnimationFrame(loop);
};