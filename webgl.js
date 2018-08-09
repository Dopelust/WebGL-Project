function InitGL(canvas)
{
	var gl = canvas.getContext('webgl');
	
	if (!gl)
	{
		console.log("Using experimental");
		gl = canvas.getContext('experimental-webgl')
	}
	
	if (!gl)
		alert('Your browser does not support WebGL!');
		
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.BACK);
	
	gl.viewport(0, 0, canvas.width, canvas.height);
	
	return gl;
}

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

function InitDemo() 
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

function InitProgram(vertexShaderText, fragmentShaderText)
{
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
	return program;
};

function InitMesh(program, meshModel)
{
	var mesh = new Mesh();
	mesh.Init(program, meshModel);
	return mesh;
}

function InitTexture(textureImage)
{
	var texture = gl.createTexture();
	
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureImage);
	
	return texture;
}

var gl;

var isMouseDown = 0;

var currentMousePos = vec3.create();
var deltaMousePos = vec3.create();

var fov = 70;

function Mesh()
{
	this.indicesLength = 0,
	
	this.InitVertexBufferObject = function(program, arrayBuffer, attribLocation, count)
	{
		var cubeVBO = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, cubeVBO);
		gl.bufferData(gl.ARRAY_BUFFER, arrayBuffer, gl.STATIC_DRAW);
		
		var positionAttribLocation = gl.getAttribLocation(program, attribLocation);
		gl.vertexAttribPointer(positionAttribLocation, count, gl.FLOAT, gl.FALSE, Float32Array.BYTES_PER_ELEMENT * count, 0);
		gl.enableVertexAttribArray(positionAttribLocation);
	},
	this.Init = function(program, meshModel)
	{
		this.InitVertexBufferObject(program, new Float32Array(meshModel.meshes[0].vertices), 'vertexPosition', 3);
		this.InitVertexBufferObject(program, new Float32Array(meshModel.meshes[0].normals), 'vertexNormal', 3);
		this.InitVertexBufferObject(program, new Float32Array(meshModel.meshes[0].texturecoords[0]), 'vertexTexCoord', 2);
		
		var indices = [].concat.apply([], meshModel.meshes[0].faces);
		var cubeIBO = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIBO);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
		
		this.indicesLength = indices.length;
	},
	this.Draw = function()
	{
		gl.drawElements(gl.TRIANGLES, this.indicesLength, gl.UNSIGNED_SHORT, 0);
	}
};

function GameObject(position, mesh)
{
	AABB.call(this, position, [-0.5, -0.5, -0.5], [1, 1, 1]);
	this.mesh = mesh;
	
	this.Draw = function()
	{
		this.mesh.Draw();
	}
};

