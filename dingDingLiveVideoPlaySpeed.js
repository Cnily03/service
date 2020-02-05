/* By Vincent George, under License CC4.0 BY-SA */
var speedDiv = document.createElement("div");
speedDiv.className = "speedDiv";
var speedButton = document.createElement("button");
speedButton.className = "control-button";
speedButton.id = "hide";

//General Style
var appendCss = document.createElement("style");
appendCss.type = "text/css";
appendCss.innerHTML = ".control-button{display: -moz-flex;display: -moz-flexbox;display: -webkit-flexbox;display: flexbox;display: -moz-box;display: -webkit-box;display: box; background-color:transparent;font-size:15px;border-width:0px 0px 3px 0px;color:white;border-color:snow;-webkit-transition: all .3s;-moz-transition: all .3s;-ms-transition: all .3s;-o-transition: all .3s; transition: all .3s;} .control-button:hover{color:#42a7ff;border-color:#0088ff;} custom-button{display: -moz-flex;display: -moz-flexbox;display: -webkit-flexbox;display: flexbox;display: -moz-box;display: -webkit-box;display: box;} .ele-change {border-width=1px; color=black; background-color=white; webkit-transition: all .3s;-moz-transition: all .3s;-ms-transition: all .3s;-o-transition: all .3s; transition: all .3s;} .ele-change:hover {background-color:#aaa}";
document.getElementsByTagName("head")[0].appendChild(appendCss);

//speedDiv Style
speedDiv.style.backgroundColor = "#000";
speedDiv.style.border = "2px solid #fff";
speedDiv.style.width = "120px";
speedDiv.style.height = "50px";
speedDiv.style.position = "absolute";
speedDiv.style.right = "10px";
speedDiv.style.bottom = "50px";
speedDiv.style.padding = "7px";
speedDiv.style.zIndex = "99999";
speedDiv.style.lineHeight = 1.5;
speedDiv.style.color = "#fff";
speedDiv.style.fontSize = "15px";
speedDiv.style.visibility = "hidden";
document.getElementsByClassName("lib-video")[0].appendChild(speedDiv);

//speedButton Style
speedButton.innerHTML = "倍速";
speedButton.style.height = "25px";
speedButton.style.width = "45px";
document.getElementsByClassName("vjs-control-bar")[0].insertBefore(
	speedButton,
	document.getElementsByClassName("playback-rate-wrap vjs-hidden")[0]
);

//function
function changeSpeed() {
	var speed = parseFloat(document.getElementById("speedInput").value);
	document.getElementsByClassName("lib-video")[1].playbackRate = speed.toFixed(1);
	document.getElementById("currentSpeed").innerHTML = speed.toFixed(1);
}

//more settings
speedButton.onclick = function() {
	if (speedButton.id == "hide") {
		speedDiv.style.visibility = "visible";
		speedButton.id = "display";
	} else if (speedButton.id = "display") {
		speedDiv.style.visibility = "hidden";
		speedButton.id = "hide";
	}
}


speedDiv.innerHTML = "当前倍速：<text id='currentSpeed'>1.0</text> x<br></font><input type='text' placeholder='1.5' id='speedInput' size='3' maxlength='3'>&nbsp;&nbsp;<button class='custom-button ele-change' onclick='changeSpeed();' style='height:50%;width:40%'>切换</button>";