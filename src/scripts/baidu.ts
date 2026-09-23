const MD5 = require("crypto-js/md5")

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
      const appid = result.APP_ID
      const key = result.API_KEY

      if (!appid || !key) {
        reject({
          error_code: "MISSING_KEY",
          error_msg: "未设置百度翻译 APP_ID / API_KEY，请到设置页填写"
        })
        return
      }

      const params: BaiduParams = {
        q: text,
        from: "en",
        to: "zh",
        appid,
        salt: String(Date.now()),
        sign: ""
      }

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
      return Promise.reject({
        error_code: "NETWORK_ERROR",
        error_msg: error?.message || "网络请求失败"
      })
    })
}

function baiduTranslateSign(appId, query, salt, key) {
  const str1 = appId + query + salt + key
  const str2 = MD5(str1).toString()
  return str2
}

export default translate
