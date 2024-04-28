import { useEffect, useState } from "react"

import Footer from "~components/footer"
import Header from "~components/header"
import Loading from "~components/loading"

import icon from "../../assets/icon.development.png"

import "./popup.css"

function IndexPopup() {
  const [inputVal, setInputVal] = useState("")

  const [transSelectText, setTransSelectText] = useState("")

  const [loading, setLoading] = useState(false)

  useEffect(() => {}, [])

  function handleCopy(text) {
    text && navigator.clipboard.writeText(text)
  }

  function to1s() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const currentTab = tabs[0]
      console.log("currentTab: ", currentTab)
      const tabId = currentTab.id

      var currentUrl = new URL(currentTab.url)

      const { protocol, pathname, host } = currentUrl
      console.log("host: ", host)

      if (host !== "github.com") {
        chrome.notifications.create(
          {
            type: "basic",
            title: "提示",
            message: "当前不在github站点",
            iconUrl: icon
          },
          (notificationId) => {
            console.log("notificationId-->", notificationId)
          }
        )
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
        setTransSelectText(res.trans_result[0].dst)
        setLoading(false)
      }
    )
  }
  async function sendByTab() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    })
    console.log("tab", tab)
    if (tab) {
      chrome.tabs.sendMessage(tab.id, {
        action: "fromPopup2Content"
      })
    }
  }
  return (
    <>
      {/* <Header /> */}
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
          <span className="translate-result">{transSelectText} </span>
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