function RunDemo(vertexShaderText, fragmentShaderText, cubeImage, cubeModel) 
{
	var canvas = document.getElementById('game-surface');
	
	canvas.onmousedown = function(e)
	{
		isMouseDown = e.which;
		
		currentMousePos[0] = e.x;
		currentMousePos[1] = e.y;
	};

	canvas.onmousewheel = function(e)
	{
		fov += e.deltaY * 0.02;
	};
	
	document.onmouseup = function(e)
	{
		isMouseDown = 0;
	};
	
	document.onmousemove = function(e)
	{
		deltaMousePos[0] = e.x - currentMousePos[0];
		deltaMousePos[1] = e.y - currentMousePos[1];
		
		currentMousePos[0] = e.x;
		currentMousePos[1] = e.y;
	};

	gl = InitGL(canvas);
		
	var program = InitProgram(vertexShaderText, fragmentShaderText);

	var cubeMesh = InitMesh(program, cubeModel);
	var cubeTexture = InitTexture(cubeImage);
	
	var goList = new Array(new GameObject([0, 0, 0], cubeMesh),
							new GameObject([1, 0, 0], cubeMesh),
							new GameObject([0, 0, 1], cubeMesh),
							new GameObject([-1, 0, 0], cubeMesh),
							new GameObject([0, 0, -1], cubeMesh),
							new GameObject([0, 1, 0], cubeMesh),
							new GameObject([0, -1, 0], cubeMesh),);
	
	var uniformLocation = 
	{
		mWorld: gl.getUniformLocation(program, 'mWorld'),
		mView: gl.getUniformLocation(program, 'mView'),
		mProj: gl.getUniformLocation(program, 'mProj'),
		cameraPos : gl.getUniformLocation(program, 'cameraPos'),
		maskColor : gl.getUniformLocation(program, 'maskColor'),
	};
	
	var worldMatrix = new Float32Array(16);
	gl.uniformMatrix4fv(uniformLocation.mWorld, gl.FALSE, worldMatrix);
	
	var viewMatrix = new Float32Array(16);
	gl.uniformMatrix4fv(uniformLocation.mView, gl.FALSE, viewMatrix);
	
	var projMatrix = new Float32Array(16);
	gl.uniformMatrix4fv(uniformLocation.mProj, gl.FALSE, projMatrix);

	var identityMatrix = new Float32Array(16);
	mat4.identity(identityMatrix);

	var cameraPos = vec3.fromValues(0,0,-8);
	gl.uniform3f(uniformLocation.cameraPos, gl.FALSE, cameraPos[0], cameraPos[1], cameraPos[2]);

	var cameraTarget = vec3.fromValues(0,0,0);
	
	var cameraView = vec3.create();
	var cameraViewN  = vec3.create();
	
	var cameraRight = vec3.create();
	
	var quaternion = quat.create();
	var euler = vec3.create();
	var pitch = 0;
	
	var update = function()
	{
		vec3.set(euler, 0, 0, 0);
		
		//Calculate View Vector
		vec3.subtract(cameraView, cameraTarget, cameraPos);
		vec3.normalize(cameraViewN, cameraView);
		
		//Calculate Right Vector
		vec3.cross(cameraRight, cameraViewN, vec3.fromValues(0,1,0));
		vec3.normalize(cameraRight, cameraRight);
				
		switch (isMouseDown)
		{
			case 0: break;
			case 2: //Middle Mouse Button: Pan Camera
			{
				cameraPos[0] -= deltaMousePos[0] * 0.01 * cameraRight[0];
				cameraPos[1] += deltaMousePos[1] * 0.01;
				cameraPos[2] -= deltaMousePos[0] * 0.01 * cameraRight[2];

				cameraTarget = vec3.add(cameraTarget, cameraPos, cameraView);
			}
			break;
			default: // Left/Right Mouse Button: Orbit Camera
			{
				euler[0] -= deltaMousePos[1] * 0.2 * cameraRight[0];
				euler[1] -= deltaMousePos[0] * 0.2;
				euler[2] -= deltaMousePos[1] * 0.2 * cameraRight[2];
				
				pitch -= deltaMousePos[1] * 0.2;
				if (pitch > 60 || pitch < -60)
				{
					pitch += deltaMousePos[1] * 0.2;
					vec3.set(euler, 0, euler[1], 0);
				}
			}					
			break;
			
		}

		deltaMousePos = vec3.fromValues(0,0,0);
	}
	
	var rayDirection = vec3.create();
					
	function GetPickingRay() 
	{
		var invertViewMat = mat4.create();
		mat4.invert(invertViewMat, viewMatrix);
		
		var invertProjMat = mat4.create();
		mat4.invert(invertProjMat, projMatrix);

		//Ray In Clip Space
		var rayClip = vec4.fromValues((( 2.0 * currentMousePos[0]) / canvas.width)  - 1.0, ((-2.0 * currentMousePos[1]) / canvas.height) + 1.0, -1.0, 1.0);
		
		//Ray In View Space
		var rayEye = vec4.create();
		vec4.transformMat4(rayEye, rayClip, invertProjMat);
		rayEye = vec4.fromValues(rayEye[0], rayEye[1], -1.0, 0.0);
		
		//Ray In World Space
		var rayWorld = vec4.create();
		vec4.transformMat4(rayWorld, rayEye, invertViewMat);
		
		//Ray Normalized
		rayDirection = vec3.fromValues(rayWorld[0], rayWorld[1], rayWorld[2]);
		vec3.normalize(rayDirection, rayDirection);
	}

	var draw = function()
	{
		//Calculate View Matrix
		quat.fromEuler(quaternion, euler[0], euler[1], euler[2])
		vec3.transformQuat(cameraPos, cameraPos, quaternion);
		mat4.lookAt(viewMatrix, cameraPos, cameraTarget, vec3.fromValues(0,1,0));
		gl.uniformMatrix4fv(uniformLocation.mView, gl.FALSE, viewMatrix);
		
		//Calculate Projection Matrix
		mat4.perspective(projMatrix, glMatrix.toRadian(fov), canvas.width/canvas.height, 0.01, 100.0);
		gl.uniformMatrix4fv(uniformLocation.mProj, gl.FALSE, projMatrix);
		
		//Camera Position
		gl.uniform3f(uniformLocation.cameraPos, cameraPos[0], cameraPos[1], cameraPos[2]);

		gl.clearColor(0.25, 0.5, 1.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		GetPickingRay();
		
		var selected = -1;
		var shortest = 100.0;
		
		for (var i = 0; i < goList.length; ++i)
		{
			var rayDist = goList[i].RayTest(cameraPos, rayDirection);

			if (rayDist > 0 && rayDist < shortest)
			{
				shortest = rayDist;
				selected = i;
			}
		}
		
		for (var i = 0; i < goList.length; ++i)
		{
			mat4.translate(worldMatrix, identityMatrix, goList[i].position);
			gl.uniformMatrix4fv(uniformLocation.mWorld, gl.FALSE, worldMatrix);
			
			if (i == selected)
				gl.uniform3f(uniformLocation.maskColor, 0.5, 0, 0);
			else
				gl.uniform3f(uniformLocation.maskColor, 0, 0, 0);
			
			goList[i].Draw();
		}
	}
	
	var loop = function() 
	{
		update();
		draw();
		
		requestAnimationFrame(loop);
	};
	requestAnimationFrame(loop);
};