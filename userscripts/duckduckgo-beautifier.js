// ==UserScript==
// @name         DuckDuckGo Beautifier
// @author       Jevon Wang
// @license      MIT
// @icon         https://duckduckgo.com/assets/logo_header.v109.svg
// @version      0.1.1
// @description  Beautify the DuckDuckGo search results page.
// @namespace    https://github.com/Cnily03
// @downloadURL  https://raw.githubusercontent.com/Cnily03/service/master/userscripts/duckduckgo-beautifier.js
// @updateURL    https://cdn.jsdelivr.net/gh/Cnily03/service@master/userscripts/duckduckgo-beautifier.js
// @match        https://duckduckgo.com/*
// ==/UserScript==

function requireDomLoaded(func) {
    return new Promise(resolve => {
        if (document.readyState !== 'loading') {
            func();
            resolve();
        } else {
            function temp() { func(); document.removeEventListener('DOMContentLoaded', temp); resolve(); }
            document.addEventListener('DOMContentLoaded', temp);
        }
    })
}

function requireElementLoaded(selector, func, interval = 100) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            func();
            resolve();
        } else {
            const itvid = setInterval(() => {
                if (document.querySelector(selector)) {
                    func();
                    resolve();
                    clearInterval(itvid);
                }
            }, interval)
        }
    })
}

const Utils = {
    addCss(css, id = "") {
        // document.getElementById('css-duckduckgo-utils' + id ? `-${id}` : '')?.remove()
        const style = document.createElement('style')
        style.id = 'css-duckduckgo-utils' + id ? `-${id}` : ''
        style.innerHTML = css
        document.body.appendChild(style)
    },
    getCssProperty(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name)
    },
    setCssProperty(name, value) {
        document.documentElement.style.setProperty(name, value)
    }
}

const Events = {
    Style: {
        GridBlock: async function () {
            await requireElementLoaded("#react-layout section[data-testid='sidebar']", function () {
                if (!document.querySelector("#react-layout section[data-testid='sidebar']").children.length)
                    document.querySelector("#react-layout section[data-testid='sidebar']").remove()
            })

            Utils.addCss(`
            @media screen and (min-width: 1080px) {
                #react-layout > div > div:first-child {
                    margin-right: var(--gutter-xl);
                }
            }
            #react-layout section[data-testid='mainline'] {
                max-width: 100%;
                flex-basis: 100%;
            }
            #react-layout ol.react-results--main {
                display: grid;
                column-gap: var(--grid-column-gaps);
                grid-template-columns: repeat(auto-fill, var(--grid-column-width));
            }
            :root {
                --grid-column-width: 590px;
                --grid-column-max-width: 700px;
                --grid-column-min-width: 500px;
                --grid-column-gaps: 20px;
            }
            `, 'grid-block')
            requireElementLoaded("#react-layout ol.react-results--main", Events.Style.CalculateGirdWidth)
        },
        CalculateGirdWidth: function () {
            if (window.innerWidth < 1080) {
                console.log("window width less than 1080, set grid width to 590px")
                Utils.setCssProperty('--grid-column-width', '590px')
            } else {
                const GAP = parseFloat(Utils.getCssProperty('--grid-column-gaps'))
                const MAX_WIDTH = parseFloat(Utils.getCssProperty('--grid-column-max-width'))
                const MIN_WIDTH = parseFloat(Utils.getCssProperty('--grid-column-min-width'))
                const containerWidth = parseFloat(getComputedStyle(document.querySelector("#react-layout ol.react-results--main")).width)

                if (containerWidth > 0) {
                    let mincount = Math.ceil((containerWidth + GAP) / (MAX_WIDTH + GAP)),
                        maxpad = containerWidth + GAP - mincount * (MAX_WIDTH + GAP);
                    let maxcount = Math.floor((containerWidth + GAP) / (MIN_WIDTH + GAP)),
                        minpad = containerWidth + GAP - maxcount * (MIN_WIDTH + GAP);
                    if (mincount > maxcount) [mincount, maxcount] = [maxcount, mincount]
                    const count = maxpad > minpad ? maxcount : mincount;
                    let width = (containerWidth - GAP * (count - 1)) / count;

                    if (count == 1 && width > MAX_WIDTH) width = MAX_WIDTH;

                    globalWidth = count == 1 ? width : containerWidth

                    Utils.setCssProperty('--grid-column-width', width + 'px')
                    console.log("resize the grid width", width, "and count", count)
                }
            }
        }
    }
}

function emitEvent(events) {
    if (typeof events === 'string') events = [events]
    events.forEach(e => {
        e();
    })
}

!function () {
    'use strict';
    if (!/(^\?q=[^&\?]+)|(&q=[^&\?]+)/.test(window.location.search)) return;
    emitEvent([Events.Style.GridBlock])
    window.addEventListener('resize', Events.Style.CalculateGirdWidth)
}();
