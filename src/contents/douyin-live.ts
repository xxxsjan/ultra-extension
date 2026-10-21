import type { PlasmoCSConfig } from "plasmo"

import {
  DOUYIN_DEFAULTS,
  DOUYIN_KEYS,
  MIN_INTERVAL,
  SAVE_DATA_PENDING_KEY,
  getDouyinConfig,
  isDouyinLiveRoom,
  pickRandomDanmaku,
  splitDanmakuList,
  type DouyinDanmakuConfig
} from "~scripts/douyin-config"

export const config: PlasmoCSConfig = {
  matches: ["https://www.douyin.com/*", "https://live.douyin.com/*"],
  run_at: "document_idle"
}

const PANEL_ID = "ultra-douyin-danmaku-panel"

let timer: ReturnType<typeof setInterval> | null = null
/** 随机间隔模式下用于调度下一次发送 */
let scheduleTimer: ReturnType<typeof setTimeout> | null = null
let sending = false
let panel: HTMLDivElement | null = null
let running = false
let saveDataOn = false
let bootedForHref = ""
let saveDataPending = false
/** 悬浮窗是否处于最小化状态（默认最小化，首次挂载即为收起态） */
let panelMinimized = true
/** 随机发送时已用过的弹幕，避免短时间连续重复 */
let usedDanmaku = new Set<string>()
/** 顺序发送时的游标 */
let sendCursor = 0

/** 仅直播间展示面板 / 生效功能 */
function isLivePage() {
  return isDouyinLiveRoom()
}

