// ==UserScript==
// @name         中国知网免费下载
// @author       Jevon Wang
// @license      MIT
// @icon         https://img.anfensi.com/upload/2019-2/201921384441720.png
// @version      0.1.1
// @description  通过图书馆等机构途径下载中国知网文献
// @namespace    https://github.com/Cnily03
// @downloadURL  https://raw.githubusercontent.com/Cnily03/service/master/Tampermonkey/cnki-download.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/Cnily03/service@master/Tampermonkey/cnki-download.user.js
// @match        https://kns.cnki.net/kcms/detail/detail.aspx*
// @match        http://61.175.198.136:8083/rwt/288/http/GEZC6MJZFZZUPLSSG63B/kcms/detail/detail.aspx*
// @match        http://61.175.198.136:8083/login.action*
// @match        https://www.zjlib.cn/loginCas.jspx*
// @match        http://61.175.198.136:8083/rwt/288/http/GEZC6MJZFZZUPLSSG63B/kns55/
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// ==/UserScript==
const Base64 = {
    encode: (text) => window.btoa(text),
    decode: (text) => window.atob(text)
};
function waitDOMContentLoaded(_onloadCallback) {
    if (document.readyState === "complete" || document.readyState === "interactive")
        _onloadCallback();
    else
        (addEventListener || attachEvent).call(window, addEventListener ? "load" : "onload", _onloadCallback);
}
function createElementHTML(htmlCode) {
    var _holder = document.createElement("div");
    _holder.innerHTML = htmlCode;
    return _holder.childNodes[0];
}
function insertAfter(newElement, targetElement) {
    var parent = targetElement.parentNode;
    if (parent.lastChild == targetElement) {
        parent.appendChild(newElement);
    } else {
        parent.insertBefore(newElement, targetElement.nextSibling);
    }
}
function genAccountValue(username, password) {
    return Base64.encode(JSON.stringify({
        username: username,
        password: Base64.encode(password)
    }))
}
/********************************************/
const loginAccount = {
    display: function () {
        // unsafeWindow
        unsafeWindow.GM_getValue = GM_getValue;
        unsafeWindow.GM_setValue = GM_setValue;
        unsafeWindow.libVerifyLogin = function () {
            const username = encodeURIComponent(document.querySelector("#lib-username").value);
            const password = encodeURIComponent(document.querySelector("#lib-password").value);
            if (username && password) {
                GM_setValue("zjlib.verifyLogin", true);
                const verifyWindow = window.open(
                    `https://www.zjlib.cn/loginCas.jspx?username=${username}&password=${password}&remember=on`,
                    "登录验证",
                    "top=255,left=280,toolbar=no,status=no,location=no,resizable=no,menubar=no,scrollbars=no,resizable=no,width=100,height=50"
                );
                const listenWinClosed = setInterval(function () {
                    if (verifyWindow.closed) {
                        clearInterval(listenWinClosed);
                        if (GM_getValue("zjlib.verifyLogin")) {
                            //登录失败
                            alert("登录失败！")
                            GM_setValue("zjlib.verifyLogin", false);
                        } else {
                            // 登录成功
                            alert("登录成功！")
                            GM_setValue("zjlib.account", genAccountValue(username, password));
                            loginAccount.hide();
                        }
                    }
                }, 100)
            } else {
                alert("用户名或密码不能为空！")
            }
        }
        // css
        const _css = document.createElement("style");
        _css.innerHTML = `#lib-login-bar *{font-family:auto;}#lib-login-bar{background:rgba(247,248,249,.5);bottom:0;display:block;position:fixed;z-index:999;left:0;right:0;top:0;display:flex;justify-content:center;align-items:center;}input.lib-login{background:#fff;border:.05rem solid #bcc3ce;color:#3b4351;height:1.5rem;outline:0;width:100%;max-width:100%;padding:.25rem .4rem;font-size:1rem;transition:background .2s,border .2s,box-shadow .2s,color .2s;margin-top:.3rem;}input.lib-login:focus{border-color:#5755d9;box-shadow:0 0 0 0.1rem rgb(87 85 217 / 20%);}input.lib-login::-webkit-input-placeholder{color:#BCC3CE;}input.lib-login::-ms-input-placeholder{color:#BCC3CE;}.lib-btn{-webkit-appearance:none;-moz-appearance:none;appearance:none;background:#fff;border:.05rem solid #5755d9;border-radius:.1rem;color:#5755d9;cursor:pointer;display:inline-block;font-size:1rem;height:2.4rem;line-height:1.2rem;outline:0;padding:.5rem .6rem;text-align:center;text-decoration:none;transition:background .2s,border .2s,box-shadow .2s,color .2s;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;vertical-align:middle;white-space:nowrap;}.lib-btn.lib-btn-dark{background:#5755d9;border-color:#4b48d6;color:#fff;}.lib-btn:hover,.lib-btn:focus{border-color:#3634d2;color:#3634d2;}.lib-btn.lib-btn-dark:hover,.lib-btn.lib-btn-dark:focus{background:#4240d4;border-color:#3634d2;color:#fff;}`;
        document.head.appendChild(_css);
        // html
        const _html = createElementHTML(`<div id="lib-login-bar">
        <div
            style="height:fit-content;width:90vw;max-width:320px;max-height:560px;background-color:#fff;box-shadow:0 0.2rem 0.5rem rgb(48 55 66 / 30%);border-radius:.1rem;padding:0 .4rem;display:flex;padding:.8rem;flex-direction:column;">
            <div style="font-weight:600;font-size:1.2rem;color:#303742;padding:.8rem;">登录浙江图书馆</div>
            <div>
                <iframe name="hiddenIframe" hidden></iframe>
                <form action="about:blank" target="hiddenIframe">
                    <div style="padding: .4rem .8rem;">
                        <div style="margin-bottom: .4rem;">
                            <label for="lib-username" style="color:#303742;font-size:1rem;">用户名</label>
                            <input type="text" id="lib-username" class="lib-login" placeholder="读者证号/身份证号"
                                maxlength="18">
                        </div>
                    </div>
                    <div style="padding: 0 .8rem .8rem .8rem;">
                        <div>
                            <label for="lib-password" style="color:#303742;font-size:1rem;">密码</label>
                            <input type="password" id="lib-password" class="lib-login" placeholder="密码" maxlength="16">
                        </div>
                    </div>
                    <input type="submit" onclick="libVerifyLogin()" hidden>
                </form>
            </div>
            <div style="text-align: right;">
                <button class="lib-btn" onclick="hideLibLoginBar()">取消</button>
                <button class="lib-btn lib-btn-dark" onclick="libVerifyLogin()">登录</button>
            </div>
        </div>
    </div>`);
        document.body.appendChild(_html);
    },
    hide: function () {
        document.querySelector("#lib-login-bar").remove();
    }
}
unsafeWindow.hideLibLoginBar = loginAccount.hide;
try {
    GM_registerMenuCommand('账户设置', loginAccount.display);
} catch (e) { }
/********************************************/
const PATH = window.location.origin + window.location.pathname;
const PARAMS = (function () {
    let searchTxt = window.location.search.substring(1);
    let searchArr = searchTxt.split("&");
    let obj = {};
    searchArr.forEach(query => {
        const p = query.split("=");
        if (p.length - 1 && p[0]) {
            obj[decodeURIComponent(p[0])] = decodeURIComponent(p[1]);
        }
    });
    return obj;
})();

