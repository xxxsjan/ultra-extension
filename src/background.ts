import translate from "./scripts/translate"

export {}
// 插件环境
console.log("%cHELLO WORLD FROM BGSCRIPTS", "background-color:pink")
console.log("❤️ ❤️ background.js")

chrome.runtime.onMessage.addListener((message, sender, cb) => {
  if ((message.action = "translate")) {
    translate(message.payload.text).then(cb)
  }
  return true
})

// 获取cookie
async function getCookie(name) {
  const cookies = await chrome.cookies.getAll({ domain: ".lkcoffee.com" })
  console.log("service worker cookies--->", cookies)
}