function storageKeys() {
  return [
    DOUYIN_KEYS.TEXT,
    DOUYIN_KEYS.INTERVAL,
    DOUYIN_KEYS.RUNNING,
    DOUYIN_KEYS.SAVE_DATA,
    DOUYIN_KEYS.MINIMIZED
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
    updatePanelStatus(
      `已发送 · ${new Date().toLocaleTimeString()} · ${text.trim().slice(0, 12)}`
    )
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
  if (scheduleTimer) {
    clearTimeout(scheduleTimer)
    scheduleTimer = null
  }
}

function readPanelConfig(): DouyinDanmakuConfig {
  const textEl = panel?.querySelector(
    '[data-field="text"]'
  ) as HTMLTextAreaElement | null
  const intervalEl = panel?.querySelector(
    '[data-field="interval"]'
  ) as HTMLInputElement | null
  const maxIntervalEl = panel?.querySelector(
    '[data-field="max-interval"]'
  ) as HTMLInputElement | null
  const randomTextEl = panel?.querySelector(
    '[data-field="random-text"]'
  ) as HTMLInputElement | null
  const randomIntervalEl = panel?.querySelector(
    '[data-field="random-interval"]'
  ) as HTMLInputElement | null
  const intervalRaw = Number(intervalEl?.value)
  const maxIntervalRaw = Number(maxIntervalEl?.value)
  const interval =
    Number.isFinite(intervalRaw) && intervalRaw > 0
      ? intervalRaw
      : DOUYIN_DEFAULTS.INTERVAL
  return {
    text: (textEl?.value || "").trim(),
    interval,
    running,
    saveData: saveDataOn,
    minimized: panelMinimized,
    randomText: Boolean(randomTextEl?.checked),
    randomInterval: Boolean(randomIntervalEl?.checked),
    maxInterval:
      Number.isFinite(maxIntervalRaw) && maxIntervalRaw > 0
        ? Math.max(interval, maxIntervalRaw)
        : Math.max(interval, DOUYIN_DEFAULTS.MAX_INTERVAL)
  }
}

function persistPanelConfig() {
  const cfg = readPanelConfig()
  chrome.storage.local.set({
    [DOUYIN_KEYS.TEXT]: cfg.text,
    [DOUYIN_KEYS.INTERVAL]: Math.max(MIN_INTERVAL, cfg.interval),
    [DOUYIN_KEYS.RANDOM_TEXT]: cfg.randomText,
    [DOUYIN_KEYS.RANDOM_INTERVAL]: cfg.randomInterval,
    [DOUYIN_KEYS.MAX_INTERVAL]: Math.max(
      MIN_INTERVAL,
      cfg.maxInterval
    ),
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
  const maxIntervalEl = panel?.querySelector(
    '[data-field="max-interval"]'
  ) as HTMLInputElement | null
  const randomTextEl = panel?.querySelector(
    '[data-field="random-text"]'
  ) as HTMLInputElement | null
  const randomIntervalEl = panel?.querySelector(
    '[data-field="random-interval"]'
  ) as HTMLInputElement | null
  if (textEl && textEl.value !== cfg.text) textEl.value = cfg.text
  if (intervalEl) {
    intervalEl.value = String(cfg.interval || DOUYIN_DEFAULTS.INTERVAL)
  }
  if (maxIntervalEl) {
    maxIntervalEl.value = String(
      cfg.maxInterval || DOUYIN_DEFAULTS.MAX_INTERVAL
    )
  }
  if (randomTextEl) randomTextEl.checked = cfg.randomText
  if (randomIntervalEl) randomIntervalEl.checked = cfg.randomInterval
  syncRandomIntervalVisibility(cfg.randomInterval)
}

/** 随机间隔开启时才显示「最大间隔」输入框 */
function syncRandomIntervalVisibility(enabled: boolean) {
  const row = panel?.querySelector(
    ".ultra-dy-field-max-interval"
  ) as HTMLElement | null
  if (row) row.style.display = enabled ? "block" : "none"
}

function stopAutoSend() {
  stopAutoSendQuiet()
  running = false
  chrome.storage.local.set({ [DOUYIN_KEYS.RUNNING]: false })
  updatePanelStatus("已关闭自动发送")
  syncToggle(false)
  setFieldsDisabled(false)
}

/**
 * 按当前配置挑一条要发的弹幕：
 * - 随机发送开启：从多行弹幕里随机挑一条（尽量不重复）
 * - 未开启：按行依次循环发送
 */
function pickNextDanmaku(cfg: DouyinDanmakuConfig): string | null {
  const list = splitDanmakuList(cfg.text)
  if (!list.length) return null

  if (!cfg.randomText) {
    // 顺序循环
    const idx = sendCursor % list.length
    sendCursor = (sendCursor + 1) % list.length
    return list[idx]
  }

  const picked = pickRandomDanmaku(list, usedDanmaku)
  // 全部发过一轮后清空记录，重新随机
  if (usedDanmaku.size >= list.length) usedDanmaku.clear()
  return picked
}

/** 组合运行状态描述：随机间隔 / 随机发送 */
function formatRunStatus(cfg: DouyinDanmakuConfig): string {
  const min = Math.max(MIN_INTERVAL, cfg.interval)
  const max = Math.max(min, cfg.maxInterval)
  const list = splitDanmakuList(cfg.text)
  const count = list.length > 1 ? ` · 共 ${list.length} 条` : ""
  const mode = cfg.randomInterval
    ? `随机 ${min}-${max} 秒`
    : `每 ${min} 秒`
  return `已开启 · ${mode}${count}`
}

/** 计算下一次发送的间隔（秒） */
function nextDelaySeconds(cfg: DouyinDanmakuConfig): number {
  const min = Math.max(MIN_INTERVAL, cfg.interval)
  if (!cfg.randomInterval) return min
  const max = Math.max(min, cfg.maxInterval)
  if (max <= min) return min
  return min + Math.floor(Math.random() * (max - min + 1))
}

/** 调度下一次发送；随机间隔用 setTimeout 逐次重排 */
function scheduleNextSend(cfg: DouyinDanmakuConfig) {
  if (!running) return
  const delay = nextDelaySeconds(cfg)
  scheduleTimer = setTimeout(() => {
    if (!running) return
    const latest = readPanelConfig()
    const text = pickNextDanmaku(latest)
    if (text) sendOnce(text)
    scheduleNextSend(latest)
  }, delay * 1000)
}

function startAutoSend(cfg: DouyinDanmakuConfig) {
  stopAutoSendQuiet()
  const list = splitDanmakuList(cfg.text)
  if (!list.length) {
    running = false
    chrome.storage.local.set({ [DOUYIN_KEYS.RUNNING]: false })
    updatePanelStatus("请先填写弹幕内容")
    syncToggle(false)
    setFieldsDisabled(false)
    return
  }
  const seconds = Math.max(MIN_INTERVAL, cfg.interval)
  running = true
  sendCursor = 0
  usedDanmaku.clear()
  chrome.storage.local.set({
    [DOUYIN_KEYS.RUNNING]: true,
    [DOUYIN_KEYS.TEXT]: cfg.text.trim(),
    [DOUYIN_KEYS.INTERVAL]: seconds,
    [DOUYIN_KEYS.RANDOM_TEXT]: cfg.randomText,
    [DOUYIN_KEYS.RANDOM_INTERVAL]: cfg.randomInterval,
    [DOUYIN_KEYS.MAX_INTERVAL]: Math.max(seconds, cfg.maxInterval)
  })
  updatePanelStatus(
    cfg.randomInterval
      ? `已开启 · 随机 ${seconds}-${Math.max(seconds, cfg.maxInterval)} 秒`
      : `已开启 · 每 ${seconds} 秒`
  )
  syncToggle(true)
  setFieldsDisabled(true)
  setTimeout(() => {
    const first = pickNextDanmaku(readPanelConfig())
    if (first) sendOnce(first)
  }, 800)

  if (cfg.randomInterval) {
    // 随机间隔：每次发完重新排下一次
    scheduleNextSend(cfg)
  } else {
    const ms = seconds * 1000
    timer = setInterval(() => {
      const latest = readPanelConfig()
      const text = pickNextDanmaku(latest)
      if (text) sendOnce(text)
    }, ms)
  }
}

function toggleAutoSend() {
  if (running) {
    stopAutoSend()
    return
  }
  persistPanelConfig()
  const cfg = readPanelConfig()
  if (cfg.interval < MIN_INTERVAL) {
    updatePanelStatus(`发送间隔至少 ${MIN_INTERVAL} 秒`)
    return
  }
  if (cfg.randomInterval && cfg.maxInterval < cfg.interval) {
    updatePanelStatus("最大间隔不能小于最小间隔")
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
  updatePanelStatus(enabled ? "关闭直播流并刷新…" : "恢复直播流，刷新…")

  markSaveDataPending(enabled)
  saveDataOn = enabled
  updatePanelDot()

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
    updatePanelStatus("请手动刷新页面以完成直播流切换")
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
    marginBottom: "5px",
    fontSize: "11px",
    opacity: "0.6",
    fontWeight: "600",
    letterSpacing: "0.3px"
  })
}

function styleControl(el: HTMLElement) {
  Object.assign(el.style, {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: "9px",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    fontFamily: "inherit",
    fontSize: "12px",
    outline: "none",
    transition: "border-color .15s ease, background .15s ease, box-shadow .15s ease"
  })
  el.addEventListener("focus", () => {
    el.style.borderColor = "rgba(46,139,138,0.85)"
    el.style.background = "rgba(46,139,138,0.12)"
    el.style.boxShadow = "0 0 0 3px rgba(46,139,138,0.16)"
  })
  el.addEventListener("blur", () => {
    el.style.borderColor = "rgba(255,255,255,0.14)"
    el.style.background = "rgba(255,255,255,0.06)"
    el.style.boxShadow = "none"
  })
}

function styleActionBtn(btn: HTMLButtonElement, bg: string) {
  Object.assign(btn.style, {
    width: "100%",
    height: "36px",
    border: "none",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "13px",
    letterSpacing: "0.3px",
    background: bg,
    color: "#fff",
    marginTop: "9px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    transition: "filter .15s ease, transform .08s ease, box-shadow .15s ease"
  })
  btn.addEventListener("mouseenter", () => {
    btn.style.filter = "brightness(1.12)"
    btn.style.boxShadow = "0 6px 16px rgba(0,0,0,0.28)"
  })
  btn.addEventListener("mouseleave", () => {
    btn.style.filter = "none"
    btn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)"
  })
  btn.addEventListener("mousedown", () => {
    btn.style.transform = "scale(0.985)"
  })
  btn.addEventListener("mouseup", () => {
    btn.style.transform = "none"
  })
}

function styleMinimizeBtn(btn: HTMLButtonElement) {
  Object.assign(btn.style, {
    width: "22px",
    height: "22px",
    minWidth: "22px",
    flex: "0 0 auto",
    border: "none",
    borderRadius: "999px",
    cursor: "pointer",
    background: "rgba(255,255,255,0.12)",
    color: "#fff",
    fontSize: "13px",
    lineHeight: "1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0",
    transition: "background .15s ease, transform .15s ease"
  })
  btn.title = "最小化悬浮窗"
  btn.addEventListener("mouseenter", () => {
    btn.style.background = "rgba(255,255,255,0.24)"
  })
  btn.addEventListener("mouseleave", () => {
    btn.style.background = "rgba(255,255,255,0.12)"
  })
}

/** 收起 / 展开图标（内联 SVG，避免字体符号渲染不一致） */
const MINIMIZE_ICON = `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3.5 8h9"/></svg>`
const EXPAND_ICON = `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2.5H2.5V6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/></svg>`

/** 注入一次性的面板动效样式（状态灯呼吸动画） */
function ensurePanelStyles() {
  const id = "ultra-douyin-panel-style"
  if (document.getElementById(id)) return
  const style = document.createElement("style")
  style.id = id
  style.textContent = `
    @keyframes ultra-dy-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: .55; transform: scale(.82); }
    }
  `
  document.documentElement.appendChild(style)
}

/** 更新最小化胶囊上的状态灯：自动发送 / 省流任一开启则亮起 */
function updatePanelDot() {
  const dot = panel?.querySelector(".ultra-dy-dot") as HTMLElement | null
  if (!dot) return
  const active = running || saveDataOn
  dot.style.background = active ? "#4ade80" : "rgba(255,255,255,0.4)"
  dot.style.boxShadow = active
    ? "0 0 0 3px rgba(74,222,128,0.18)"
    : "0 0 0 3px rgba(255,255,255,0.06)"
  dot.style.animation = active ? "ultra-dy-pulse 1.8s ease-in-out infinite" : "none"
}

/** 应用最小化 / 展开状态到面板 DOM */
function applyMinimizedState(minimized: boolean) {
  if (!panel) return
  const body = panel.querySelector(".ultra-dy-body") as HTMLElement | null
  const header = panel.querySelector(".ultra-dy-header") as HTMLElement | null
  const label = panel.querySelector(
    ".ultra-dy-title-text"
  ) as HTMLElement | null
  const subtitle = panel.querySelector(
    ".ultra-dy-subtitle"
  ) as HTMLElement | null
  const btn = panel.querySelector(
    '[data-act="minimize"]'
  ) as HTMLButtonElement | null

  if (minimized) {
    if (body) body.style.display = "none"
    if (label) label.textContent = "直播助手"
    if (subtitle) subtitle.style.display = "none"
    if (header) {
      header.style.borderBottom = "none"
      header.style.marginBottom = "0"
      header.style.padding = "8px 9px 8px 14px"
      header.style.gap = "8px"
      header.style.background = "none"
    }
    panel.style.width = "auto"
    panel.style.minWidth = ""
    panel.style.padding = "0"
    panel.style.borderRadius = "999px"
    panel.style.background =
      "linear-gradient(135deg, rgba(46,139,138,0.97) 0%, rgba(61,90,128,0.97) 100%)"
    panel.style.boxShadow =
      "0 8px 22px rgba(0,0,0,0.32), inset 0 0 0 1px rgba(255,255,255,0.16)"
    panel.style.setProperty("backdrop-filter", "blur(6px)")
  } else {
    if (body) body.style.display = "block"
    if (label) label.textContent = "直播助手"
    if (subtitle) subtitle.style.display = "block"
    if (header) {
      header.style.borderBottom = "1px solid rgba(255,255,255,0.08)"
      header.style.marginBottom = "0"
      header.style.padding = "12px 12px 12px 14px"
      header.style.gap = "9px"
      header.style.background =
        "linear-gradient(180deg, rgba(46,139,138,0.28) 0%, rgba(46,139,138,0) 100%)"
    }
    panel.style.width = "260px"
    panel.style.minWidth = ""
    panel.style.padding = "0"
    panel.style.borderRadius = "14px"
    panel.style.background = "rgba(17, 26, 40, 0.97)"
    panel.style.boxShadow =
      "0 16px 40px rgba(0,0,0,0.42), 0 0 0 1px rgba(255,255,255,0.08)"
    panel.style.setProperty("backdrop-filter", "")
  }

  if (btn) {
    btn.innerHTML = minimized ? EXPAND_ICON : MINIMIZE_ICON
    btn.title = minimized ? "展开悬浮窗" : "最小化悬浮窗"
    btn.setAttribute("aria-label", btn.title)
  }

  updatePanelDot()
}

function setMinimized(minimized: boolean) {
  panelMinimized = minimized
  applyMinimizedState(minimized)
  try {
    chrome.storage.local.set({ [DOUYIN_KEYS.MINIMIZED]: minimized })
  } catch {
    // ignore
  }
}

function toggleMinimized() {
  setMinimized(!panelMinimized)
}

function enablePanelDrag(el: HTMLDivElement, handle: HTMLElement) {
  handle.style.cursor = "move"
  handle.style.userSelect = "none"
  handle.title = "按住拖动面板"

  let dragging = false
  let startX = 0
  let startY = 0
  let originLeft = 0
  let originTop = 0

  const onMove = (e: MouseEvent) => {
    if (!dragging) return
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    const maxLeft = Math.max(0, window.innerWidth - el.offsetWidth)
    const maxTop = Math.max(0, window.innerHeight - el.offsetHeight)
    const nextLeft = Math.min(maxLeft, Math.max(0, originLeft + dx))
    const nextTop = Math.min(maxTop, Math.max(0, originTop + dy))
    el.style.left = `${nextLeft}px`
    el.style.top = `${nextTop}px`
    el.style.right = "auto"
  }

  const onUp = () => {
    if (!dragging) return
    dragging = false
    document.removeEventListener("mousemove", onMove)
    document.removeEventListener("mouseup", onUp)
  }

  handle.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    dragging = true
    const rect = el.getBoundingClientRect()
    originLeft = rect.left
    originTop = rect.top
    startX = e.clientX
    startY = e.clientY
    // 拖动时改用 left/top，避免和 right 冲突
    el.style.left = `${originLeft}px`
    el.style.top = `${originTop}px`
    el.style.right = "auto"
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
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
    applyMinimizedState(panelMinimized)
    return panel
  }

  panel = document.createElement("div")
  panel.id = PANEL_ID
  panel.innerHTML = `
    <div class="ultra-dy-header">
      <span class="ultra-dy-dot" aria-hidden="true"></span>
      <div class="ultra-dy-brand">
        <div class="ultra-dy-title"><span class="ultra-dy-title-text">直播助手</span></div>
        <div class="ultra-dy-subtitle">抖音直播 · 弹幕与直播流</div>
      </div>
      <button type="button" class="ultra-dy-minimize" data-act="minimize" aria-label="最小化悬浮窗">—</button>
    </div>
    <div class="ultra-dy-body">
      <div class="ultra-dy-status">待命</div>
      <label class="ultra-dy-field">
        <span>弹幕内容<em class="ultra-dy-hint">每行一条，可填多条</em></span>
        <textarea data-field="text" rows="4" placeholder="第一行弹幕&#10;第二行弹幕&#10;第三行弹幕"></textarea>
      </label>
      <label class="ultra-dy-check">
        <input data-field="random-text" type="checkbox" />
        <span>随机发送（多条中随机挑一条）</span>
      </label>
      <label class="ultra-dy-check">
        <input data-field="random-interval" type="checkbox" />
        <span>随机间隔</span>
      </label>
      <label class="ultra-dy-field ultra-dy-field-max-interval">
        <span>最大间隔（秒）</span>
        <input data-field="max-interval" type="number" min="3" step="1" />
      </label>
      <label class="ultra-dy-field">
        <span>发送间隔（秒）</span>
        <input data-field="interval" type="number" min="3" step="1" />
      </label>
      <button type="button" data-act="toggle">开启自动发送</button>
      <button type="button" data-act="save-data">关闭直播流</button>
    </div>
  `

  Object.assign(panel.style, {
    position: "fixed",
    left: "50%",
    top: "100px",
    zIndex: "2147483647",
    width: "260px",
    padding: "0",
    borderRadius: "14px",
    background: "rgba(17, 26, 40, 0.97)",
    color: "#fff",
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    fontSize: "13px",
    boxShadow:
      "0 16px 40px rgba(0,0,0,0.42), 0 0 0 1px rgba(255,255,255,0.08)",
    overflow: "hidden",
    pointerEvents: "auto"
  })

  const title = panel.querySelector(".ultra-dy-title") as HTMLElement
  const minimizeBtn = panel.querySelector(
    '[data-act="minimize"]'
  ) as HTMLButtonElement
  const status = panel.querySelector(".ultra-dy-status") as HTMLElement
  const fields = panel.querySelectorAll(".ultra-dy-field")
  const textEl = panel.querySelector('[data-field="text"]') as HTMLTextAreaElement
  const intervalEl = panel.querySelector(
    '[data-field="interval"]'
  ) as HTMLInputElement
  const maxIntervalEl = panel.querySelector(
    '[data-field="max-interval"]'
  ) as HTMLInputElement
  const randomTextEl = panel.querySelector(
    '[data-field="random-text"]'
  ) as HTMLInputElement
  const randomIntervalEl = panel.querySelector(
    '[data-field="random-interval"]'
  ) as HTMLInputElement
  const checkRows = panel.querySelectorAll(".ultra-dy-check")
  const toggleBtn = panel.querySelector(
    '[data-act="toggle"]'
  ) as HTMLButtonElement
  const saveDataBtn = panel.querySelector(
    '[data-act="save-data"]'
  ) as HTMLButtonElement

  const header = panel.querySelector(".ultra-dy-header") as HTMLElement
  const dot = panel.querySelector(".ultra-dy-dot") as HTMLElement
  const brand = panel.querySelector(".ultra-dy-brand") as HTMLElement
  const subtitle = panel.querySelector(".ultra-dy-subtitle") as HTMLElement
  const body = panel.querySelector(".ultra-dy-body") as HTMLElement

  Object.assign(header.style, {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    marginBottom: "0",
    padding: "12px 12px 12px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    background:
      "linear-gradient(180deg, rgba(46,139,138,0.28) 0%, rgba(46,139,138,0) 100%)",
    cursor: "move"
  })
  Object.assign(brand.style, {
    flex: "1 1 auto",
    minWidth: "0"
  })
  Object.assign(subtitle.style, {
    fontSize: "10px",
    lineHeight: "1.3",
    opacity: "0.5",
    marginTop: "2px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  })
  Object.assign(dot.style, {
    width: "8px",
    height: "8px",
    minWidth: "8px",
    flex: "0 0 auto",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.4)",
    boxShadow: "0 0 0 3px rgba(255,255,255,0.06)",
    transition: "background .2s ease, box-shadow .2s ease"
  })
  Object.assign(title.style, {
    fontWeight: "700",
    fontSize: "13px",
    letterSpacing: "0.2px",
    whiteSpace: "nowrap",
    textAlign: "left"
  })
  styleMinimizeBtn(minimizeBtn)
  ensurePanelStyles()
  Object.assign(body.style, {
    padding: "12px 14px 14px"
  })
  Object.assign(status.style, {
    opacity: "0.9",
    marginBottom: "12px",
    padding: "7px 10px",
    borderRadius: "8px",
    background: "rgba(255,255,255,0.06)",
    borderLeft: "2px solid rgba(46,139,138,0.7)",
    lineHeight: "1.4",
    fontSize: "12px"
  })

  fields.forEach((field) => {
    Object.assign((field as HTMLElement).style, {
      display: "block",
      marginBottom: "12px"
    })
    const span = field.querySelector("span")
    if (span) styleLabel(span)
  })

  // 复选行：随机发送 / 随机间隔
  checkRows.forEach((row) => {
    const el = row as HTMLElement
    Object.assign(el.style, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "8px",
      cursor: "pointer",
      fontSize: "12px",
      opacity: "0.88"
    })
    const box = el.querySelector("input") as HTMLInputElement
    if (box) {
      Object.assign(box.style, {
        width: "14px",
        height: "14px",
        minWidth: "14px",
        margin: "0",
        accentColor: "#2e8b8a",
        cursor: "pointer"
      })
    }
  })

  // 标签右侧的补充说明
  const hint = panel.querySelector(".ultra-dy-hint") as HTMLElement | null
  if (hint) {
    Object.assign(hint.style, {
      float: "right",
      fontStyle: "normal",
      fontWeight: "400",
      opacity: "0.55",
      fontSize: "10px"
    })
  }

  styleControl(textEl)
  Object.assign(textEl.style, {
    minHeight: "76px",
    padding: "9px 10px",
    resize: "vertical",
    lineHeight: "1.6"
  })

  styleControl(intervalEl)
  Object.assign(intervalEl.style, {
    height: "36px",
    padding: "0 10px"
  })
  intervalEl.value = String(DOUYIN_DEFAULTS.INTERVAL)

  styleControl(maxIntervalEl)
  Object.assign(maxIntervalEl.style, {
    height: "36px",
    padding: "0 10px"
  })
  maxIntervalEl.value = String(DOUYIN_DEFAULTS.MAX_INTERVAL)

  // 「最大间隔」仅在随机间隔开启时显示
  syncRandomIntervalVisibility(Boolean(randomIntervalEl?.checked))

  styleActionBtn(toggleBtn, "#2e8b8a")
  styleActionBtn(saveDataBtn, "#3d5a80")
  saveDataBtn.title =
    "开：拦截直播视频流省流量；关：清掉拦截并刷新，页面恢复原样播放"

  enablePanelDrag(panel, title)

  const stopBubble = (e: Event) => e.stopPropagation()
  panel.addEventListener("mousedown", stopBubble)
  panel.addEventListener("keydown", stopBubble)
  textEl.addEventListener("change", persistPanelConfig)
  textEl.addEventListener("blur", persistPanelConfig)
  intervalEl.addEventListener("change", persistPanelConfig)
  intervalEl.addEventListener("blur", persistPanelConfig)
  maxIntervalEl.addEventListener("change", persistPanelConfig)
  maxIntervalEl.addEventListener("blur", persistPanelConfig)
  randomTextEl.addEventListener("change", persistPanelConfig)
  randomIntervalEl.addEventListener("change", (e) => {
    syncRandomIntervalVisibility((e.target as HTMLInputElement).checked)
    persistPanelConfig()
  })

  minimizeBtn.addEventListener("click", (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleMinimized()
  })
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
  applyMinimizedState(panelMinimized)
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
  const maxIntervalEl = panel?.querySelector(
    '[data-field="max-interval"]'
  ) as HTMLInputElement | null
  const randomTextEl = panel?.querySelector(
    '[data-field="random-text"]'
  ) as HTMLInputElement | null
  const randomIntervalEl = panel?.querySelector(
    '[data-field="random-interval"]'
  ) as HTMLInputElement | null
  if (textEl) textEl.disabled = disabled
  if (intervalEl) intervalEl.disabled = disabled
  if (maxIntervalEl) maxIntervalEl.disabled = disabled
  if (randomTextEl) randomTextEl.disabled = disabled
  if (randomIntervalEl) randomIntervalEl.disabled = disabled
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
  updatePanelDot()
}