switch (PATH) {
    case "https://kns.cnki.net/kcms/detail/detail.aspx": {
        waitDOMContentLoaded(function () {
            addBtnToCnki();
        });
        break;
    }
    case "http://61.175.198.136:8083/rwt/288/http/GEZC6MJZFZZUPLSSG63B/kcms/detail/detail.aspx": {
        if (window.name.split("|")[0] == "dl-cnki") {
            waitDOMContentLoaded(function () {
                if (window.name.split("|")[1] == "pdf")
                    document.querySelector(".pdf a").click();
                else if (window.name.split("|")[1] == "caj")
                    document.querySelector(".caj a").click();
                window.close();
            });
        }
        break;
    }

    /** 错误界面处理 */

    // 要求登录内网，捕获错误
    case "http://61.175.198.136:8083/login.action": {
        if (window.name.split("|")[0] == "dl-cnki") {
            //跳转登录
            const account_zjlib = JSON.parse(Base64.decode(GM_getValue("zjlib.account")) || Base64.encode("{}"));
            const username = account_zjlib.username;
            const password = Base64.decode(account_zjlib.password);
            window.location = `https://www.zjlib.cn/loginCas.jspx?username=${username}&password=${password}&remember=on`;
        }
        break;
    }
    // 登录浙江图书馆
    case "https://www.zjlib.cn/loginCas.jspx": {
        if (GM_getValue("zjlib.verifyLogin")) { //验证登录
            waitDOMContentLoaded(function () {
                const statusCode = parseInt(document.body.innerText);
                // success
                if (statusCode == 200) {
                    GM_setValue("zjlib.verifyLogin", false)
                }
                window.close();
            });
        }
        //自动登录
        else if (window.name.split("|")[0] == "dl-cnki") {
            waitDOMContentLoaded(function () {
                const statusCode = parseInt(document.body.innerText);
                // success
                if (statusCode == 200) {
                    // 跳转设置内网知网的Cookie
                    window.location = "https://www.zjlib.cn/elec/auth.jsp?returnUrl=http://10.18.17.173/kns55/"
                } else { // failure
                    alert("浙江图书馆账号自动登录失败！");
                    window.close();
                }
            });
        }

        break;
    }
    // 进入浙江图书馆知网，跳转到具体界面
    case "http://61.175.198.136:8083/rwt/288/http/GEZC6MJZFZZUPLSSG63B/kns55/": {
        if (window.name.split("|")[0] == "dl-cnki") {
            window.location = window.name.split("|")[2];
        }
        break;
    }
    default: break;
}

