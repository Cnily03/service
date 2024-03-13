!function () {    // 文件夹双击变单击
    let prevent = false
    setInterval(() => {
        if (prevent) return
        const trlist = document.querySelector('.el-table__body')
            .querySelectorAll('.el-table__row')
        trlist.forEach(e => {
            if (!e.isdb) e.isdb = () => e.__single_click === true
            if (!e.setdb) e.setdb = () => e.__single_click = true
            if (!e.deldb) e.deldb = () => e.__single_click = false
            let is_folder = false, is_back = false, is_bucket = false

            let svgUseElList = e.querySelectorAll(".cell svg>use")
            for (let svgUseEl of svgUseElList) {
                const type = svgUseEl.getAttribute('xlink:href')
                if (type === '#icon-file-type-folder') is_folder = true
                else if (type === '#icon-file-type-back') is_back = true
                else if (type === '#icon-file-type-root') is_bucket = true
                break
            }
            let is_directory = is_folder || is_back || is_bucket

            if (is_directory) {
                if (e.isdb()) return // no repeat
                e.style['cursor'] = 'pointer'
                e.setdb()
                e.addEventListener('click', function dbclick() {
                    if (!e.isdb()) return e.removeEventListener('click', dbclick)
                    // restore
                    prevent = true
                    trlist.forEach(e => e.__single_click = false)
                    prevent = false
                    // click
                    e.click()
                })
            } else {
                e.style['cursor'] = ''
                e.deldb()
            }
        })
    }, 100)
}()

!function () { // header logo 修改鼠标样式
    const logo = document.querySelector('.zfile-header #zfile-home-logo')
    logo.style['cursor'] = 'pointer'
}()

!function () { // 备案信息修复
    document.querySelector("[href=\"https://beian.miit.gov.cn/\"]").parentElement.childNodes
        .forEach((e, i) => {
            if (i === 0) {
                e.innerHTML = e.innerHTML.slice(0, -3)
            } else if (i === 1) {
                e.data = " | " + e.data
            }
        })
}()

!function () { // 移除部分 console 输出
    const __log = console.log;
    const __time = console.time;
    const __timeEnd = console.timeEnd;
    console.log = function (...args) {
        const s = args.join(' ');
        let blacklist_startsWith = [
            "加载自定义 js, src:",
            "[z-",
        ]
        for (let e of blacklist_startsWith) {
            if (s.startsWith(e)) return
        }
        return __log(...args)
    }
    console.time = function (...args) {
        const s = args.join(' ');
        let blacklist_regExp = [
            /^\/api\/[^\s]+$/
        ]
        for (let e of blacklist_regExp) {
            if (e.test(s)) return
        }
        return __time(...args)
    }
    console.timeEnd = function (...args) {
        const s = args.join(' ');
        let blacklist_regExp = [
            /^\/api\/[^\s]+$/
        ]
        for (let e of blacklist_regExp) {
            if (e.test(s)) return
        }
        return __timeEnd(...args)
    }
}()
