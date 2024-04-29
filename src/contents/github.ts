import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://github.com/*"]
}

// 在内容页面中接收来自popup页面的消息
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.action === "redirect") {
    to1s()
  }
})

window.addEventListener("load", () => {
  const lastEl = document.querySelector(".Box-sc-g0xbh4-0.bNDvfp")
  const button = document.createElement("button")
  button.className = "types__StyledButton-sc-ws60qy-0 gYvpXq"
  button.innerHTML = "编辑器查看（github1s）"
  lastEl.parentNode.insertBefore(button, lastEl)

  button.onclick = to1s
})

function to1s() {
  const url = location.href.replace("github", "github1s")
  window.location.href = url
}
