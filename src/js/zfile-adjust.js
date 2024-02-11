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
                    if (!e.isdb()) e.removeEventListener('click', dbclick)
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

!function () { // 移除部分 console.log
    const l = console.log;
    console.log = function (...args) {
        const s = args.join(' ');
        if (s.startsWith("[z-") || s.startsWith("加载自定义 js, src:"))
            return;
        return l(...args)
    }
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