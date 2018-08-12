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

var camera = new Camera();
var fov = 70;
	
function InitCamera() //For Resetting
{
	camera = new Camera();
}

function RunDemo(vertexShaderText, fragmentShaderText, cubeImage, cubeModel) 
{
	var canvas = document.getElementById('game-surface');
	gl = InitGL(canvas);
		
	var program = InitProgram(vertexShaderText, fragmentShaderText);

	var cubeMesh = InitMesh(program, cubeModel);
	var cubeTexture = InitTexture(cubeImage);
	
	var goList = [new GameObject([0, 0, 0], cubeMesh),
					new GameObject([1, 0, 0], cubeMesh),
					new GameObject([0, 0, 1], cubeMesh),
					new GameObject([-1, 0, 0], cubeMesh),
					new GameObject([0, 0, -1], cubeMesh)];
	
	var uniformLocation = 
	{
		mWorld: gl.getUniformLocation(program, 'mWorld'),
		mView: gl.getUniformLocation(program, 'mView'),
		mProj: gl.getUniformLocation(program, 'mProj'),
		cameraPos : gl.getUniformLocation(program, 'cameraPos'),
		maskColor : gl.getUniformLocation(program, 'maskColor'),
	};

	gl.uniform3f(uniformLocation.cameraPos, gl.FALSE, camera.position[0], camera.position[1], camera.position[2]);

	var worldMatrix = new Float32Array(16);
	gl.uniformMatrix4fv(uniformLocation.mWorld, gl.FALSE, worldMatrix);
	
	var viewMatrix = new Float32Array(16);
	gl.uniformMatrix4fv(uniformLocation.mView, gl.FALSE, viewMatrix);
	
	var projMatrix = new Float32Array(16);
	gl.uniformMatrix4fv(uniformLocation.mProj, gl.FALSE, projMatrix);

	var identityMatrix = new Float32Array(16);
	mat4.identity(identityMatrix);

	var currentMousePos = vec3.create();
	var deltaMousePos = vec3.create();

	canvas.onmousedown = function(e)
	{
		e.preventDefault();
		
		currentMousePos[0] = e.x - canvas.getBoundingClientRect().x;
		currentMousePos[1] = e.y - canvas.getBoundingClientRect().y;
		
		manipulateVoxels = true;
	};

	canvas.onmousewheel = function(e)
	{
		camera.length += e.deltaY * 0.005;
	};
	
	document.onmouseup = function(e)
	{
		if (manipulateVoxels)
		{
			switch (e.which)
			{
			case 1: 
				RemoveVoxel();
			break;
			case 3:
				PlaceVoxel();
			break;
			}
		}
	};
	
	document.onmousemove = function(e)
	{
		eX = e.x - canvas.getBoundingClientRect().x;
		eY = e.y - canvas.getBoundingClientRect().y;
		
		deltaMousePos[0] = eX - currentMousePos[0];
		deltaMousePos[1] = eY - currentMousePos[1];
		
		currentMousePos[0] = eX;
		currentMousePos[1] = eY;
		
		switch (e.which)
		{
		case 1: case 3:
			camera.Orbit(deltaMousePos[0], deltaMousePos[1]);
		break;
		case 2:
			camera.Pan(deltaMousePos[0], deltaMousePos[1]);
		break;
		}
		
		manipulateVoxels = false;
	};
	
	var selectedIndex = -1;
	var manipulateVoxels = false;
	
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

	function PlaceVoxel()
	{
		if (selectedIndex >= 0)
		{
			var face = goList[selectedIndex].RayTestFace(camera.position, rayDirection);			
			var cubePosition = vec3.create();
			switch (face)
			{
				case 0:
					vec3.add(cubePosition, goList[selectedIndex].position, vec3.fromValues(0,1,0));
				break;
				case 1:
					vec3.add(cubePosition, goList[selectedIndex].position, vec3.fromValues(0,-1,0));
				break;
				case 2:
					vec3.add(cubePosition, goList[selectedIndex].position, vec3.fromValues(1,0,0));
				break;
				case 3:
					vec3.add(cubePosition, goList[selectedIndex].position, vec3.fromValues(-1,0,0));
				break;
				case 4:
					vec3.add(cubePosition, goList[selectedIndex].position, vec3.fromValues(0,0,1));
				break;
				case 5:
					vec3.add(cubePosition, goList[selectedIndex].position, vec3.fromValues(0,0,-1));
				break;
			}
			goList.push(new GameObject(cubePosition, cubeMesh));
			clickedIndex = selectedIndex = -1;	
		}
	}
	
	function RemoveVoxel()
	{
		if (selectedIndex >= 0)
		{
			goList.splice(selectedIndex, 1);
			clickedIndex = selectedIndex = -1;	
		}
	}
	
	var update = function()
	{
		camera.Calculate();
		GetPickingRay();
		
		selectedIndex = -1;
		var shortest = 100.0;
		
		for (var i = 0; i < goList.length; ++i)
		{
			var rayDist = goList[i].RayTest(camera.position, rayDirection);

			if (rayDist > 0 && rayDist < shortest)
			{
				shortest = rayDist;
				selectedIndex = i;
			}
		}							
	}

	var draw = function()
	{
		//Calculate View Matrix
		mat4.lookAt(viewMatrix, camera.position, camera.target, vec3.fromValues(0,1,0));
		gl.uniformMatrix4fv(uniformLocation.mView, gl.FALSE, viewMatrix);
		
		//Calculate Projection Matrix
		mat4.perspective(projMatrix, glMatrix.toRadian(fov), canvas.width/canvas.height, 0.01, 100.0);
		gl.uniformMatrix4fv(uniformLocation.mProj, gl.FALSE, projMatrix);
		
		//Camera Position
		gl.uniform3f(uniformLocation.cameraPos, camera.position[0], camera.position[1], camera.position[2]);

		gl.clearColor(0.25, 0.5, 1.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		for (var i = 0; i < goList.length; ++i)
		{
			mat4.translate(worldMatrix, identityMatrix, goList[i].position);
			gl.uniformMatrix4fv(uniformLocation.mWorld, gl.FALSE, worldMatrix);
			
			if (i == selectedIndex)
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
		
		//Flush input
		deltaMousePos = vec3.fromValues(0,0,0);
		
		requestAnimationFrame(loop);
	};
	requestAnimationFrame(loop);
};