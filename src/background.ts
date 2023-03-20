import translate from "./scripts/translate"

export {}
// 插件环境
console.log("%cHELLO WORLD FROM BGSCRIPTS", "background-color:pink")
console.log('❤️ ❤️ background.js');

chrome.runtime.onMessage.addListener((message, sender, contentCb) => {
  console.log("content-->background", message)
  translate(message.text).then((res) => {
    console.log(message.text, "翻译结果", res)
    contentCb(res)
  })
  return true
})
