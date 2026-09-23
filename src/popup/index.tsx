import { useState, type KeyboardEvent } from "react"

import baiduTranslate from "~scripts/baidu"
import showNotification from "~scripts/showNotification"

import "./popup.css"

const VERSION = "0.0.1"

const FEATURES = [
  {
    key: "settings",
    label: "扩展设置",
    desc: "配置密钥",
    href: "options.html"
  },
  {
    key: "live",
    label: "直播助手",
    desc: "弹幕 / 省流",
    href: "https://www.douyin.com/"
  },
  {
    key: "github1s",
    label: "GitHub1s",
    desc: "在线看代码",
    href: "https://github.com/"
  },
  {
    key: "docs",
    label: "使用说明",
    desc: "项目 README",
    href: "https://github.com/xxxsjan/ultra-extension"
  }
] as const

function IndexPopup() {
  const [inputVal, setInputVal] = useState("")
  const [transSelectText, setTransSelectText] = useState("")
  const [loading, setLoading] = useState(false)

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
    } catch (err: any) {
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

  function clearAll() {
    setInputVal("")
    setTransSelectText("")
  }

  return (
    <div className="popup-page">
      {loading && (
        <div className="popup-loading" aria-live="polite">
          <div className="popup-spinner" />
          <span>翻译中…</span>
        </div>
      )}

      <header className="popup-brandbar">
        <div className="popup-logo" aria-hidden="true">
          U
        </div>
        <div className="popup-brand-text">
          <strong>工具集</strong>
          <span>日常翻译与网页小工具</span>
        </div>
      </header>

      <div className="popup-lang">
        <div className="popup-lang-chip">
          <span>英语</span>
          <small>English</small>
        </div>
        <span className="popup-lang-arrow" aria-hidden="true">
          →
        </span>
        <div className="popup-lang-chip">
          <span>简体中文</span>
          <small>zh-CN</small>
        </div>
      </div>

      <section className="popup-panel">
        <div className="popup-service">
          <span className="popup-service-label">翻译服务</span>
          <div className="popup-service-value">
            <i className="popup-service-dot" aria-hidden="true" />
            <span>百度翻译</span>
          </div>
        </div>

        <label className="popup-field">
          <span className="popup-label">原文</span>
          <textarea
            className="popup-textarea"
            placeholder="输入英文，Ctrl + Enter 翻译"
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={onInputKeyDown}
            value={inputVal}
            rows={3}
          />
        </label>

        <label className="popup-field popup-field-result">
          <span className="popup-label">译文</span>
          <textarea
            className="popup-textarea popup-textarea-result"
            placeholder="翻译结果会显示在这里"
            rows={3}
            readOnly
            value={transSelectText}
          />
        </label>
      </section>

      <div className="popup-cta-row">
        <button
          type="button"
          className="popup-icon-btn"
          onClick={clearAll}
          title="清空"
          aria-label="清空内容">
          x
        </button>
        <button
          type="button"
          className="popup-cta"
          onClick={translate}
          disabled={loading}>
          {loading ? "翻译中…" : "翻译 (Ctrl+Enter)"}
        </button>
      </div>
 
      <footer className="popup-foot">
        <a href="options.html" target="_blank" rel="noreferrer" className="popup-foot-link">
          ⚙ 设置
        </a>
        <span className="popup-foot-ver">V {VERSION}</span>
        <a
          href="https://github.com/xxxsjan/ultra-extension"
          target="_blank"
          rel="noreferrer"
          className="popup-foot-link">
          GitHub
        </a>
      </footer>
    </div>
  )
}

export default IndexPopup
