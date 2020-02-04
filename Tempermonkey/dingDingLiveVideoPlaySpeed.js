// ==UserScript==
// @name         钉钉GroupLive倍速控件油猴脚本
// @namespace    http://cnily.home.blog
// @version      1.1
// @description  没错！你可以倍速看钉钉GroupLive. 而且自定义倍速！
// @author       Vincent George
// @match        https://h5.dingtalk.com/group-live-share/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/George-Vincent/service/master/TemperMonkey/dingDingLiveVideoPlaySpeed.js
// ==/UserScript==
(function() {
    'use strict';
    var div = document.createElement("div");
    div.id = "customDiv";
    var style = document.createAttribute("style");
    div.setAttributeNode(style);
    div.style.backgroundColor = "#000";
    div.style.border = "2px solid #fff";
    div.style.width = "120px";
    div.style.height = "50px";
    div.style.position = "absolute";
    div.style.right = "10px";
    div.style.bottom = "50px";
    div.style.padding = "7px";
    div.style.zIndex = "99999";
    div.style.lineHeight = 1.5;
    div.style.color = "#fff";
    div.style.fontSize = "15px";
    window.onload = function() {
        document.getElementsByClassName("lib-video")[0].appendChild(div);
        window.changeSpeed = function() {
            var speed = parseFloat(document.getElementById("speedInput").value);
            document.getElementsByClassName("lib-video")[1].playbackRate = speed.toFixed(1);
            document.getElementById("currentSpeed").innerHTML = speed.toFixed(1);
        }
        div.innerHTML = "当前倍速：<text id='currentSpeed'>1.0</text><br></font><input type='text' id='speedInput' size='3' maxlength='3'>&nbsp;&nbsp;<button onclick='window.changeSpeed();' style='height:50%;width:40%'>切换</button>";
    }
})();