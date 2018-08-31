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
	
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	gl.viewport(0, 0, canvas.width, canvas.height);
	
	return gl;
}

var gl;
var canvas;

var defaultProgram = new Program();

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
	
	var shaderResolve = function(response) {
		Promise.resolve(response); };
	var shaderError = function(error) {
		alert('Fatal Error getting shader');
		console.error(error); };
	
	promises[0] = loadTextResource('shader/vertex.vertexshader');
	promises[0].then(shaderResolve, shaderError);
	
	promises[1] = loadTextResource('shader/fragment.fragmentshader');
	promises[1].then(shaderResolve, shaderError);
	
	Promise.all(promises).then(
	function(values) 
	{	
		canvas = document.getElementById('game-surface');
		gl = InitGL(canvas);
		
		defaultProgram.Init(values[0], values[1]);
		RunDemo();
	});
};

function Program()
{
	this.uniform = {};
	this.program;
	
	this.Use = function()
	{
		gl.useProgram(this.program);
	};
	this.Init = function(vertexShader, fragmentShader)
	{
		this.program = gl.createProgram();
	
		console.log("Compiling vs..");
		var vertexShader = CreateShader(gl, gl.VERTEX_SHADER, vertexShader);
		console.log("Compiling fs..");
		var fragmentShader = CreateShader(gl, gl.FRAGMENT_SHADER, fragmentShader);
		
		gl.attachShader(this.program, vertexShader);
		gl.attachShader(this.program, fragmentShader);
		
		gl.linkProgram(this.program);
		if (!gl.getProgramParameter(this.program, gl.LINK_STATUS))
		{
			console.error('ERROR LINKING PROGRAM', gl.getProgramInfoLog(program));
			return;
		}
		
		gl.validateProgram(this.program);
		if (!gl.getProgramParameter(this.program, gl.VALIDATE_STATUS))
		{
			console.error('ERROR VALIDATING PROGRAM', gl.getProgramInfoLog(program));
			return;
		}
	};
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

function Mesh()
{
	this.loaded = false;
	this.indicesLength = 0;
	
	this.InitVertexBufferObject = function(program, arrayBuffer, attribLocation, count)
	{
		var cubeVBO = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, cubeVBO);
		gl.bufferData(gl.ARRAY_BUFFER, arrayBuffer, gl.STATIC_DRAW);
		
		var positionAttribLocation = gl.getAttribLocation(program, attribLocation);
		gl.vertexAttribPointer(positionAttribLocation, count, gl.FLOAT, gl.FALSE, Float32Array.BYTES_PER_ELEMENT * count, 0);
		gl.enableVertexAttribArray(positionAttribLocation);
	};
	this.Init = function(program)
	{
		var vertices = [ -0.5, -0.5, 0.0,
						0.5, -0.5, 0.0,
						-0.5, 0.5, 0.0,
						0.5, 0.5, 0.0 ];
						
		var texturecoords = [ 0, 0,
							1, 0,
							0, 1,
							1, 1];	
				
		this.InitVertexBufferObject(program, new Float32Array(vertices), 'vertexPosition', 3);
		this.InitVertexBufferObject(program, new Float32Array(texturecoords), 'vertexTexCoord', 2);
		
		var indices = [0, 1, 2, 2, 1, 3];
		var cubeIBO = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIBO);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
		
		this.indicesLength = indices.length;
		this.loaded = true;
	};
	this.Draw = function()
	{
		gl.drawElements(gl.TRIANGLES, this.indicesLength, gl.UNSIGNED_SHORT, 0);
	};
};

const gridState = 
{
	NULL : -1,
	BLACK: 0,
	WHITE: 1,
};

function Grid()
{
	this.currState = gridState.NULL;
};

