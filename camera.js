function Camera() 
{
	this.position = vec3.fromValues(0, 0, -8);
	this.target = vec3.fromValues(0, 0, 0);
	
	this.view = vec3.create();
	this.length = 8;
	
	this.right = vec3.create();
	
	this.pitch = 0;
	this.yaw = 0;
	
	this.Pan = function(x, y)
	{
		camera.target[0] -= x * 0.01 * this.right[0];
		camera.target[1] += y * 0.01;
		camera.target[2] -= x * 0.01 * this.right[2];
	}
	
	this.Orbit = function(x, y)
	{
		this.yaw -= x * 0.2;
		this.pitch += y * 0.2 ;

		if (this.pitch > 60)
			this.pitch = 60
		else if (this.pitch < -60)
			this.pitch = -60
	}
	
	this.Calculate = function()
	{
		var quaternion = quat.create();
		quat.fromEuler(quaternion, this.pitch, this.yaw, 0);
		
		//Translate to Origin(CameraTarget) & Orientate
		var rotate = mat4.create();
		mat4.fromRotationTranslation(rotate, quaternion, this.target); 
		
		//Translate Forward by [length] units
		var translate = mat4.create();
		mat4.fromTranslation(translate, vec3.fromValues(0, 0, -this.length));
		
		var mat = mat4.create();
		mat4.multiply(mat, rotate, translate);
		
		vec3.transformMat4(this.position, vec3.fromValues(0, 0, 0), mat);
		
		//Calculate View Vector
		vec3.subtract(this.view, this.target, this.position);
		vec3.normalize(this.view, this.view);
		
		//Calculate Right Vector
		vec3.cross(this.right, this.view, vec3.fromValues(0, 1, 0));
		vec3.normalize(this.right, this.right);
	}
};