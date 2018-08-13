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

var shader = {};

function CreateShader(gl, type, source)
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

function LoadDemo() //Loads the base Vertex/Fragment Shaders
{
	var promises = [];
	
	promises[0] = loadTextResource('vertexshader.glsl');
	promises[0].then(
	function(response)
	{
		console.log("Downloaded vs");
		shader.vertexShader = response;
	},
	function(error)
	{
		alert('Fatal Error with getting vertex shader');
		console.error(error);
	});
	
	promises[1] = loadTextResource('fragmentshader.glsl');
	promises[1].then(
	function(response)
	{
		console.log("Downloaded fs");
		shader.fragmentShader = response;
	},
	function(error)
	{
		alert('Fatal Error with getting fragment shader');
		console.error(error);
	});
	
	Promise.all(promises).then(
	function(values) 
	{	
		RunDemo();
	});
};

function InitProgram()
{
	var program = gl.createProgram();
	
	console.log("Compiling vs..");
	var vertexShader = CreateShader(gl, gl.VERTEX_SHADER, shader.vertexShader);
	console.log("Compiling fs..");
	var fragmentShader = CreateShader(gl, gl.FRAGMENT_SHADER, shader.fragmentShader);
	
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

function InitTexture(texture, image)
{
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
		
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}	

function CreateTexture(url)
{
	var texture = gl.createTexture();
	
	var image = new Image();
	image.onload = function() 
	{
		InitTexture(texture, image);
		texture.loaded = true;
	}
	image.src = url;
	
	return texture;
}

var gl;

function InitMesh(program, url)
{
	var mesh = new Mesh();
	
	loadTextResource('cube.json').then(
	function(response)
	{
		console.log("Downloaded cube.json");
		mesh.Init(program, JSON.parse(response));
	},
	function(error)
	{
		alert('Fatal Error with getting cube.json');
		console.error(error);
	});
	
	return mesh;
}

function Mesh()
{
	this.loaded = false;
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
		this.loaded = true;
	},
	this.Draw = function()
	{
		gl.drawElements(gl.TRIANGLES, this.indicesLength, gl.UNSIGNED_SHORT, 0);
	}
};

function GameObject(position, mesh, texture)
{
	AABB.call(this, position, [-0.5, -0.5, -0.5], [1, 1, 1]);
	
	this.mesh = mesh;
	this.texture = texture;
	
	this.Draw = function()
	{
		if (this.mesh.loaded)
		{
			if (this.texture.loaded)
				gl.bindTexture(gl.TEXTURE_2D, this.texture);
			else
				gl.bindTexture(gl.TEXTURE_2D, GameObject.placeholderTexture);
			
			this.mesh.Draw();
		}
	}
};

var camera = new Camera();
var fov = 70;
	
function InitCamera() //For Resetting
{
	camera = new Camera();
}

function RunDemo() 
{
	var canvas = document.getElementById('game-surface');
	gl = InitGL(canvas);
	
	var program = InitProgram();
			  	
	var cubeMesh = InitMesh(program, "cube.json");
	var cubeTexture = CreateTexture("cobble.png");
	
	//Create placeholder texture while textures load async
	GameObject.placeholderTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, GameObject.placeholderTexture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));

	var goList = [new GameObject([0, 0, 0], cubeMesh, cubeTexture),
					new GameObject([1, 0, 0], cubeMesh, cubeTexture),
					new GameObject([0, 0, 1], cubeMesh, cubeTexture),
					new GameObject([-1, 0, 0], cubeMesh, cubeTexture),
					new GameObject([0, 0, -1], cubeMesh, cubeTexture)];
	
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
			goList.push(new GameObject(cubePosition, cubeMesh, cubeTexture));
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