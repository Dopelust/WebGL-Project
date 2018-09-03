function InitGL(canvas)
{
	var gl = canvas.getContext('webgl', {alpha: false});
	
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
	
	promises[0] = loadTextResource('../shader/reversi/vertex.vertexshader');
	promises[0].then(shaderResolve, shaderError);
	
	promises[1] = loadTextResource('../shader/reversi/fragment.fragmentshader');
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
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
	gl.generateMipmap(gl.TEXTURE_2D);
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

	this.InitVBO = function(program, arrayBuffer, attribLocation, count)
	{
		var vbo = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
		gl.bufferData(gl.ARRAY_BUFFER, arrayBuffer, gl.STATIC_DRAW);
		
		var attribLoc = gl.getAttribLocation(program, attribLocation);
		gl.vertexAttribPointer(attribLoc, count, gl.FLOAT, gl.FALSE, Float32Array.BYTES_PER_ELEMENT * count, 0);
		gl.enableVertexAttribArray(attribLoc);
	};
	this.InitIBO = function(arrayBuffer)
	{
		var ibo = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, arrayBuffer, gl.STATIC_DRAW);
	};
	
	this.Init = function(program)
	{
		var vertices = [ -0.5, -0.5, 0.0,
						0.5, -0.5, 0.0,
						-0.5, 0.5, 0.0,
						0.5, 0.5, 0.0 ];
						
		var texturecoords = [ 0, 1,
							  1, 1,
							  0, 0,
							  1, 0];
							
		var indices = [0, 1, 2, 2, 1, 3];
		
		this.InitVBO(program, new Float32Array(vertices), 'vertexPosition', 3);
		this.InitVBO(program, new Float32Array(texturecoords), 'vertexTexCoord', 2);
		this.InitIBO(new Uint16Array(indices));
		
		this.loaded = true;
	};
	this.Draw = function()
	{
		gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
	};
};

const gameState = 
{
	COMPUTER : 0,
	LOCAL: 1,
	ONLINE: 2,
};
const gridState = 
{
	NULL : -1,
	BLACK: 0,
	WHITE: 1,
};
var gridDir = 
[
	[0, -1],
	[0, 1],
	[1, -1],
	[-1, 1],
	[-1, 0],
	[1, 0],
	[-1, -1],
	[1, 1],
];

function Grid()
{
	this.currState = gridState.NULL;
};

function Board()
{
	this.grid = new Array(8);
	this.turn = false;
	this.player = false;
	this.state = gameState.COMPUTER;
	
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
		this.grid[4][4].currState = gridState.WHITE;
		
		this.turn = false;
	};
	
	this.GetScore = function()
	{
		var score = {black: 0, white: 0};
		
		for (var i = 0; i < 8; ++i)
			for (var j = 0; j < 8; ++j)
			{
				switch (this.grid[i][j].currState)
				{
					case gridState.BLACK: score.black++; break;
					case gridState.WHITE: score.white++; break;
				}
			}

		return score;
	}
	this.CheckCheckers = function(x, y, white, dirx, diry)
	{
		if ((x + dirx) >= 0 && (x + dirx) < 8 && (y + diry) >= 0 && (y + diry) < 8 && this.grid[x + dirx][y + diry].currState != white) //Adjacent checker must be different color
		{
			for (var i = x + dirx, j = y + diry; i >= 0 && i < 8 && j >= 0 && j < 8; i += dirx, j += diry) //Iterates through the given direction
			{ 
				if (this.grid[i][j].currState == gridState.NULL) //If empty checker found, can't be placed
					return false;
				else if (this.grid[i][j].currState == white) //If found the checker, can be placed.
					return true; 
			}
		}
		return false;
	}
	this.ChangeCheckers = function(x, y, white, dirx, diry) //Assumes that CheckCheckers for the corresponding parameters has already returned true
	{
		for (var i = x + dirx, j = y + diry; i >= 0 && i < 8 && j >= 0 && j < 8; i += dirx, j += diry) //Iterates through the given direction
		{ 
			if (this.grid[i][j].currState != white)
				this.grid[i][j].currState = white;
			else if (this.grid[i][j].currState == white)
				return true;
		}
		
		return false;
	}
	this.CanPlaceChecker = function(x, y)
	{
		var white = this.turn ? 1 : 0;
		
		if (this.grid[x][y].currState == gridState.NULL)
			for (var i = 0; i < 8; ++i)
			{
				if (this.CheckCheckers(x, y, white, gridDir[i][0], gridDir[i][1]))
					return true;
			}
	
		return false;
	}
	this.PlaceChecker = function(x, y)
	{	
		if (x >= 0 && x < 8 && y >= 0 && y < 8 && this.CanPlaceChecker(x, y, white))
		{
			var white = this.turn ? 1 : 0;
			this.grid[x][y].currState = white;
		
			for (var i = 0; i < 8; ++i)
			{
				if (this.CheckCheckers(x, y, white, gridDir[i][0], gridDir[i][1]))
					this.ChangeCheckers(x, y, white, gridDir[i][0], gridDir[i][1])
			}
			
			this.turn = !this.turn;
			if (roomNo > 1)
				socket.emit('reversi move', {x: x, y: y, room:roomNo});
			return true;
		}
		
		return false;
	}
	this.IsPlayerTurn = function()
	{
		if (this.state == gameState.LOCAL)
			return true;
		else
			return this.player == this.turn;
	}
}
var reversi = new Board();

