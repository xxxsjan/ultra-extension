import translate from "./scripts/translate"

export {}

console.log("❤️ ❤️ background.js")

chrome.runtime.onMessage.addListener((request, sender, cb) => {
  console.log("request.action: ", request.action)

  if (request.action === "translate") {
    translate(request.payload.text).then(cb)
  }

  if (request.action === "getLocalStorage") {
  
  }
  return true
})

// 获取cookie
async function getCookie(name) {
  const cookies = await chrome.cookies.getAll({ domain: ".lkcoffee.com" })
  console.log("service worker cookies--->", cookies)
}
