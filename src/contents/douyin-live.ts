import type { PlasmoCSConfig } from "plasmo"

import {
  DOUYIN_DEFAULTS,
  DOUYIN_KEYS,
  SAVE_DATA_PENDING_KEY,
  getDouyinConfig,
  type DouyinDanmakuConfig
} from "~scripts/douyin-config"

export const config: PlasmoCSConfig = {
  matches: ["https://www.douyin.com/*", "https://live.douyin.com/*"],
  run_at: "document_idle"
}

const PANEL_ID = "ultra-douyin-danmaku-panel"

let timer: ReturnType<typeof setInterval> | null = null
let sending = false
let panel: HTMLDivElement | null = null
let running = false
let saveDataOn = false
let bootedForHref = ""
let saveDataPending = false


function isLivePage() {
  const href = location.href
  const path = location.pathname
  return (
    /\/live(\/|$)/.test(path) ||
    /(^|\.)live\.douyin\.com$/i.test(location.hostname) ||
    /douyin\.com\/.*live/i.test(href)
  )
}

function storageKeys() {
  return [
    DOUYIN_KEYS.TEXT,
    DOUYIN_KEYS.INTERVAL,
    DOUYIN_KEYS.RUNNING,
    DOUYIN_KEYS.SAVE_DATA
  ]
}

function findChatInput(): HTMLElement | null {
  const selectors = [
    'textarea[placeholder*="说点什么"]',
    'textarea[placeholder*="弹幕"]',
    'input[placeholder*="说点什么"]',
    'input[placeholder*="弹幕"]',
    '[contenteditable="true"][data-placeholder*="说点"]',
    '[contenteditable="true"][placeholder*="说点"]',
    ".webcast-chatroom___input-container textarea",
    ".webcast-chatroom___input-container [contenteditable='true']",
    "[class*='chat'] textarea",
    "[class*='Chat'] textarea"
  ]

  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (el instanceof HTMLElement && isVisible(el)) return el
  }

  const editables = Array.from(
    document.querySelectorAll('[contenteditable="true"]')
  ) as HTMLElement[]
  return editables.find((el) => isVisible(el) && el.offsetHeight > 0) || null
}

function findSendButton(): HTMLElement | null {
  const buttons = Array.from(
    document.querySelectorAll("button, div[role='button']")
  )
  for (const btn of buttons) {
    if (!(btn instanceof HTMLElement) || !isVisible(btn)) continue
    const text = (btn.textContent || "").trim()
    if (text === "发送" || text === "發送") return btn
  }
  return null
}

function isVisible(el: HTMLElement) {
  const style = window.getComputedStyle(el)
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0" &&
    el.getClientRects().length > 0
  )
}

function setNativeValue(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string
) {
  const proto =
    el.tagName === "TEXTAREA"
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  const desc = Object.getOwnPropertyDescriptor(proto, "value")
  desc?.set?.call(el, value)
  el.dispatchEvent(new Event("input", { bubbles: true }))
  el.dispatchEvent(new Event("change", { bubbles: true }))
}

function fillInput(el: HTMLElement, text: string) {
  el.focus()
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    setNativeValue(el, text)
    return
  }
  el.textContent = text
  el.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      data: text,
      inputType: "insertText"
    })
  )
}

function pressEnter(el: HTMLElement) {
  const opts = {
    key: "Enter",
    code: "Enter",
    keyCode: 13,
    which: 13,
    bubbles: true
  }
  el.dispatchEvent(new KeyboardEvent("keydown", opts))
  el.dispatchEvent(new KeyboardEvent("keypress", opts))
  el.dispatchEvent(new KeyboardEvent("keyup", opts))
}

