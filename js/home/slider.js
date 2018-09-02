var slider = document.getElementById("gaussian-blur-slider");
var output = document.getElementById("gaussian-blur-out");
output.innerHTML = slider.value;

slider.oninput = function() 
{
    output.innerHTML = this.value;
}