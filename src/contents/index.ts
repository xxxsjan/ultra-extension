export {}

chrome.runtime.onMessage.addListener((message, sender, popupCb) => {
  console.log("popup-->content", message)
  const { type } = message
  if (type === "getSelectText") {
    const text = window.getSelection().toString() || ""
    if (text) {
      chrome.runtime.sendMessage({ text, origin: "content" }, (res) => {
        console.log("background-->content", res)
        // 这里可以dom操作
        popupCb({ from: text, to: res })
      })
    } else {
      popupCb({ from: "", to: "" })
    }
  }
  return true
})
console.log(chrome)
