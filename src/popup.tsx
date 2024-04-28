import { useEffect, useState } from "react"

import icon from "../assets/icon.development.png"
import Footer from "./components/footer"
import Header from "./components/header"
import Loading from "./components/loading"

import "./style.css"

console.log("icon: ", icon)

function IndexPopup() {
  const [inputVal, setInputVal] = useState("")
  const [selectText, setSelectText] = useState("")
  const [transSelectText, setTransSelectText] = useState("")
  const [translateInputVal, setTranslateInputVal] = useState("")
  const [mode, setMode] = useState("select-text")
  const [loading, setLoading] = useState(true)
  // function translateSelectText() {
  //   chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
  //     chrome.tabs.sendMessage(tabs[0].id, { type: "getSelectText" }, (res) => {
  //       console.log("content-->popup", res)
  //       const { to, from } = res
  //       if (!to) {
  //         setMode("manual-input")
  //       } else {
  //         setSelectText(from)
  //         setTransSelectText(to)
  //       }
  //       setLoading(false)
  //     })
  //   })
  // }

  useEffect(() => {}, [])

  async function onInputTranslate() {
    setLoading(true)
    console.log(inputVal)
    if (!inputVal) {
      console.warn("请输入内容")
      return
    }
    chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: "translate", data: { text: inputVal } },
        (res) => {
          console.log("content-->popup", res)
          const { to, from } = res
          if (from) {
            setTranslateInputVal(to)
          }
          setLoading(false)
        }
      )
    })
  }

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
      {/* <div className="w-80 text-center flex flex-col justify-between bg-indigo-400 p-3 ">
        {loading && <Loading text="查询中"></Loading>}
        {mode === "select-text" && (
          <div className="w-full h-full">
            <div className="text-left">
              <span className="text-base">翻译已选文字的结果：</span>
            </div>
            <p className="m-5 h-60 bg-white text-base text-left">
              {transSelectText}
            </p>
            <div className="flex justify-around">
              <button
                className="btn-primary bg-blue-400"
                onClick={() => setMode("manual-input")}>
                输入翻译
              </button>
              <button
                className="btn-primary bg-green-400"
                onClick={() => handleCopy(transSelectText)}>
                复制结果
              </button>
            </div>
          </div>
        )}
        {mode === "manual-input" && (
          <div className="w-full h-full">
            <div className="text-left mb-5">
              <span className="text-base">手动输入：</span>
            </div>
            <textarea
              style={{ width: "87%" }}
              className="text-base "
              onChange={(e) => setInputVal(e.target.value)}
              value={inputVal}
              rows={3}
              placeholder="输入要翻译的内容"
            />
            <div className="m-5 h-60 bg-white text-base  text-left">
              {translateInputVal}
            </div>
            <div className="flex justify-around">
              <button
                className="btn-primary"
                onClick={() => onInputTranslate()}>
                翻译
              </button>
              <button className="btn-primary">复制</button>
            </div>
          </div>
        )}
      </div> */}

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
          <button id="dyBtn" className="btn btn-neutral">
            获取抖音消息
          </button>

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
