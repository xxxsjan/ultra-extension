import translate from "./scripts/translate"

export {}

console.log("%cHELLO WORLD FROM BGSCRIPTS", "background-color:pink")

chrome.runtime.onMessage.addListener((message, sender, contentCb) => {
  console.log("content-->background", message)
  translate(message.text).then((res) => {
    console.log("after translate", res)
    contentCb(res)
  })
  return true
})
