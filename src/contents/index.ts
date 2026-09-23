export {}
console.log("❤️ content.js")
// 浏览器环境
chrome.runtime.onMessage.addListener((payload, sender, sendResponse) => {
  console.log("popup-->content", payload)
  const { type, action } = payload

  // 只处理本脚本关心的消息，其它交给 background，避免抢占 sendResponse
  if (!type && action !== "redirect") {
    return false
  }

  // if (type === "getSelectText") {
  //   ...
  // }
  return false
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
