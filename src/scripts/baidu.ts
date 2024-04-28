const MD5 = require("crypto-js/md5")

require("dotenv").config()

const APP_ID = process.env.APP_ID
const API_KEY = process.env.API_KEY

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
  if (!APP_ID || !API_KEY) {
    console.log(APP_ID, API_KEY)
    return
  }
  // 设置请求参数
  const params: BaiduParams = {
    q: text,
    from: "en",
    to: "zh",
    appid: APP_ID,
    salt: '1435660288',
    sign: ""
  }

  // 生成签名
  params.sign = baiduTranslateSign(params.appid, params.q, params.salt, API_KEY)
  console.log("params: ", params)

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

// 对象转请求字符串
function stringify(obj) {
  return Object.keys(obj)
    .map((key) => {
      return `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`
    })
    .join("&")
}
function baiduTranslateSign(appId, query, salt, key) {
  const str1 = appId + query + salt + key
  const str2 = MD5(str1).toString()
  return str2
}

export default translate
