import { useEffect, useState } from "react"

import Header from "./components/header"
import Loading from "./components/loading"

import "./style.css"

function IndexPopup() {
  const [inputVal, setInputVal] = useState("")
  const [selectText, setSelectText] = useState("")
  const [transSelectText, setTransSelectText] = useState("")
  const [translateInputVal, setTranslateInputVal] = useState("")
  const [mode, setMode] = useState("select-text")
  const [loading, setLoading] = useState(true)
  function translateSelectText() {
    chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
      // to content
      chrome.tabs.sendMessage(tabs[0].id, { type: "getSelectText" }, (res) => {
        console.log("content-->popup", res)
        const { to, from } = res
        if (!to) {
          setMode("manual-input")
        } else {
          setSelectText(from)
          setTransSelectText(to)
        }
        setLoading(false)
      })
    })
  }

  useEffect(() => {
    setTimeout(() => {
      translateSelectText()
    }, 1000)
  }, [])

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

    // chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
    //   chrome.tabs.sendMessage(tabs[0].id, {}, (_) => {
    //     // setTranslateInputVal(res)
    //   })
    // })
  }

  function handleCopy(text) {
    text && navigator.clipboard.writeText(text)
  }
  return (
    <>
      <Header />
      <div className="w-80 text-center flex flex-col justify-between bg-indigo-400 p-3 ">
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
        <a
          href="https://docs.plasmo.com"
          target="_blank"
          className="text-right">
          power by plasmo
        </a>
      </div>
    </>
  )
}

export default IndexPopup
