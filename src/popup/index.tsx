import { useEffect, useState } from "react"

import Footer from "~components/footer"
import Header from "~components/header"
import Loading from "~components/loading"
import showNotification from "~scripts/showNotification"

import "./popup.css"

import { chown } from "fs"

function IndexPopup() {
  const [inputVal, setInputVal] = useState("")

  const [transSelectText, setTransSelectText] = useState("")

  const [loading, setLoading] = useState(false)

  useEffect(() => {
  
  }, [])

  function to1s() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const currentTab = tabs[0]
      console.log("currentTab: ", currentTab)
      const tabId = currentTab.id

      var currentUrl = new URL(currentTab.url)

      const { protocol, pathname, host } = currentUrl
      console.log("host: ", host)

      if (host !== "github.com") {
        showNotification({
          title: "提示",
          message: "当前不在github站点"
        })
        return
      }
      const newUrl = `${protocol}//${host.replace(
        "github",
        "github1s"
      )}${pathname}`

      chrome.tabs.sendMessage(tabId, {
        action: "redirect",
        url: newUrl
      })
    })
  }
  function translate() {
    if (!inputVal) {
      showNotification({
        title: "提示",
        message: "请输入内容"
      })
      return
    }

    setLoading(true)

    chrome.runtime.sendMessage(
      {
        action: "translate",
        payload: {
          text: inputVal
        }
      },
      (res) => {
        console.log(res)
        if (res.error_code) {
          showNotification({
            title: "百度翻译接口出错",
            message: res.error_msg
          })
        } else {
          setTransSelectText(res.trans_result.map((m) => m.dst).join("\n"))
        }
        setLoading(false)
      }
    )
  }
  async function connectTab() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    })
    const connect = chrome.tabs.connect(tab.id, {
      name: "test-connect-send"
    })
    connect.postMessage("popup: connect-msg")
    connect.onMessage.addListener((mess) => {
      console.log(mess)
    })
  }
  return (
    <>
      {/* <Header /> */}{" "}
      <div className="flex justify-end m-4">
        <a href="options.html" target="_blank" className="link link-info">
          设置
        </a>
      </div>
      {loading && <Loading text="查询中"></Loading>}
      <div className="popup-body">
        <div className="flex gap-2 mb-4">
          <textarea
            className="inputArea textarea textarea-accent w-full "
            placeholder=""
            onChange={(e) => setInputVal(e.target.value)}
            value={inputVal}></textarea>
          <button className="btn" onClick={translate}>
            翻译
          </button>
        </div>

        <div role="alert" className="alert mb-4">
          <pre className="text-left"> {transSelectText} </pre>
        </div>

        <div className="flex justify-between">
          <button className="btn btn-neutral">获取抖音消息</button>

          <div className="tooltip" data-tip="跳转编辑器查看">
            <button className="btn" onClick={to1s}>
              跳转1s
            </button>
          </div>
        </div>

        {/* <button id="toBg" className="btn">toBg</button>   */}
      </div>
      <Footer />
    </>
  )
}

export default IndexPopup
