import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://juejin.cn/*", "https://blog.csdn.net/*"]
}
console.log("💨copy content")

document.addEventListener("copy", (e) => {
  // 掘金只对长文本做了追加处理
  const copiedText = e.clipboardData.getData("text/plain")
  console.log("copiedText: ", copiedText)

  const reg = getReg(copiedText)

  if (reg && reg?.test(copiedText)) {
    const res = copiedText.replace(reg, "")
    e.clipboardData.setData("text/plain", res)
    console.log("✅插件生效，复制内容已保护")
    e.preventDefault()
  }
})

function getSelectionText() {
  const selection = window.getSelection()
  const selectedRange = selection?.getRangeAt(0)

  const html = selectedRange.cloneContents()
  const text = selectedRange?.toString()
  console.log("text: ", html, text)
  //   clipboardData.setData(  "text/plain",   text+'233'  )
  //   clipboardData.setData(  "text/html",  "<div>".concat(html, "</div>") )
}

// 源码 https://lf3-cdn-tos.bytescm.com/obj/static/xitu_juejin_web/7c55458.js

function getReg(str: string): RegExp | void {
  const regMap = {
    juejin: /(\r?\n)(\r?\n)作者.+\n链接.+\n来源.+\n著.+处。$/,
    csdn: /(\r?\n)—+\r?\n\s+(.+\r?\n)(\s+\r?\n)原文链接.+/
  }

  for (const key in regMap) {
    if (regMap[key].test(str)) {
      return regMap[key]
    }
  }

  return
}