async function sendOnce(text: string) {
  if (sending || !text.trim()) return
  sending = true
  try {
    const input = findChatInput()
    if (!input) {
      updatePanelStatus("未找到输入框，稍后重试")
      return
    }
    fillInput(input, text.trim())
    await sleep(120)
    const sendBtn = findSendButton()
    if (sendBtn) {
      sendBtn.click()
    } else {
      pressEnter(input)
    }
    updatePanelStatus(`已发送 · ${new Date().toLocaleTimeString()}`)
  } finally {
    sending = false
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function stopAutoSendQuiet() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function readPanelConfig(): DouyinDanmakuConfig {
  const textEl = panel?.querySelector(
    '[data-field="text"]'
  ) as HTMLTextAreaElement | null
  const intervalEl = panel?.querySelector(
    '[data-field="interval"]'
  ) as HTMLInputElement | null
  const intervalRaw = Number(intervalEl?.value)
  return {
    text: (textEl?.value || "").trim(),
    interval:
      Number.isFinite(intervalRaw) && intervalRaw > 0
        ? intervalRaw
        : DOUYIN_DEFAULTS.INTERVAL,
    running,
    saveData: saveDataOn
  }
}

function persistPanelConfig() {
  const cfg = readPanelConfig()
  chrome.storage.local.set({
    [DOUYIN_KEYS.TEXT]: cfg.text,
    [DOUYIN_KEYS.INTERVAL]: Math.max(3, cfg.interval),
    [DOUYIN_KEYS.SAVE_DATA]: saveDataOn
  })
}

function fillPanelFields(cfg: DouyinDanmakuConfig) {
  const textEl = panel?.querySelector(
    '[data-field="text"]'
  ) as HTMLTextAreaElement | null
  const intervalEl = panel?.querySelector(
    '[data-field="interval"]'
  ) as HTMLInputElement | null
  if (textEl && textEl.value !== cfg.text) textEl.value = cfg.text
  if (intervalEl) {
    intervalEl.value = String(cfg.interval || DOUYIN_DEFAULTS.INTERVAL)
  }
}

function stopAutoSend() {
  stopAutoSendQuiet()
  running = false
  chrome.storage.local.set({ [DOUYIN_KEYS.RUNNING]: false })
  updatePanelStatus("已关闭自动发送")
  syncToggle(false)
  setFieldsDisabled(false)
}

function startAutoSend(cfg: DouyinDanmakuConfig) {
  stopAutoSendQuiet()
  if (!cfg.text.trim()) {
    running = false
    chrome.storage.local.set({ [DOUYIN_KEYS.RUNNING]: false })
    updatePanelStatus("请先填写弹幕内容")
    syncToggle(false)
    setFieldsDisabled(false)
    return
  }
  const seconds = Math.max(3, cfg.interval)
  const ms = seconds * 1000
  running = true
  chrome.storage.local.set({
    [DOUYIN_KEYS.RUNNING]: true,
    [DOUYIN_KEYS.TEXT]: cfg.text.trim(),
    [DOUYIN_KEYS.INTERVAL]: seconds
  })
  updatePanelStatus(`已开启 · 每 ${seconds} 秒`)
  syncToggle(true)
  setFieldsDisabled(true)
  setTimeout(() => sendOnce(cfg.text), 800)
  timer = setInterval(() => {
    const latest = readPanelConfig().text || cfg.text
    sendOnce(latest)
  }, ms)
}

function toggleAutoSend() {
  if (running) {
    stopAutoSend()
    return
  }
  persistPanelConfig()
  const cfg = readPanelConfig()
  if (cfg.interval < 3) {
    updatePanelStatus("发送间隔至少 3 秒")
    return
  }
  startAutoSend(cfg)
}

/* ---------------- 省流：网络层拦截拉流（真正停流量） ---------------- */

function killAllMediaElements() {
  document.querySelectorAll("video, audio").forEach((node) => {
    const el = node as HTMLMediaElement
    try {
      el.pause()
      el.muted = true
      el.volume = 0
      el.srcObject = null
      el.removeAttribute("src")
      el.load()
    } catch {
      // ignore
    }
  })
}

function ensureSaveStyle() {
  const id = "ultra-douyin-save-data-style"
  if (document.getElementById(id)) return
  const style = document.createElement("style")
  style.id = id
  style.textContent = `
    video, audio {
      opacity: 0 !important;
      pointer-events: none !important;
      max-height: 0 !important;
    }
  `
  document.documentElement.appendChild(style)
}

function removeSaveStyle() {
  document.getElementById("ultra-douyin-save-data-style")?.remove()
}

function isExtensionContextDead(err?: unknown) {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : String(err || "")
  return /Extension context invalidated|context invalidated/i.test(msg)
}

function friendlyExtError(raw?: string) {
  if (!raw) return "扩展后台无响应，请刷新页面后重试"
  if (isExtensionContextDead(raw)) {
    return "扩展已热更新，请刷新页面后再操作"
  }
  return raw
}

function markSaveDataPending(enabled: boolean) {
  try {
    sessionStorage.setItem(SAVE_DATA_PENDING_KEY, enabled ? "1" : "0")
  } catch {
    // ignore
  }
}

function writeSaveDataMemory(enabled: boolean): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.set({ [DOUYIN_KEYS.SAVE_DATA]: enabled }, () => {
        if (chrome.runtime.lastError) {
          resolve(false)
          return
        }
        resolve(true)
      })
    } catch {
      resolve(false)
    }
  })
}