function syncSaveDataToggle(on: boolean) {
  ensurePanel()
  const btn = panel?.querySelector(
    '[data-act="save-data"]'
  ) as HTMLButtonElement | null
  if (!btn) return
  btn.textContent = on ? "恢复直播流" : "关闭直播流"
  btn.style.background = on ? "#a35d5d" : "#3d5a80"
  updatePanelDot()
}

function bootLivePage(opts?: { preserveSession?: boolean }) {
  if (!isLivePage()) {
    stopAutoSendQuiet()
    // 离开直播间：卸下面板与页面样式；网络规则临时清掉，避免影响非直播页
    // （省流记忆仍保留，下次再进直播间会按记忆恢复）
    removeSaveStyle()
    running = false
    saveDataOn = false
    removePanel()
    chrome.runtime.sendMessage(
      {
        action: "douyin-save-data-network",
        payload: { enabled: false }
      },
      () => {
        void chrome.runtime.lastError
      }
    )
    bootedForHref = location.href
    return
  }

  ensurePanel()

  const finishBoot = (result: Record<string, unknown>) => {
    if (!isLivePage()) return
    const cfg = getDouyinConfig(result)
    fillPanelFields(cfg)

    // 恢复最小化状态
    panelMinimized = cfg.minimized
    applyMinimizedState(panelMinimized)

    if (opts?.preserveSession) {
      syncSaveDataToggle(saveDataOn)
      if (saveDataOn) ensureSaveStyle()
      if (running && splitDanmakuList(cfg.text).length) {
        syncToggle(true)
        setFieldsDisabled(true)
        updatePanelStatus(formatRunStatus(cfg))
      } else {
        syncToggle(false)
        setFieldsDisabled(false)
        updatePanelStatus(
          saveDataOn ? "直播流已关闭 · 需要时再开自动发送" : "直播流正常播放中"
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
      updatePanelStatus("直播流已关闭 · 仅保留弹幕")
      requestSaveData(true)
    } else {
      removeSaveStyle()
      updatePanelStatus("直播流正常播放中")
      // 只清规则，绝不注入拦截钩子
      requestSaveData(false, { skipInject: true })
    }

    if (cfg.running && splitDanmakuList(cfg.text).length) {
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
