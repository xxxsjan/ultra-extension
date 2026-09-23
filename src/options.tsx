import { useEffect, useState } from "react"

import showNotification from "~scripts/showNotification"

import "./options.css"

function IndexOptions() {
  const [appid, setAppid] = useState("")
  const [key, setKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)

  function handleSave() {
    if (!appid.trim() || !key.trim()) {
      showNotification({
        title: "提示",
        message: "请填写完整的 APP ID 和密钥"
      })
      return
    }
    setSaving(true)
    chrome.storage.local.set({ APP_ID: appid.trim(), API_KEY: key.trim() }, () => {
      setSaving(false)
      showNotification({
        title: "已保存",
        message: "百度翻译配置已更新"
      })
    })
  }

  function clearCache() {
    chrome.storage.local.remove(["APP_ID", "API_KEY"], () => {
      setAppid("")
      setKey("")
      showNotification({
        title: "已清除",
        message: "翻译配置已清空"
      })
    })
  }

  useEffect(() => {
    chrome.storage.local.get(["APP_ID", "API_KEY"], (result) => {
      result.APP_ID && setAppid(result.APP_ID)
      result.API_KEY && setKey(result.API_KEY)
    })
  }, [])

  return (
    <div className="options-page">
      <div className="options-shell">
        <header className="options-header">
          <h1 className="options-title">服务配置</h1>
          <p className="options-desc">
            配置百度翻译 APP ID 与密钥。抖音直播弹幕请在直播间页面面板中设置。
          </p>
        </header>

        <section className="options-panel">
          <div className="options-panel-head">
            <div>
              <h2 className="options-panel-title">百度翻译</h2>
              <p className="options-panel-sub">凭证仅保存在本地浏览器</p>
            </div>
            <a
              className="options-link"
              href="https://fanyi-api.baidu.com/choose"
              target="_blank"
              rel="noreferrer">
              申请服务
            </a>
          </div>

          <label className="options-field">
            <span className="options-label">APP ID</span>
            <input
              type="text"
              value={appid}
              onChange={(e) => setAppid(e.target.value)}
              placeholder="例如 20210111000668810"
              className="options-input"
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          <label className="options-field">
            <span className="options-label">密钥</span>
            <div className="options-input-row">
              <input
                type={showKey ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="输入百度翻译密钥"
                className="options-input"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                className="options-ghost-btn"
                onClick={() => setShowKey((v) => !v)}>
                {showKey ? "隐藏" : "显示"}
              </button>
            </div>
          </label>

          <div className="options-actions">
            <button
              type="button"
              className="options-btn options-btn-primary"
              onClick={handleSave}
              disabled={saving}>
              {saving ? "保存中…" : "保存配置"}
            </button>
            <button
              type="button"
              className="options-btn options-btn-secondary"
              onClick={clearCache}>
              清除翻译配置
            </button>
          </div>
        </section>

        <p className="options-footnote">
          修改后无需重启扩展，保存即可在弹窗翻译中使用。
        </p>
      </div>
    </div>
  )
}

export default IndexOptions
