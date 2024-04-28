const MD5 = require("crypto-js/md5")

// require("dotenv").config()

// const APP_ID = process.env.APP_ID
// const API_KEY = process.env.API_KEY

type BaiduParams = {
  q: string
  from: string
  to: string
  appid: string
  salt: string
  sign: string
}

// https://fanyi-api.baidu.com/doc/21
function translate(text) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["APP_ID", "API_KEY"], (result) => {
      if (!result.APP_ID || !result.API_KEY) {
        console.warn("未设置key")
        return
      }
      // const appid = result.APP_ID
      // const key = result.API_KEY

      const appid = "201506300000001"
      const key = "12345678"

      // 设置请求参数
      const params: BaiduParams = {
        q: text,
        from: "en",
        to: "zh",
        appid,
        salt: "1435660288",
        sign: ""
      }

      // 生成签名
      params.sign = baiduTranslateSign(params.appid, params.q, params.salt, key)
      baiduApi(params).then(resolve, reject)
    })
  })
}
function baiduApi(params) {
  const formData = new URLSearchParams(params)

  return fetch("https://fanyi-api.baidu.com/api/trans/vip/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: formData
  })
    .then((response) => response.json())
    .catch((error) => {
      console.error("Error:", error)
    })
}

function baiduTranslateSign(appId, query, salt, key) {
  const str1 = appId + query + salt + key
  const str2 = MD5(str1).toString()
  return str2
}

export default translate