function Board()
{
	this.grid = new Array(8);
	
	this.Init = function()
	{
		for (var i = 0; i < 8; ++i)
		{
			this.grid[i] = new Array(8);
			
			for (var j = 0; j < 8; ++j)
				this.grid[i][j] = new Grid();			
		}
		
		this.grid[3][3].currState = gridState.WHITE;
		this.grid[3][4].currState = gridState.BLACK;
		this.grid[4][3].currState = gridState.BLACK;
		this.grid[4][4].currState = gridState.WHITE
	};
	
	this.CheckLeftCheckers = function(x, y, white)
	{
		if (x > 0 && this.grid[x - 1][y].currState != white) //Adjacent checker must be different color
			for (var i = x - 1; x >= 0; --i) { //Iterates through the given direction
				if (this.grid[i][y].currState == gridState.NULL) //If empty checker found, can't be placed
					return false;
				else if (this.grid[i][y].currState == white) //If found the checker, can be placed.
					return true; }
		return false;
	}
	this.ChangeLeftCheckers = function(x, y, white) //Assumes that CheckTopCheckers for the corresponding parameters has already returned true
	{
		for (var i = x - 1; x >= 0; --i) {
			if (this.grid[i][y].currState != white)
				this.grid[i][y].currState = white;
			else if (this.grid[i][y].currState == white)
				return true; }
		return false;
	}
	this.CheckRightCheckers = function(x, y, white)
	{
		if (x < 7 && this.grid[x + 1][y].currState != white) //Adjacent checker must be different color
			for (var i = x + 1; x < 8; ++i) { //Iterates through the given direction
				if (this.grid[i][y].currState == gridState.NULL) //If empty checker found, can't be placed
					return false;
				else if (this.grid[i][y].currState == white) //If found the checker, can be placed.
					return true; }
		return false;
	}
	this.ChangeRightCheckers = function(x, y, white) //Assumes that CheckTopCheckers for the corresponding parameters has already returned true
	{
		for (var i = x + 1; x < 8; ++i) {
			if (this.grid[i][y].currState != white)
				this.grid[i][y].currState = white;
			else if (this.grid[i][y].currState == white)
				return true; }
		return false;
	}
	this.CheckBottomCheckers = function(x, y, white)
	{
		if (y < 7 && this.grid[x][y + 1].currState != white) //Adjacent checker must be different color
			for (var j = y + 1; j < 8; ++j) { //Iterates through the given direction
				if (this.grid[x][j].currState == gridState.NULL) //If empty checker found, can't be placed
					return false;
				else if (this.grid[x][j].currState == white) //If found the checker, can be placed.
					return true; }
		return false;
	}
	this.ChangeBottomCheckers = function(x, y, white) //Assumes that CheckTopCheckers for the corresponding parameters has already returned true
	{
		for (var j = y + 1; j < 8; ++j) {
			if (this.grid[x][j].currState != white)
				this.grid[x][j].currState = white;
			else if (this.grid[x][j].currState == white)
				return true; }
		return false;
	}	
	this.CheckTopCheckers = function(x, y, white)
	{
		if (y > 0 && this.grid[x][y - 1].currState != white) //Adjacent checker must be different color
			for (var j = y - 1; j >= 0; --j) { //Iterates through the given direction
				if (this.grid[x][j].currState == gridState.NULL) //If empty checker found, can't be placed
					return false;
				else if (this.grid[x][j].currState == white) //If found the checker, can be placed.
					return true; }
		return false;
	}
	this.ChangeTopCheckers = function(x, y, white) //Assumes that CheckTopCheckers for the corresponding parameters has already returned true
	{
		for (var j = y - 1; j >= 0; --j) {
			if (this.grid[x][j].currState != white)
				this.grid[x][j].currState = white;
			else if (this.grid[x][j].currState == white)
				return true; }
		return false;
	}
	
	this.CanPlaceChecker = function(x, y, white)
	{
		if (this.grid[x][y].currState == gridState.NULL)
			return this.CheckTopCheckers(x, y, white) ||
					 this.CheckBottomCheckers(x, y, white) ||
					  this.CheckLeftCheckers(x, y, white) ||
					   this.CheckRightCheckers(x, y, white);
		
		return false;
	}
	
	this.PlaceChecker = function(x, y, white)
	{	
		if (x >= 0 && x < 8 && y >= 0 && y < 8 && this.CanPlaceChecker(x, y, white))
		{
			this.grid[x][y].currState = white;
		
			if (this.CheckTopCheckers(x, y, white))
				this.ChangeTopCheckers(x, y, white);
			if (this.CheckBottomCheckers(x, y, white))
				this.ChangeBottomCheckers(x, y, white);
			if (this.CheckLeftCheckers(x, y, white))
				this.ChangeLeftCheckers(x, y, white);
			if (this.CheckRightCheckers(x, y, white))
				this.ChangeRightCheckers(x, y, white);
				
			return true;
		}
		
		return false;
	}
}

