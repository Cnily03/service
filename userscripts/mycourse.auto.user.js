// ==UserScript==
// @name         安全微课刷课工具
// @author       Jevon Wang
// @license      MIT
// @icon         https://mcwk.mycourse.cn/favicon.ico
// @version      0.1.2
// @description  需要开发者工具开启移动端预览。注：尽量不要刷课！认真看安全知识！
// @namespace    https://github.com/Cnily03
// @match        *://weiban.mycourse.cn/*
// @match        *://mcwk.mycourse.cn/course*
// @updateURL    https://raw.githubusercontent.com/Cnily03/service/master/userscripts/mycourse.auto.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/Cnily03/service@master/userscripts/mycourse.auto.user.js
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// ==/UserScript==
/**
 * 安全微课刷课脚本，能刷大部分课，但是需要开启开发者工具的移动端预览。开发初衷是用于跳过那些已经耳熟能详的安全课程。
 * 再次忠告：尽量不要刷课！认真看安全知识！
 */
unsafeWindow.ALERT = unsafeWindow.alert;

function isMatched(href) {
    return new RegExp(`^(https://|http://)${href}.*`).test(window.self.location.href);
}

function waitDOMContentLoaded(_onloadCallback) {
    if (document.readyState === "complete" || document.readyState === "interactive")
        _onloadCallback();
    else
        (addEventListener || attachEvent).call(window, addEventListener ? "load" : "onload", _onloadCallback);
}

// replace url
const replaceUrlIntervalId = setInterval(() => {
    performance.getEntriesByType("resource").filter(entry => {
        if (entry.initiatorType == "iframe" && /^https:\/\/mcwk.mycourse.cn\/course\/.*/.test(entry.name)) {
            clearInterval(replaceUrlIntervalId);
            window.location.replace(entry.name);
            return true;
        } else return false;
    })
}, 200)

// register menu command

var isSimpleAuto = GM_getValue("options.isSimpleAuto")
isSimpleAuto = typeof isSimpleAuto === "boolean" ? isSimpleAuto : false;
var isAutoBack = GM_getValue("options.isAutoBack")
isAutoBack = typeof isAutoBack === "boolean" ? isAutoBack : true;
var isFullyAuto = GM_getValue("options.isFullyAuto")
isFullyAuto = typeof isFullyAuto === "boolean" ? isFullyAuto : false;

var menuCmdId_1, menuCmdId_2, menuCmdId_3;

if (isMatched("mcwk.mycourse.cn/course")) {
    GM_registerMenuCommand("执行刷课", () => {
        autoDoCourse(isFullyAuto, isAutoBack);
    });
}

function registerMenu_1() {
    menuCmdId_1 = GM_registerMenuCommand(`自动刷课：${({ true: "ON", false: "OFF" })[isSimpleAuto]}`, function () {
        isSimpleAuto = !isSimpleAuto;
        GM_setValue("options.isSimpleAuto", isSimpleAuto);
        GM_unregisterMenuCommand(menuCmdId_1);
        GM_unregisterMenuCommand(menuCmdId_2);
        GM_unregisterMenuCommand(menuCmdId_3);
        registerMenu_1();
        registerMenu_2();
        registerMenu_3();
    })
}

function registerMenu_2() {
    menuCmdId_2 = GM_registerMenuCommand(`刷完后自动返回：${({ true: "ON", false: "OFF" })[isAutoBack]}`, function () {
        isAutoBack = !isAutoBack;
        GM_setValue("options.isAutoBack", isAutoBack);
        GM_unregisterMenuCommand(menuCmdId_2);
        GM_unregisterMenuCommand(menuCmdId_3);
        registerMenu_2();
        registerMenu_3();
    })
}

function registerMenu_3() {
    menuCmdId_3 = GM_registerMenuCommand(`全自动连续刷课：${({ true: "ON", false: "OFF" })[isFullyAuto]}`, function () {
        isFullyAuto = !isFullyAuto;
        GM_setValue("options.isFullyAuto", isFullyAuto);
        GM_unregisterMenuCommand(menuCmdId_3);
        registerMenu_3();
    })
}
registerMenu_1();
registerMenu_2();
registerMenu_3();

// entry
waitDOMContentLoaded(window.listenEmit = () => {
    const entryIntervalId = setInterval(() => {
        switch (true) {
            case isMatched("weiban.mycourse.cn/#/course\\?"):

                clearInterval(entryIntervalId);
                if (isFullyAuto && window.name == "user.next=autoEnterCourseList") autoEnterCourseList();
                break;

            case isMatched("weiban.mycourse.cn/#/course/list\\?"):

                clearInterval(entryIntervalId);
                if (isFullyAuto && window.name == "user.next=autoEnterCourse") autoEnterCourse();
                break;

            case isMatched("mcwk.mycourse.cn/course"):

                clearInterval(entryIntervalId);
                if (isSimpleAuto || isFullyAuto) autoDoCourse(isFullyAuto, isAutoBack);
                break;

            case isMatched("weiban.mycourse.cn/#/course/detail"):

                clearInterval(entryIntervalId);
                break;

            default:
                break;
        }
    }, 200)
});

