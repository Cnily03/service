// ==UserScript==
// @name         百度伪装成谷歌
// @author       Vincent George
// @License      CC 4.0 BY-SA
// @version      0.0.1
// @description  百度伪装成谷歌！
// @namespace    http://cnily.home.blog
// @updateURL    https://raw.githubusercontent.com/Cnily03/service/master/Tampermonkey/baiduPretendAsGoogle.js
// @match        https://www.baidu.com/*
// @require      https://code.jquery.com/jquery-3.4.1.min.js
// @grant        none
// ==/UserScript==
window.onload = function () {
    'use strict';

    function removeId(id) {
        document.getElementById(id).parentNode.removeChild(document.getElementById(id));
    }
    //remove QRCode
    removeId("s_side_wrapper");
    //remove new
    removeId("s_wrap");
    removeId("bottom_space");
    document.getElementsByClassName("s-skin-container s-isindex-wrap")
    //remove background
    $(".s-skin-container.s-isindex-wrap").css({
        "background-image": "",
        "background-color": ""
    });
    //logo
    var googlelogo = 'https://www.gstatic.com/images/branding/googlelogo/svg/googlelogo_clr_74x24px.svg';
    document.getElementById("s_lg_img").src = googlelogo;
    document.getElementById("s_lg_img").setAttribute('oneeror', "console.log('图片加载失败！')")
    document.getElementById("s_lg_img_new").src = googlelogo;
    document.getElementById("s_lg_img_new").setAttribute('oneeror', "console.log('图片加载失败！')")
    //clear unnecessary elements
    $("map#s_mp").remove();
    //Other element
    $("<center id='moveEle_1'><center>").prependTo($("#form.fm"));
    $("span#s_kw_wrap").remove().appendTo('#moveEle_1');

    $('<div style="heigh:70px;weight:571px;top:53px;padding-top:18px;"><center id="moveEle_2"></div>').insertAfter("#form.fm");
    $('<button id="expendSubmit" class="expendBtn">Google 搜索</button><button id="expendAnother" class="expendBtn">手气不错</button>').appendTo('#moveEle_2');

    $('<div class="soutu-layer new-pmd" style="display: none;"><div class="soutu-url"><span class="soutu-url-wrap"><input id="soutu-url-kw" class="soutu-url-kw" maxlength="255" autocomplete="off" placeholder="在此处粘贴图片网址"></span><span class="soutu-url-btn soutu-url-btn-old"><i class="soutu-icon soutu-url-btn-icon"></i></span><span class="soutu-url-btn soutu-url-btn-new">百度一下</span><span class="soutu-url-error" style="display: none;">请输入正确的图片网址</span></div><div class="soutu-state-normal" style="display: block;"><div class="soutu-drop"><span class="soutu-drop-tip">拖拽图片到这里</span><i class="soutu-icon soutu-drop-icon"></i></div><div class="upload-wrap"><input type="file" class="upload-pic" value="上传图片"><i class="soutu-icon upload-icon"></i><span class="upload-text upload-text-old">本地上传图片</span><span class="upload-text upload-text-new">选择文件</span></div></div><a class="soutu-icon soutu-close soutu-close-old" href="javascript:void(0);"></a><a class="soutu-close c-icon soutu-close-new" href="javascript:void(0);"></a></div>').insertBefore('#moveEle_1');

    $('#s_fm.s_form.s_form_login').css("padding-top", "90px");
    $('#s_btn_wr.btn_wr.s_btn_wr.bg').css({
        "visibility": "hidden",
        "position": "absolute"
    });
    //search input
    $("input#kw.s_ipt").css({
        "border": "1px solid #dfe1e5",
        "border-radius": "24px",
        "height": "20px"
    });
    $("#s_kw_wrap").hover(function () {
        $(this).css({
            "box-shadow": "0 1px 6px 0 rgba(32,33,36,0.28)",
            "border-radius": "24px"
        });
    }, function () {
        $(this).css({
            "box-shadow": "none",
            "border-radius": "24px"
        })
    });
    //button
    function tmp_btn_common(selector) {
        $(selector).css({
            "border-radius": "4px",
            "font-family": "arial,sans-serif",
            "font-size": "14px",
            "margin": "11px 6px",
            "padding": "0 16px",
            "line-height": "27px",
            "height": "36px",
            "min-width": "54px",
            "text-align": "center",
            "cursor": "pointer",
            "user-select": "none",
            "outline": "none"
        });
    }

    function tmp_notHover(selector1) {
        $(selector1).css({
            "background-image": "-webkit-linear-gradient(top,#f5f5f5,#f1f1f1)",
            "background-color": "#f2f2f2",
            "border": "1px solid #f2f2f2",
            "color": "#5F6368"
        });
        tmp_btn_common(selector1);
    }
    tmp_notHover('.expendBtn');
    $('.expendBtn').hover(function () {
        $(this).css({
            "box-shadow": "0 1px 1px rgba(0,0,0,0.1)",
            "background-image": "-webkit-linear-gradient(top,#f8f8f8,#f1f1f1)",
            "background-color": "#f8f8f8",
            "border": "1px solid #c6c6c6",
            "color": "#222"
        });
        tmp_btn_common(this);
    }, function () {
        tmp_notHover(this);
    });
    document.getElementById('expendSubmit').onclick = function () {
        document.getElementById("su").click();
    }
    
}