function RunDemo() 
{	
	defaultProgram.Use();

	var mesh = new Mesh();
	mesh.Init(defaultProgram.program);
 
	var reversi = new Board();
	reversi.Init();
	
	var texture = 
	{
		board: gl.createTexture(),
		black_checker:  gl.createTexture(),
		white_checker:  gl.createTexture(),
	};
 
	gl.bindTexture(gl.TEXTURE_2D, texture.board);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 128, 0, 255]));
	
	gl.bindTexture(gl.TEXTURE_2D, texture.black_checker);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
	
	gl.bindTexture(gl.TEXTURE_2D, texture.white_checker);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
	
	defaultProgram.uniform = 
	{
		mWorld: gl.getUniformLocation(defaultProgram.program, 'mWorld'),
		mProj: gl.getUniformLocation(defaultProgram.program, 'mProj'),
		alpha: gl.getUniformLocation(defaultProgram.program, 'alpha'),
	};

	var worldMatrix = new Float32Array(16);
	gl.uniformMatrix4fv(defaultProgram.uniform.mWorld, gl.FALSE, worldMatrix);

	var projMatrix = new Float32Array(16);
	gl.uniformMatrix4fv(defaultProgram.uniform.mProj, gl.FALSE, projMatrix);

	var identityMatrix = new Float32Array(16);
	mat4.identity(identityMatrix);

	var currentMousePos = vec3.create();
	
	var tileWidth = canvas.width / 8.0;
	var tileHeight = canvas.height / 8.0;
	
	var tileIndexX = 0;
	var tileIndexY = 0;
	
	var turn = false;
	
	canvas.onmousedown = function(e)
	{
	};
	
	document.onmouseup = function(e)
	{
		PlaceChecker(tileIndexX, tileIndexY);
	};
	
	document.onmousemove = function(e)
	{
		eX = e.x - canvas.getBoundingClientRect().x;
		eY = e.y - canvas.getBoundingClientRect().y;
		
		currentMousePos[0] = eX;
		currentMousePos[1] = eY;
	};
	
	function PlaceChecker(x, y)
	{
		if (reversi.PlaceChecker(x, y, turn ? 1 : 0))
			turn = !turn;	
	}
	
	var update = function()
	{
		tileIndexX = parseInt(currentMousePos[0] / tileWidth);
		tileIndexY = parseInt(currentMousePos[1] / tileHeight);
	}

	var draw = function()
	{
		mat4.ortho(projMatrix, -canvas.width / 2.0, canvas.width / 2.0, -canvas.height / 2.0, canvas.height / 2.0, -10.0, 10.0);
		gl.uniformMatrix4fv(defaultProgram.uniform.mProj, gl.FALSE, projMatrix);
		
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			
		var identityQuat = quat.create();
		quat.identity(identityQuat);
		
		var tileScaleX = tileWidth - 4.0;
		var tileScaleY = tileHeight - 4.0;
			
		gl.uniform1f(defaultProgram.uniform.alpha, 1.0);
		
		for (var i = 0; i < 8; ++i)
		{
			for (var j = 0; j < 8; ++j)
			{
				mat4.fromRotationTranslationScale(worldMatrix, identityQuat, vec3.fromValues((i - 3.5) * tileWidth, (j - 3.5) * -tileHeight, 0), vec3.fromValues(tileScaleX, tileScaleY, 1.0));
				gl.uniformMatrix4fv(defaultProgram.uniform.mWorld, gl.FALSE, worldMatrix);
				
				switch (reversi.grid[i][j].currState)
				{
				case gridState.NULL:
					gl.bindTexture(gl.TEXTURE_2D, texture.board);
					break;
				case gridState.BLACK:
					gl.bindTexture(gl.TEXTURE_2D, texture.black_checker);
					break;
				case gridState.WHITE:
					gl.bindTexture(gl.TEXTURE_2D, texture.white_checker);
					break;
				}
				mesh.Draw();
			}
		}
		
		if (tileIndexX >= 0 && tileIndexX < 8 && tileIndexY >= 0 && tileIndexY < 8 && reversi.grid[tileIndexX][tileIndexY].currState == gridState.NULL)
		{
			if (turn)
				gl.bindTexture(gl.TEXTURE_2D, texture.white_checker);
			else
				gl.bindTexture(gl.TEXTURE_2D, texture.black_checker);
			
			mat4.fromRotationTranslationScale(worldMatrix, identityQuat, vec3.fromValues((tileIndexX - 3.5) * tileWidth, (tileIndexY - 3.5) * -tileHeight, 1.0), vec3.fromValues(tileScaleX * 0.75, tileScaleY * 0.75, 1.0));
			gl.uniformMatrix4fv(defaultProgram.uniform.mWorld, gl.FALSE, worldMatrix);
			
			mesh.Draw();
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