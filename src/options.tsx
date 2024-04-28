import { useEffect, useState } from "react"

import showNotification from "~scripts/showNotification"

import "./styles/tailwind.css"

function IndexOptions() {
  const [appid, setAppid] = useState("")
  const [key, setKey] = useState("")

  function handleSave() {
    appid && chrome.storage.local.set({ APP_ID: appid })
    key && chrome.storage.local.set({ API_KEY: key })
  }
  function clearCache() {
    chrome.storage.local.clear()
    alert("清除缓存成功")
  }
  useEffect(() => {
    chrome.storage.local.get(["APP_ID", "API_KEY"], (result) => {
      console.log("result: ", result)
      result.APP_ID && setAppid(result.APP_ID)
      result.API_KEY && setKey(result.API_KEY)
    })
  }, [])

  return (
    <div className="w-[320px] flex flex-col items-center justify-center h-screen m-auto text-xl">
      <div role="tablist" className="tabs tabs-boxed">
        <a role="tab" className="tab tab-active">
          百度翻译
        </a>
        <a role="tab" className="tab">
          其他
        </a>
      </div>
      <div className="mb-4 w-full">
        <div className="w-[100px]">appid</div>
        <input
          type="text"
          value={appid}
          onChange={(e) => setAppid(e.target.value)}
          placeholder="Type here"
          className="input input-bordered w-full max-w-xs"
        />
      </div>
      <div className="mb-4 w-full">
        <div className="w-[100px]">key</div>
        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Type here"
          className="input input-bordered w-full max-w-xs"
        />
      </div>
      <div className="mb-4">
        <a
          className="link link-primary text-sm"
          href=" https://fanyi-api.baidu.com/choose">
          百度翻译服务申请
        </a>
      </div>
      <div className="flex  justify-between w-full">
        <button className="btn btn-neutral" onClick={handleSave}>
          保存
        </button>

        <button className="btn btn-neutral" onClick={() => clearCache()}>
          清除本地缓存
        </button>
      </div>
    </div>
  )
}

export default IndexOptions
