// ==UserScript==
// @name         超星作业公式图片显示修复
// @author       Jevon Wang
// @license      MIT
// @icon         http://www.chaoxing.com/images/favicon.ico
// @version      0.1.1
// @description  修复edu-image.nosdn.127.net的图片在chaoxing.com无法显示的问题
// @namespace    https://github.com/Cnily03
// @downloadURL  https://raw.githubusercontent.com/Cnily03/service/master/Tampermonkey/chaoxing-img-fix.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/Cnily03/service@master/Tampermonkey/chaoxing-img-fix.user.js
// @match        https://mooc1.chaoxing.com/mooc2/work/*
// @grant        unsafeWindow
// ==/UserScript==
(function () {
    'use strict';

    function waitDOMContentLoaded(_onloadCallback) {
        if (document.readyState === "complete" || document.readyState === "interactive") {
            _onloadCallback();
        } else {
            (window.addEventListener || window.attachEvent).call(window, addEventListener ? "load" : "onload", _onloadCallback);
        }
    }
    waitDOMContentLoaded(function () {
        document.querySelectorAll("img").forEach(elem => {
            if (/^https?:\/\/edu-image.nosdn.127.net/.test(elem.src)) {
                elem.referrerPolicy = "no-referrer";
            }
        })
    })
})();