function AABB(position, offset, bounds)
{
	this.position = position;
	this.offset = offset;
	this.bounds = bounds;
	
	this.origin = function()
	{
		var origin = vec3.create();
		vec3.add(origin, this.position, this.offset);
		return origin;
	}
	
	this.minCoord = function()
	{
		return this.origin();
	}
	this.maxCoord = function()
	{
		var maxCoord = vec3.create();
		vec3.add(maxCoord, this.origin(), this.bounds);
		return maxCoord;
	}
	
	function BoxTest(minA, maxA, minB, maxB)
	{
		return maxA[0] < minB[0] && minA[0] > maxB[0] &&
				 maxA[1] < minB[1] && minA[1] > maxB[1] &&
				  maxA[2] < minB[2] && minA[2] > maxB[2];
	}
	
	this.BoxTest = function(boundB)
	{
		var minA = this.minCoord();
		var maxA = this.maxCoord();
		
		var minB = boundB.minCoord();
		var maxB = boundB.maxCoord();
		
		return Test(minA, maxA, minB, maxB);
	}
	
	this.RayTest = function(rayPosition, rayDirection)
	{
		var min = this.minCoord();
		var max = this.maxCoord();
		
		var dirfrac = [1.0 / rayDirection[0], 1.0 / rayDirection[1], 1.0 / rayDirection[2]];
		
		var t1 = (min[0] - rayPosition[0]) * dirfrac[0];
		var t2 = (max[0] - rayPosition[0]) * dirfrac[0];
		var t3 = (min[1] - rayPosition[1]) * dirfrac[1];
		var t4 = (max[1] - rayPosition[1]) * dirfrac[1];
		var t5 = (min[2] - rayPosition[2]) * dirfrac[2];
		var t6 = (max[2] - rayPosition[2]) * dirfrac[2];
		
		var tmin = Math.max(Math.max(Math.min(t1, t2), Math.min(t3, t4)), Math.min(t5, t6));
		var tmax = Math.min(Math.min(Math.max(t1, t2), Math.max(t3, t4)), Math.max(t5, t6));
		
		if (tmax < 0 || tmin > tmax)
			return 0;
		
		return tmin;
	}
	this.RayTestFace = function(rayPosition, rayDirection)
	{
		var min = this.minCoord();
		var max = this.maxCoord();
		
		var dirfrac = [1.0 / rayDirection[0], 1.0 / rayDirection[1], 1.0 / rayDirection[2]];
		
		var t1 = (min[0] - rayPosition[0]) * dirfrac[0];
		var t2 = (max[0] - rayPosition[0]) * dirfrac[0];
		var t3 = (min[1] - rayPosition[1]) * dirfrac[1];
		var t4 = (max[1] - rayPosition[1]) * dirfrac[1];
		var t5 = (min[2] - rayPosition[2]) * dirfrac[2];
		var t6 = (max[2] - rayPosition[2]) * dirfrac[2];
	    
		var tmin = Math.max(Math.max(Math.min(t1, t2), Math.min(t3, t4)), Math.min(t5, t6));
	
		if (tmin == t1)
			return 2;
		if (tmin == t2)
			return 3;
		if (tmin == t3)
			return 1;
		if (tmin == t4)
			return 0;
		if (tmin == t5)
			return 5;
		if (tmin == t6)
			return 4;
	
		return -1;
	}
};