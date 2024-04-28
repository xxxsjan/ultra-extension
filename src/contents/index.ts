export {}
console.log("❤️ common content.js")
// 浏览器环境
chrome.runtime.onMessage.addListener((payload, sender, popupCb) => {
  console.log("popup-->content", payload)
  const { type } = payload
  console.log("type: ", type)
  // if (type === "getSelectText") {
  //   const text = window.getSelection().toString() || ""
  //   console.log("浏览器复制的内容: ", text)
  //   if (text) {
  //     // to background 会收到消息
  //     chrome.runtime.sendMessage({ text, origin: "content" }, (res) => {
  //       console.log("background-->content", res)
  //       // 这里可以dom操作
  //       popupCb({ from: text, to: res })
  //     })
  //   } else {
  //     popupCb({ from: "", to: "" })
  //   }
  // } else if (type === "translate") {
  //   chrome.runtime.sendMessage(
  //     { text: message.data.text, origin: "content" },
  //     (res) => {
  //       console.log("background-->content", res)
  //       // 这里可以dom操作
  //       popupCb({ from: message.data.text, to: res })
  //     }
  //   )
  // }
  return true
})

chrome.runtime.onConnect.addListener((port) => {
  console.log("port: ", port)
  if (port.name === "test-connect-send") {
    port.onMessage.addListener((msg) => {
      console.log(msg)
    })
    port.postMessage("content: 收到")
  }
})
