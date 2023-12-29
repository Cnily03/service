!function () {    // 文件夹双击变单击
    setInterval(() => {
        document.querySelector('.el-table__body')
            .querySelectorAll('.el-table__row').forEach(e => {
                let is_directory = false
                if (e.querySelector('.cell>label.is-disabled')) {
                    is_directory = true
                } else {
                    e.querySelectorAll(".cell>div:nth-child(2)").forEach(l => {
                        if (l.innerHTML === '') {
                            is_directory = true
                        }
                    })
                }
                if (is_directory) {
                    e.style['cursor'] = 'pointer'
                    e.setAttribute('signle-click', '1')
                    e.addEventListener('click', function dbclick() {
                        e.removeEventListener('click', dbclick)
                        if (e.getAttribute('signle-click') === '1') {
                            e.click()
                        }
                    })
                } else {
                    e.style['cursor'] = ''
                    e.removeAttribute('signle-click')
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