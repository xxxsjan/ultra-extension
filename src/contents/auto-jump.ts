import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://link.juejin.cn/*", "https://link.csdn.net/*"]
}

window.addEventListener("load", () => {
  console.log("auto jump 脚本已加载")

  // https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fnihaojob%2Fvue-fabric-editor

  const div = document.createElement("div")
  div.style.fontSize = "30px"
  div.style.position = "fixed"
  div.style.top = "15%"
  div.style.left = "50%"
  div.style.transform = "translateX(-50%)"
  div.style.zIndex = "3333"

  div.innerText = "🚀🚀🚀正在自动跳转...(插件触发)"
  document.body.appendChild(div)

  const urlSearchParams = new URLSearchParams(window.location.search)

  const target = urlSearchParams.get("target")
  target && winReplay(target)
})

function winReplay(url) {
  setTimeout(() => {
    window.location.replace(url)
  }, 0)
}