function requestSaveData(
  enabled: boolean,
  extra?: { skipInject?: boolean }
): Promise<{ ok: boolean; error_msg?: string }> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        {
          action: "douyin-save-data",
          payload: { enabled, skipInject: Boolean(extra?.skipInject) }
        },
        (res) => {
          if (chrome.runtime.lastError) {
            resolve({
              ok: false,
              error_msg: friendlyExtError(chrome.runtime.lastError.message)
            })
            return
          }
          resolve(res || { ok: false, error_msg: "无响应" })
        }
      )
    } catch (err: any) {
      resolve({
        ok: false,
        error_msg: friendlyExtError(err?.message || "发送消息失败")
      })
    }
  })
}

/**
 * 切换省流并刷新：
 * - 开：挂拦截 → 刷新 → 不播视频只留弹幕
 * - 关：清干净拦截规则 → 刷新 → 页面原样，不跑拦截脚本
 */
async function setSaveDataAndReload(enabled: boolean) {
  if (saveDataPending) return
  saveDataPending = true
  updatePanelStatus(enabled ? "开启省流并刷新…" : "关闭省流，恢复播放…")

  markSaveDataPending(enabled)
  saveDataOn = enabled

  try {
    const stored = await writeSaveDataMemory(enabled)
    if (stored) {
      // 关闭时必须等规则清完再刷新，否则旧规则会继续拦视频
      const res = await requestSaveData(enabled, { skipInject: true })
      if (!res.ok) {
        console.warn("省流规则同步未完成，仍刷新", res.error_msg)
      }
    } else {
      updatePanelStatus("扩展已热更新，正在刷新并应用…")
    }
  } catch (err) {
    console.error(err)
    updatePanelStatus(
      isExtensionContextDead(err)
        ? "扩展已热更新，正在刷新并应用…"
        : "正在刷新页面…"
    )
  }

  try {
    location.reload()
  } catch {
    saveDataPending = false
    updatePanelStatus("请手动刷新页面以完成省流切换")
  }
}

function toggleSaveData() {
  setSaveDataAndReload(!saveDataOn)
}

function removePanel() {
  const existing = document.getElementById(PANEL_ID)
  existing?.remove()
  panel = null
}

function styleLabel(el: HTMLElement) {
  Object.assign(el.style, {
    display: "block",
    marginBottom: "4px",
    fontSize: "11px",
    opacity: "0.75",
    fontWeight: "600"
  })
}

function styleControl(el: HTMLElement) {
  Object.assign(el.style, {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: "8px",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    fontFamily: "inherit",
    fontSize: "12px",
    outline: "none"
  })
}

function styleActionBtn(btn: HTMLButtonElement, bg: string) {
  Object.assign(btn.style, {
    width: "100%",
    height: "36px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "13px",
    background: bg,
    color: "#fff",
    marginTop: "8px"
  })
}

