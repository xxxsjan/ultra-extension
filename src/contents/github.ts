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
  setTimeout(() => {

    const btn = document.getElementById(':R55ab:')
  
    const classList = btn.classList.value
 
    const lastEl = document.querySelector(".Box-sc-g0xbh4-0.bNDvfp")

    const button = document.createElement("button")
    button.className = classList
    button.innerHTML = "github1s打开"

    lastEl.parentNode.insertBefore(button, lastEl)

    button.onclick = to1s
  }, 1000)
})

function to1s() {
  const url = location.href.replace("github", "github1s")
  window.location.href = url
}
