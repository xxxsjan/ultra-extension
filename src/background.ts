import translate from "./scripts/translate"

export {}

console.log("❤️ ❤️ background.js")

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("request.action: ", request.action)

  if (request.action === "translate") {
    translate(request.payload.text)
      .then((data) => sendResponse(data))
      .catch((err) =>
        sendResponse(err || { error_code: "UNKNOWN", error_msg: "翻译失败" })
      )
    return true
  }

  return false
})

// 获取cookie
async function getCookie(name) {
  const cookies = await chrome.cookies.getAll({ domain: ".lkcoffee.com" })
  console.log("service worker cookies--->", cookies)
}
