// ==UserScript==
// @name         DuckDuckGo Beautifier
// @author       Jevon Wang
// @license      MIT
// @icon         https://duckduckgo.com/assets/logo_header.v109.svg
// @version      0.1.2
// @description  Beautify the DuckDuckGo search results page.
// @namespace    https://github.com/Cnily03
// @downloadURL  https://raw.githubusercontent.com/Cnily03/service/master/userscripts/duckduckgo-beautifier.js
// @updateURL    https://cdn.jsdelivr.net/gh/Cnily03/service@master/userscripts/duckduckgo-beautifier.js
// @match        https://duckduckgo.com/*
// ==/UserScript==

const DEBUG = false
console.debug = DEBUG ? console.log : () => { }

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
            Utils.addCss(`
            @media screen and (min-width: 1080px) {
                #react-layout > div > div:first-child {
                    margin-right: var(--gutter-xl);
                }
            }
            #react-layout section[data-testid='mainline'] {
                max-width: calc(100% - var(--sidebar-width));
                flex-basis: 100%;
                width: max-content;
            }
            #react-layout ol.react-results--main {
                display: grid;
                column-gap: var(--grid-column-gaps);
                row-gap: var(--grid-row-gaps);
                grid-template-columns: repeat(auto-fill, var(--grid-column-width));
            }
            :root {
                --sidebar-width: 465px;
                --grid-column-width: 590px;
                --grid-column-max-width: 700px;
                --grid-column-min-width: 500px;
                --grid-column-gaps: 20px;
                --grid-row-gaps: 12px;
            }
            `, 'grid-block')
            requireElementLoaded("#react-layout ol.react-results--main", Events.Style.CalculateGirdWidth)
        },
        CalculateGirdWidth: async function () {
            if (window.innerWidth < 1080) {
                console.debug("window width less than 1080, set grid width to 590px")
                Utils.setCssProperty('--grid-column-width', '590px')
            } else {
                const GAP = parseFloat(Utils.getCssProperty('--grid-column-gaps'))
                const MAX_WIDTH = parseFloat(Utils.getCssProperty('--grid-column-max-width'))
                const MIN_WIDTH = parseFloat(Utils.getCssProperty('--grid-column-min-width'))
                // sidebar
                let sidebarWidth = 0
                await requireElementLoaded("#react-layout section[data-testid='sidebar']", function () {
                    const domSidebar = document.querySelector("#react-layout section[data-testid='sidebar']")
                    if (domSidebar.children.length) {
                        domSidebar.style.position = 'absolute'
                        domSidebar.style.opacity = '0'
                        sidebarWidth = parseFloat(getComputedStyle(domSidebar).width)
                        Utils.setCssProperty('--sidebar-width', sidebarWidth + 'px')
                        domSidebar.style.position = ''
                        domSidebar.style.opacity = ''
                    } else {
                        Utils.setCssProperty('--sidebar-width', '0px')
                        domSidebar.remove()
                    }
                })
                console.debug("sidebar width", sidebarWidth)

                const domContainer = document.querySelector("#react-layout ol.react-results--main");
                const containerWidth = parseFloat(getComputedStyle(domContainer).width)

                if (containerWidth > 0) {
                    let mincount = Math.ceil((containerWidth + GAP) / (MAX_WIDTH + GAP)),
                        maxpad = containerWidth + GAP - mincount * (MAX_WIDTH + GAP);
                    let maxcount = Math.floor((containerWidth + GAP) / (MIN_WIDTH + GAP)),
                        minpad = containerWidth + GAP - maxcount * (MIN_WIDTH + GAP);
                    if (mincount > maxcount) [mincount, maxcount] = [maxcount, mincount]
                    const count = (maxpad > minpad ? maxcount : mincount) || 1;
                    let width = (containerWidth - GAP * (count - 1)) / count;

                    if (count == 1 && width > MAX_WIDTH) width = MAX_WIDTH;

                    globalWidth = count == 1 ? width : containerWidth

                    Utils.setCssProperty('--grid-column-width', width + 'px')
                    console.debug("resize the grid width", width, "and count", count)
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