function UpdateScoreboard()
{
	var score = reversi.GetScore();
	
	document.getElementById("black_count").innerHTML = score.black;
	document.getElementById("white_count").innerHTML = score.white;
}

function PlaceChecker(x, y)
{
	if (reversi.PlaceChecker(x, y))
	{	
		UpdateScoreboard();
	}
}
	
function ResetBoard(player = false)
{
	reversi.Init();
	reversi.player = player;
	
	UpdateScoreboard();
}
function ChangeBoardState(boardState)
{
	reversi.state = boardState;
}

function RunDemo() 
{	
	defaultProgram.Use();

	var mesh = new Mesh();
	mesh.Init(defaultProgram.program);
 
	ResetBoard();
		
	var texture = 
	{
		board: gl.createTexture(),
		black_checker:  CreateTexture("../img/black_checker.png"),
		white_checker:  CreateTexture("../img/white_checker.png"),
	};
 
	gl.bindTexture(gl.TEXTURE_2D, texture.board);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 128, 0, 255]));
	texture.board.loaded = true;
	
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
	
	var tileWidth = canvas.width / 8.0;
	var tileHeight = canvas.height / 8.0;
	
	var tileIndexX = -1;
	var tileIndexY = -1;
	
	var currentMousePos = vec3.fromValues(-tileWidth, -tileHeight);
		
	canvas.onmousedown = function(e)
	{
	};
	
	document.onmouseup = function(e)
	{
		if (reversi.IsPlayerTurn() && e.which == 1)
			PlaceChecker(tileIndexX, tileIndexY);
	};
	
	document.onmousemove = function(e)
	{
		eX = e.x - canvas.getBoundingClientRect().x;
		eY = e.y - canvas.getBoundingClientRect().y;
		
		currentMousePos[0] = eX;
		currentMousePos[1] = eY;
	};

	var update = function()
	{
		tileIndexX = parseInt(currentMousePos[0] / tileWidth);
		tileIndexY = parseInt(currentMousePos[1] / tileHeight);
	}

	var identityQuat = quat.create();
	quat.identity(identityQuat);
		
	function draw2d(texture, position, scale)
	{
		if (texture.loaded)
		{
			mat4.fromRotationTranslationScale(worldMatrix, identityQuat, position, scale);
			gl.uniformMatrix4fv(defaultProgram.uniform.mWorld, gl.FALSE, worldMatrix);
			
			gl.bindTexture(gl.TEXTURE_2D, texture);
			mesh.Draw();
		}
	}
	
	var draw = function()
	{
		mat4.ortho(projMatrix, -canvas.width / 2.0, canvas.width / 2.0, -canvas.height / 2.0, canvas.height / 2.0, -10.0, 10.0);
		gl.uniformMatrix4fv(defaultProgram.uniform.mProj, gl.FALSE, projMatrix);
		
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			
		var tileScaleX = tileWidth - 4.0;
		var tileScaleY = tileHeight - 4.0;
			
		gl.uniform1f(defaultProgram.uniform.alpha, 1.0);
		
		for (var i = 0; i < 8; ++i)
		{
			for (var j = 0; j < 8; ++j)
			{
				draw2d(texture.board, vec3.fromValues((i - 3.5) * tileWidth, (j - 3.5) * -tileHeight, 0), vec3.fromValues(tileScaleX, tileScaleY, 1.0));
				
				switch (reversi.grid[i][j].currState)
				{
				case gridState.BLACK:
					draw2d(texture.black_checker, vec3.fromValues((i - 3.5) * tileWidth, (j - 3.5) * -tileHeight, 1.0), vec3.fromValues(tileScaleX, tileScaleY, 1.0));
					break;
				case gridState.WHITE:
					draw2d(texture.white_checker, vec3.fromValues((i - 3.5) * tileWidth, (j - 3.5) * -tileHeight, 1.0), vec3.fromValues(tileScaleX, tileScaleY, 1.0));
					break;
				}
			}
		}
		
		if (reversi.IsPlayerTurn() && tileIndexX >= 0 && tileIndexX < 8 && tileIndexY >= 0 && tileIndexY < 8 && reversi.grid[tileIndexX][tileIndexY].currState == gridState.NULL)
		{
			if (reversi.CanPlaceChecker(tileIndexX, tileIndexY))
			{
				if (reversi.turn)
					draw2d(texture.white_checker, vec3.fromValues((tileIndexX - 3.5) * tileWidth, (tileIndexY - 3.5) * -tileHeight, 1.0), vec3.fromValues(tileScaleX, tileScaleY, 1.0));
				else
					draw2d(texture.black_checker, vec3.fromValues((tileIndexX - 3.5) * tileWidth, (tileIndexY - 3.5) * -tileHeight, 1.0), vec3.fromValues(tileScaleX, tileScaleY, 1.0));
			}
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