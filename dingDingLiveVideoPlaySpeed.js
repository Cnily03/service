/* By Vincent George, using CC4.0 BY-SA */
var div=document.createElement("div");
div.id="customDiv";
var style=document.createAttribute("style");
div.setAttributeNode(style);
div.style.backgroundColor="#000";
div.style.border="2px solid #fff";
div.style.width="120px";
div.style.height="50px";
div.style.position="absolute";
div.style.right="10px";
div.style.bottom="50px";
div.style.padding="7px";
div.style.zIndex="99999";
div.style.lineHeight=1.5;
div.style.color="#fff";
div.style.fontSize="15px";
document.getElementsByClassName("lib-video")[0].appendChild(div);
function changeSpeed() {
	var speed=parseFloat(document.getElementById("speedInput").value);
	document.getElementsByClassName("lib-video")[1].playbackRate=speed.toFixed(1);
	document.getElementById("currentSpeed").innerHTML=speed.toFixed(1);
}
div.innerHTML="当前倍速：<text id='currentSpeed'>1.0</text><br></font><input type='text' id='speedInput' size='3' maxlength='3'>&nbsp;&nbsp;<button onclick='changeSpeed();' style='height:50%;width:40%'>切换</button>";