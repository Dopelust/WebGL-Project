class Mesh
{
	constructor(positions, normals, indices) 
	{
		this.positions = positions;
		this.normals = normals;
		this.indices = indices;

		console.log("Loaded Mesh with " + positions.length  + " vertices");
	}
};

function LoadMesh(string) 
{
	var lines = string.split("\n");
	
	var tempPositions = [];
	var tempNormals = [];
	var tempVertices = [];

	for ( var i = 0 ; i < lines.length ; i++ ) 
	{
		var parts = lines[i].trimRight().split(' ');
		if ( parts.length > 0 ) 
		{
			switch(parts[0]) {
			case 'v': 
				var position = vec3.create();
				position.x = parseFloat(parts[1]);
				position.y = parseFloat(parts[1]);
				position.z = parseFloat(parts[1]);
				tempPositions.push(position);
				break;
			case 'vn':
				var normal = vec3.create();
				normal.x = parseFloat(parts[1]);
				normal.y = parseFloat(parts[1]);
				normal.z = parseFloat(parts[1]);
				tempNormals.push(normal);
				break;
			case 'f': 
			{
				var f1 = parts[1].split('/');
				var f2 = parts[2].split('/');
				var f3 = parts[3].split('/');
				
				tempVertices.push(parseInt(f1[0]) - 1);
				tempVertices.push(parseInt(f1[2]) - 1);
				tempVertices.push(parseInt(f2[0]) - 1);
				tempVertices.push(parseInt(f2[2]) - 1);
				tempVertices.push(parseInt(f3[0]) - 1);
				tempVertices.push(parseInt(f3[2]) - 1);
				break;
			}
			}
		}
	}

	var positions = [];
	var normals = [];
	var vertices = [];

		// For each vertex of each triangle
	for(var i = 0; i < tempVertices.length; i += 2)
	{
		// Get the indices of its attributes
		var vertexIndex = tempVertices[i];
		var normalIndex = tempVertices[i + 1];

		// Put the attributes in buffers
		positions.push(tempPositions[vertexIndex].x);
		positions.push(tempPositions[vertexIndex].y);
		positions.push(tempPositions[vertexIndex].z);
		normals.push(tempNormals[normalIndex].x);
		normals.push(tempNormals[normalIndex].y);
		normals.push(tempNormals[normalIndex].z);
		vertices.push(i / 2);
	}

	const mesh = new Mesh(positions, normals, vertices);
	return mesh;
}