function ensurePanel() {
  if (!isLivePage()) {
    removePanel()
    return null
  }

  const existing = document.getElementById(PANEL_ID)
  if (existing instanceof HTMLDivElement) {
    panel = existing
    return panel
  }

  panel = document.createElement("div")
  panel.id = PANEL_ID
  panel.innerHTML = `
    <div class="ultra-dy-title">工具集 · 直播助手</div>
    <div class="ultra-dy-status">待命</div>
    <label class="ultra-dy-field">
      <span>弹幕内容</span>
      <textarea data-field="text" rows="3" placeholder="输入要自动发送的内容"></textarea>
    </label>
    <label class="ultra-dy-field">
      <span>发送间隔（秒）</span>
      <input data-field="interval" type="number" min="3" step="1" />
    </label>
    <button type="button" data-act="toggle">开启自动发送</button>
    <button type="button" data-act="save-data">开启省流</button>
  `

  Object.assign(panel.style, {
    position: "fixed",
    right: "20px",
    top: "100px",
    zIndex: "2147483647",
    width: "240px",
    padding: "14px",
    borderRadius: "12px",
    background: "rgba(20, 32, 51, 0.96)",
    color: "#fff",
    fontFamily: "system-ui, sans-serif",
    fontSize: "13px",
    boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
    pointerEvents: "auto"
  })

  const title = panel.querySelector(".ultra-dy-title") as HTMLElement
  const status = panel.querySelector(".ultra-dy-status") as HTMLElement
  const fields = panel.querySelectorAll(".ultra-dy-field")
  const textEl = panel.querySelector('[data-field="text"]') as HTMLTextAreaElement
  const intervalEl = panel.querySelector(
    '[data-field="interval"]'
  ) as HTMLInputElement
  const toggleBtn = panel.querySelector(
    '[data-act="toggle"]'
  ) as HTMLButtonElement
  const saveDataBtn = panel.querySelector(
    '[data-act="save-data"]'
  ) as HTMLButtonElement

  Object.assign(title.style, { fontWeight: "700", marginBottom: "6px" })
  Object.assign(status.style, {
    opacity: "0.9",
    marginBottom: "10px",
    lineHeight: "1.4",
    fontSize: "12px"
  })

  fields.forEach((field) => {
    Object.assign((field as HTMLElement).style, {
      display: "block",
      marginBottom: "10px"
    })
    const span = field.querySelector("span")
    if (span) styleLabel(span)
  })

  styleControl(textEl)
  Object.assign(textEl.style, {
    minHeight: "64px",
    padding: "8px",
    resize: "vertical",
    lineHeight: "1.4"
  })

  styleControl(intervalEl)
  Object.assign(intervalEl.style, {
    height: "34px",
    padding: "0 8px"
  })
  intervalEl.value = String(DOUYIN_DEFAULTS.INTERVAL)

  styleActionBtn(toggleBtn, "#2e8b8a")
  styleActionBtn(saveDataBtn, "#3d5a80")
  saveDataBtn.title =
    "开：拦截直播视频省流量；关：清掉拦截并刷新，页面恢复原样播放"

  const stopBubble = (e: Event) => e.stopPropagation()
  panel.addEventListener("mousedown", stopBubble)
  panel.addEventListener("keydown", stopBubble)
  textEl.addEventListener("change", persistPanelConfig)
  textEl.addEventListener("blur", persistPanelConfig)
  intervalEl.addEventListener("change", persistPanelConfig)
  intervalEl.addEventListener("blur", persistPanelConfig)

  toggleBtn.addEventListener("click", (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleAutoSend()
  })
  saveDataBtn.addEventListener("click", (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleSaveData()
  })

  const mount = document.body || document.documentElement
  mount.appendChild(panel)
  console.log("[ultra-extension] 直播助手面板已挂载", location.href)
  return panel
}

function setFieldsDisabled(disabled: boolean) {
  const textEl = panel?.querySelector(
    '[data-field="text"]'
  ) as HTMLTextAreaElement | null
  const intervalEl = panel?.querySelector(
    '[data-field="interval"]'
  ) as HTMLInputElement | null
  if (textEl) textEl.disabled = disabled
  if (intervalEl) intervalEl.disabled = disabled
}

function updatePanelStatus(text: string) {
  ensurePanel()
  const el = panel?.querySelector(".ultra-dy-status")
  if (el) el.textContent = text
}

function syncToggle(isRunning: boolean) {
  ensurePanel()
  const toggleBtn = panel?.querySelector(
    '[data-act="toggle"]'
  ) as HTMLButtonElement | null
  if (!toggleBtn) return
  toggleBtn.textContent = isRunning ? "关闭自动发送" : "开启自动发送"
  toggleBtn.style.background = isRunning ? "#a35d5d" : "#2e8b8a"
}

function syncSaveDataToggle(on: boolean) {
  ensurePanel()
  const btn = panel?.querySelector(
    '[data-act="save-data"]'
  ) as HTMLButtonElement | null
  if (!btn) return
  btn.textContent = on ? "关闭省流" : "开启省流"
  btn.style.background = on ? "#a35d5d" : "#3d5a80"
}