function autoEnterCourseList() {
    window.name = "";
    setTimeout(() => {
        const chapters = document.querySelectorAll(".folder-list .folder-item");
        for (let i = 0; i < chapters.length; i++) {
            const _chapter = chapters[i];
            const state_info = _chapter.querySelector(".state").innerText.split("/");
            if (state_info.length == 2 && parseInt(state_info[0]) < parseInt(state_info[1])) {
                window.name = "user.next=autoEnterCourse";
                setTimeout(listenEmit, 800);
                return _chapter.querySelector("a.btn").click();
            }
        }
        ALERT("你已经完成全部课程，请前往完成考试！");
        document.querySelector(".is-selected").parentNode.children[1].click();
    }, 800)
}

function autoEnterCourse() {
    window.name = "";
    setTimeout(() => {
        const courseCount = document.querySelectorAll(".course .course-content").length;
        const hasFinishedCount = document.querySelectorAll(".course .course-content h3 i").length;
        if (courseCount == hasFinishedCount) {
            window.name = "user.next=autoEnterCourseList";
            window.history.go(-1);
            setTimeout(listenEmit, 800);
        } else {
            document.querySelector(".course").click();
        }
    }, 800)
}

async function autoDoCourse(isFullyAuto = false, isAutoBack = true) {
    unsafeWindow.ALERT = unsafeWindow.alert;
    unsafeWindow.alert = function (text) {
        unsafeWindow.console.log(text);
        return true;
    };

    function detectDone() {
        const all_xhr = performance.getEntriesByType("resource").filter(entry => {
            return entry.initiatorType == "script";
        });
        for (const element of all_xhr) {
            if (/^https:\/\/weiban.mycourse.cn\/pharos\/usercourse\/finish.do/.test(element.name))
                return true;
        }
        return false;
    }

    function autovideo() {
        try {
            const vdoms = document.getElementsByTagName("video");
            for (let i = 0; i < vdoms.length; i++) {
                if (vdoms[i].currentTime != vdoms[i].duration)
                    vdoms[i].currentTime = vdoms[i].duration;
            }
        } catch (e) { }
    }

    const start_btns = [".page-start-btn", ".btn-start", ".page-start-button", ".startClick"];
    const next_btns = [".page-active .btn-next", ".btn-next-prev .btn-next", ".active .nextClick"];
    const end_btns = [".btn-next-end", ".page-end-button"];
    const back_btns = [".page-end-back", ".back-list"];

    function endclick() {
        var isok = false;
        for (const _dom of end_btns)
            if (document.querySelector(_dom) !== null) {
                document.querySelector(_dom).click();
                isok = true;
                break;
            }
        if (!isok) try {
            finishWxCourse();
        } catch (e) { }
    }

    // start page
    var try_times = 10,
        started = false;
    await new Promise(resolve => {
        const startPageIntervalId = setInterval(() => {
            autovideo();
            for (const _dom of start_btns) {
                if (document.querySelector(_dom) !== null) {
                    try {
                        document.querySelector(_dom).click();
                        started = true;
                        break;
                    } catch (e) {
                        started = false;
                    }
                }
            }
            if (!started) try_times--;
            if (started || try_times <= 0) resolve(clearInterval(startPageIntervalId));
        }, 500)
    })

    if (!started && !detectDone()) return ALERT("当前课程不支持刷课，请你自己认真完成该课程！");

    function waitClick() {
        autovideo();
        setTimeout(() => {
            if (document.querySelector(".page-active .btn-next-end") === null && !detectDone()) {
                // turn page
                for (const _btn of next_btns) {
                    if (document.querySelector(_btn) !== null)
                        try {
                            document.querySelector(_btn).click();
                            break;
                        } catch (e) { }
                }
                waitClick();
            } else if (detectDone()) {
                if (isFullyAuto || isAutoBack) {
                    // find ending page
                    endclick();
                    setTimeout(() => {
                        window.name = isFullyAuto ? "user.next=autoEnterCourse" : "";
                        // back
                        for (const _dom of back_btns) {
                            var isok = false;
                            if (document.querySelector(_dom) !== null) {
                                document.querySelector(_dom).click();
                                isok = true;
                                break;
                            }
                            unsafeWindow.alert = unsafeWindow.ALERT;
                            if (!isok) window.history.go(-1);
                        }
                        unsafeWindow.alert = unsafeWindow.ALERT;
                    }, 500);
                } else {
                    endclick();
                    setTimeout(() => {
                        unsafeWindow.alert = unsafeWindow.ALERT;
                    }, 500);
                }
            } else waitClick()
        }, 200)
    }
    waitClick();
}