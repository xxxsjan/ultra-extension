import type { PlasmoContentScript } from "plasmo"

export const config: PlasmoContentScript = {
  matches: ["https://www.plasmo.com/*"]
}

window.addEventListener("load", () => {
  console.log("plasmo网站 的 content script 已加载")
  document.body.style.background = "background-color: rgba(129, 140, 248, 1);"
})
