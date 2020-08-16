// ==UserScript==
// @name         百度伪装成谷歌
// @author       Vincent George
// @License      CC 4.0 BY-SA
// @version      0.0.1
// @description  没错！你可以倍速看钉钉GroupLive. 而且自定义倍速！
// @namespace    http://cnily.home.blog
// @updateURL    https://raw.githubusercontent.com/Cnily03/service/master/Tampermonkey/baiduPretendAsGoogle.js
// @match        https://baidu.com
// @require      https://code.jquery.com/jquery-3.4.1.min.js
// @grant        none
// ==/UserScript==
window.onload = function () {
    'use strict';
    var googlelogo = 'https://www.gstatic.com/images/branding/googlelogo/svg/googlelogo_clr_74x24px.svg';
    //remove QRCode
    document.getElementById("s_side_wrapper").parentNode.removeChild(document.getElementById("s_side_wrapper"));
}