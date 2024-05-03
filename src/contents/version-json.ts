import type { PlasmoCSConfig } from "plasmo"
import { copyToClipboard } from "../../utils"

export const config: PlasmoCSConfig = {
  matches: ["http://127.0.0.1:9222/json/version"]
}

console.log("version-json")

window.onload = function () {
  const btn = document.createElement("button")
  btn.innerText = "复制webSocketDebuggerUrl"
  btn.onclick = () => {
    const el = document.querySelector("pre")
    const text = el?.innerText
    const obj = JSON.parse(text)
    const webSocketDebuggerUrl = obj.webSocketDebuggerUrl
    console.log("webSocketDebuggerUrl: ", webSocketDebuggerUrl)
    copyToClipboard(webSocketDebuggerUrl)
    alert("已复制webSocketDebuggerUrl到剪切板: " + webSocketDebuggerUrl)
  }

  document.body.appendChild(btn)
}