function bootLivePage(opts?: { preserveSession?: boolean }) {
  if (!isLivePage()) {
    stopAutoSendQuiet()
    // 离开直播间时不要清 DNR：省流记忆为开时，规则常驻，下次进页前就能拦
    removeSaveStyle()
    running = false
    saveDataOn = false
    removePanel()
    bootedForHref = location.href
    return
  }

  ensurePanel()

  const finishBoot = (result: Record<string, unknown>) => {
    if (!isLivePage()) return
    const cfg = getDouyinConfig(result)
    fillPanelFields(cfg)

    if (opts?.preserveSession) {
      syncSaveDataToggle(saveDataOn)
      if (saveDataOn) ensureSaveStyle()
      if (running && cfg.text.trim()) {
        syncToggle(true)
        setFieldsDisabled(true)
        updatePanelStatus(`已开启 · 每 ${Math.max(3, cfg.interval)} 秒`)
      } else {
        syncToggle(false)
        setFieldsDisabled(false)
        updatePanelStatus(
          saveDataOn ? "省流已开 · 需要时再开自动发送" : "省流已关 · 正常播放中"
        )
      }
      return
    }

    // 按记忆恢复 UI
    // 关：不跑拦截脚本，只确保网络规则已清；开：拦截视频
    saveDataOn = cfg.saveData
    syncSaveDataToggle(cfg.saveData)
    if (cfg.saveData) {
      ensureSaveStyle()
      killAllMediaElements()
      updatePanelStatus("省流已开 · 已拦截直播视频")
      requestSaveData(true)
    } else {
      removeSaveStyle()
      updatePanelStatus("省流已关 · 页面原样播放")
      // 只清规则，绝不注入拦截钩子
      requestSaveData(false, { skipInject: true })
    }

    if (cfg.running && cfg.text.trim()) {
      startAutoSend(cfg)
    } else {
      chrome.storage.local.set({ [DOUYIN_KEYS.RUNNING]: false })
      syncToggle(false)
      setFieldsDisabled(false)
    }
  }

  // 若上次切换时扩展上下文已失效，这里把 session 意图补写进 storage
  let pending: boolean | null = null
  try {
    const raw = sessionStorage.getItem(SAVE_DATA_PENDING_KEY)
    if (raw === "1") pending = true
    if (raw === "0") pending = false
    if (pending !== null) sessionStorage.removeItem(SAVE_DATA_PENDING_KEY)
  } catch {
    // ignore
  }

  if (pending !== null) {
    chrome.storage.local.set({ [DOUYIN_KEYS.SAVE_DATA]: pending }, () => {
      chrome.storage.local.get(storageKeys(), finishBoot)
    })
  } else {
    chrome.storage.local.get(storageKeys(), finishBoot)
  }
  bootedForHref = location.href
}

function onRouteMaybeChanged() {
  if (location.href === bootedForHref && document.getElementById(PANEL_ID)) {
    return
  }
  bootLivePage()
}

function patchHistory() {
  const wrap = (type: "pushState" | "replaceState") => {
    const original = history[type]
    history[type] = function (...args) {
      const result = original.apply(this, args)
      setTimeout(onRouteMaybeChanged, 50)
      return result
    }
  }
  wrap("pushState")
  wrap("replaceState")
  window.addEventListener("popstate", () => setTimeout(onRouteMaybeChanged, 50))
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isLivePage()) return false
  if (message?.action === "douyin-danmaku-start") {
    persistPanelConfig()
    startAutoSend(readPanelConfig())
    sendResponse({ ok: true })
    return true
  }
  if (message?.action === "douyin-danmaku-stop") {
    stopAutoSend()
    sendResponse({ ok: true })
  }
  return false
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !isLivePage()) return
  if (changes[DOUYIN_KEYS.RUNNING]?.newValue === false && running) {
    stopAutoSendQuiet()
    running = false
    updatePanelStatus("已关闭自动发送")
    syncToggle(false)
    setFieldsDisabled(false)
  }
})

patchHistory()

const start = () => {
  bootLivePage()
  setInterval(() => {
    if (!isLivePage()) return
    if (!document.getElementById(PANEL_ID)) {
      panel = null
      // 面板被页面清掉时重建，保留当前会话的开关状态
      bootLivePage({ preserveSession: true })
    }
  }, 2000)
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => setTimeout(start, 300))
} else {
  setTimeout(start, 300)
}
