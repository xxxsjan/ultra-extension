import { useState, type KeyboardEvent } from "react"

import Footer from "~components/footer"
import baiduTranslate from "~scripts/baidu"
import showNotification from "~scripts/showNotification"

import "./popup.css"

function IndexPopup() {
  const [inputVal, setInputVal] = useState("")
  const [transSelectText, setTransSelectText] = useState("")
  const [loading, setLoading] = useState(false)

  function to1s() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const currentTab = tabs[0]
      const tabId = currentTab.id
      const currentUrl = new URL(currentTab.url)
      const { host } = currentUrl

      if (host !== "github.com") {
        showNotification({
          title: "提示",
          message: "当前不在github站点"
        })
        return
      }

      chrome.tabs.sendMessage(tabId, {
        action: "redirect"
      })
    })
  }

  async function translate() {
    if (!inputVal.trim()) {
      showNotification({
        title: "提示",
        message: "请输入内容"
      })
      return
    }

    setLoading(true)
    try {
      const res = await baiduTranslate(inputVal)
      if (res?.error_code) {
        showNotification({
          title: "百度翻译接口出错",
          message: res.error_msg
        })
        return
      }
      const text = Array.isArray(res?.trans_result)
        ? res.trans_result.map((m) => m.dst).filter(Boolean).join("\n")
        : ""
      if (!text) {
        showNotification({
          title: "翻译失败",
          message: "接口未返回翻译结果"
        })
        return
      }
      setTransSelectText(text)
    } catch (err) {
      showNotification({
        title: "翻译失败",
        message: err?.error_msg || err?.message || "翻译失败"
      })
    } finally {
      setLoading(false)
    }
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault()
      translate()
    }
  }

  return (
    <div className="popup-page">
      {loading && (
        <div className="popup-loading" aria-live="polite">
          <div className="popup-spinner" />
          <span>翻译中…</span>
        </div>
      )}

      <header className="popup-top">
        <div>
          <p className="popup-brand">工具集</p>
          <h1 className="popup-title">快速翻译</h1>
        </div>
        <a href="options.html" target="_blank" className="popup-settings" rel="noreferrer">
          设置
        </a>
      </header>

      <div className="popup-body">
        <label className="popup-field">
          <span className="popup-label">英文原文</span>
          <textarea
            className="popup-textarea"
            placeholder="输入要翻译的英文，Ctrl + Enter 提交"
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={onInputKeyDown}
            value={inputVal}
            rows={3}
          />
        </label>

        <div className="popup-actions">
          <button className="popup-btn popup-btn-primary" onClick={translate} disabled={loading}>
            翻译
          </button>
          <button
            className="popup-btn popup-btn-secondary"
            onClick={to1s}
            title="在 GitHub 页面跳转到 github1s">
            跳转 1s
          </button>
        </div>

        <label className="popup-field">
          <span className="popup-label">中文结果</span>
          <textarea
            className="popup-textarea popup-textarea-result"
            placeholder="翻译结果会显示在这里"
            rows={4}
            readOnly
            value={transSelectText}
          />
        </label>
      </div>

      <Footer />
    </div>
  )
}

export default IndexPopup