function addBtnToCnki() {
    const search = "?" + [
        `dbcode=${PARAMS.dbcode.toLowerCase()}`,
        `dbname=${PARAMS.dbname.toLowerCase()}`,
        `filename=${PARAMS.filename}`
    ].join("&");
    const href = `http://61.175.198.136:8083/rwt/288/http/GEZC6MJZFZZUPLSSG63B/kcms/detail/detail.aspx${search}`
    // create element
    const El_CAJDownload = createElementHTML(`<li class="btn-dlcaj"><a target="_blank" id="cajDown" name="cajDown" style="background-color: #0852eb;" href="https://node.cnily03.workers.dev/redirect?href=${encodeURIComponent(href)}&window.name=${"dl-cnki|caj|" + encodeURIComponent(href)}"><i></i>浙江图书馆 CAJ下载</a></li>`);
    const El_PDFDownload = createElementHTML(`<li class="btn-dlpdf"><a target="_blank" id="pdfDown" name="pdfDown" style="background-color: #159316;" href="https://node.cnily03.workers.dev/redirect?href=${encodeURIComponent(href)}&window.name=${"dl-cnki|pdf|" + encodeURIComponent(href)}"><i></i>浙江图书馆 PDF下载</a></li>`);
    // append child
    const el_unfixed = createElementHTML(`<ul class="operate-btn" style="margin-bottom: .5rem"></ul>`);
    el_unfixed.appendChild(El_CAJDownload);
    el_unfixed.appendChild(El_PDFDownload);
    document.querySelector("#DownLoadParts .operate-btn").parentNode.insertBefore(
        el_unfixed,
        document.querySelector("#DownLoadParts .operate-btn")
    )
    // create element
    const El_CAJDownload_fixed = createElementHTML(`<li class="btn-dlcaj"><a target="_blank" id="cajDown" name="cajDown" style="background-color: #0852eb; width: fit-content;" href="https://node.cnily03.workers.dev/redirect?href=${encodeURIComponent(href)}&window.name=${"dl-cnki|caj|" + encodeURIComponent(href)}"><i></i>浙江图书馆 CAJ下载</a></li>`);
    const El_PDFDownload_fixed = createElementHTML(`<li class="btn-dlpdf"><a target="_blank" id="pdfDown" name="pdfDown" style="background-color: #159316; width: fit-content;" href="https://node.cnily03.workers.dev/redirect?href=${encodeURIComponent(href)}&window.name=${"dl-cnki|pdf|" + encodeURIComponent(href)}"><i></i>浙江图书馆 PDF下载</a></li>`);
    // append child fixed
    const el_fixed = createElementHTML(`<ul class="operate-btn" style="display: block; margin-top: .5rem"></ul>`);
    el_fixed.appendChild(El_CAJDownload_fixed);
    el_fixed.appendChild(El_PDFDownload_fixed);
    insertAfter(
        el_fixed,
        document.querySelector(".operate-fixed .fixed-btn .operate-btn")
    );
}
