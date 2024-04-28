import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://github.com/*"]
}

// 在内容页面中接收来自popup页面的消息
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.action === "redirect") {
    window.location.href = message.url
  }
})

window.addEventListener("load", () => {
  console.log("github 的 content 脚本已加载")
  document.body.style.background = "background-color: rgba(129, 140, 248, 1);"
})
