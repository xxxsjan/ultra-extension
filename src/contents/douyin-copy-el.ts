import type { PlasmoCSConfig } from "plasmo"

import { showPageToast } from "~scripts/page-toast"

export const config: PlasmoCSConfig = {
  matches: ["https://www.douyin.com/*", "https://live.douyin.com/*"],
  run_at: "document_idle"
}

const HINT_ID = "ultra-douyin-el-copy-hint"
const TARGET_CLASSES = ["muiGrjCv", "CyqYy0f8"]
const TARGET_SELECTOR = TARGET_CLASSES.map((c) => `.${c}`).join(",")

/** 表情包提取工具 */
const EMOJI_TOOL_URL = "https://tool.odep.shop/dy-emoji"

/**
 * 工具条挂载容器：抖音直播的弹幕 / 聊天区域。
 * 提示条挂在这个容器内，用 absolute 定位跟随容器滚动。
 */
const HOST_CLASS = "uMX7zuUb"
const HOST_SELECTOR = `.${HOST_CLASS}`

let hint: HTMLDivElement | null = null
let copyBtn: HTMLButtonElement | null = null
let emojiBtn: HTMLButtonElement | null = null
let activeEl: HTMLElement | null = null
let copyResetTimer: ReturnType<typeof setTimeout> | null = null
/** 跟随循环：保证工具条始终贴着目标元素 */
let followTimer: ReturnType<typeof setTimeout> | null = null
/** 跟随间隔（毫秒） */
const FOLLOW_INTERVAL = 16
/** 观察容器挂载 / 卸载，重新挂载工具条 */
let hostObserver: MutationObserver | null = null

const ICON_COPY = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`

const ICON_CHECK = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`

/** 笑脸图标：表情包提取 */
const ICON_EMOJI = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/></svg>`

function findTarget(start: EventTarget | null): HTMLElement | null {
  let node = start instanceof Element ? start : null
  if (node?.id === HINT_ID || node?.closest?.(`#${HINT_ID}`)) {
    return activeEl
  }
  const hit = node?.closest?.(TARGET_SELECTOR)
  return hit instanceof HTMLElement ? hit : null
}

function readElHtml(el: HTMLElement) {
  const clone = el.cloneNode(true) as HTMLElement
  clone.querySelector(`#${HINT_ID}`)?.remove()
  return clone.outerHTML
}

function setBtnIcon(btn: HTMLButtonElement, svg: string) {
  btn.innerHTML = svg
  const icon = btn.firstElementChild as SVGElement | null
  if (icon) icon.style.pointerEvents = "none"
}

/** 提示条里的圆形图标按钮统一样式 */
function styleHintBtn(btn: HTMLButtonElement) {
  Object.assign(btn.style, {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "30px",
    height: "30px",
    padding: "0",
    border: "none",
    borderRadius: "8px",
    background: "transparent",
    color: "#fff",
    cursor: "pointer"
  })
  btn.addEventListener("mouseenter", () => {
    btn.style.background = "rgba(255,255,255,0.12)"
  })
  btn.addEventListener("mouseleave", () => {
    btn.style.background = "transparent"
  })
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const input = document.createElement("textarea")
    input.value = text
    input.setAttribute("readonly", "")
    Object.assign(input.style, {
      position: "fixed",
      left: "-9999px",
      top: "0"
    })
    document.body.appendChild(input)
    input.select()
    const ok = document.execCommand("copy")
    input.remove()
    return ok
  }
}

function flashCopied() {
  if (!copyBtn) return
  setBtnIcon(copyBtn, ICON_CHECK)
  copyBtn.title = "已复制"
  if (copyResetTimer) clearTimeout(copyResetTimer)
  copyResetTimer = setTimeout(() => {
    if (copyBtn) {
      setBtnIcon(copyBtn, ICON_COPY)
      copyBtn.title = "复制节点 HTML"
    }
    copyResetTimer = null
  }, 1200)
}

/** 找到挂载容器 */
function findHost(): HTMLElement | null {
  const el = document.querySelector(HOST_SELECTOR)
  return el instanceof HTMLElement ? el : null
}

function ensureHint() {
  if (hint && hint.isConnected) return hint

  hint = document.createElement("div")
  hint.id = HINT_ID
  Object.assign(hint.style, {
    position: "absolute",
    zIndex: "2147483646",
    display: "flex",
    alignItems: "center",
    padding: "2px",
    borderRadius: "9px",
    background: "rgba(20, 32, 51, 0.92)",
    boxShadow: "0 8px 20px rgba(0,0,0,0.28)",
    pointerEvents: "auto"
  })

  copyBtn = document.createElement("button")
  copyBtn.type = "button"
  copyBtn.title = "复制节点 HTML"
  copyBtn.setAttribute("aria-label", "复制节点 HTML")
  styleHintBtn(copyBtn)
  setBtnIcon(copyBtn, ICON_COPY)
  copyBtn.addEventListener("click", async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!activeEl) return
    const html = readElHtml(activeEl)
    if (!html) {
      showPageToast("没有可复制的节点")
      return
    }
    const ok = await copyText(html)
    if (ok) {
      flashCopied()
      showPageToast("已复制节点 HTML")
    } else {
      showPageToast("复制失败")
    }
  })

  // 表情包提取：跳转工具页
  emojiBtn = document.createElement("button")
  emojiBtn.type = "button"
  emojiBtn.title = "提取表情包"
  emojiBtn.setAttribute("aria-label", "提取表情包")
  styleHintBtn(emojiBtn)
  setBtnIcon(emojiBtn, ICON_EMOJI)
  emojiBtn.addEventListener("click", (e) => {
    e.preventDefault()
    e.stopPropagation()
    window.open(EMOJI_TOOL_URL, "_blank", "noopener,noreferrer")
  })

  // 两个按钮之间加一条竖线分隔
  const divider = document.createElement("span")
  Object.assign(divider.style, {
    width: "1px",
    height: "16px",
    flex: "0 0 auto",
    margin: "0 2px",
    background: "rgba(255,255,255,0.18)"
  })

  hint.append(copyBtn, divider, emojiBtn)

  mountHint()
  return hint
}

/**
 * 把工具条挂进 .uMX7zuUb 容器。
 * 容器是滚动区域，absolute 定位可随容器内容一起滚动。
 */
function mountHint() {
  if (!hint) return
  const host = findHost()
  if (host) {
    // 相对容器定位：容器需要有定位上下文
    if (getComputedStyle(host).position === "static") {
      host.style.position = "relative"
    }
    host.appendChild(hint)
    return
  }
  // 容器还没出现，先挂到 body，等容器就绪后再迁移
  ;(document.body || document.documentElement).appendChild(hint)
}

/** 上一次写入的位置，避免每次都写 DOM 造成重排 */
let lastPos = { top: -1, left: -1, width: -1 }

/**
 * 计算工具条相对挂载容器的位置。
 * 目标元素与容器可能处于不同的滚动上下文，这里换算成容器坐标系。
 */
function placeHint(el: HTMLElement) {
  const bar = ensureHint()
  const host = bar.parentElement
  if (!host) return

  const rect = el.getBoundingClientRect()
  const hostRect = host.getBoundingClientRect()
  const width = bar.offsetWidth || 34

  // 目标相对容器的坐标（+4 贴边偏移）
  const top = rect.top - hostRect.top + host.scrollTop + 4
  const left = rect.right - hostRect.left + host.scrollLeft - width - 4

  // 位置没变就不写样式，减少重排
  if (
    lastPos.top === top &&
    lastPos.left === left &&
    lastPos.width === width &&
    bar.style.display === "flex"
  ) {
    return
  }
  lastPos = { top, left, width }
  bar.style.top = `${top}px`
  bar.style.left = `${left}px`
  bar.style.display = "flex"
}

/**
 * 目标元素是否还在容器可视区域内
 */
function isTargetVisible(el: HTMLElement): boolean {
  if (!el.isConnected) return false
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return false
  return (
    rect.bottom > 0 &&
    rect.top < window.innerHeight &&
    rect.right > 0 &&
    rect.left < window.innerWidth
  )
}

/**
 * 定时跟随目标元素位置。
 *
 * 抖音直播列表常在内部容器滚动 / 虚拟列表重排，单纯监听 scroll 事件
 * 会漏掉部分滚动源（内部滚动容器不一定冒泡到 window），所以这里
 * 用定时器持续同步位置。
 *
 * 用 setTimeout 而非 requestAnimationFrame：标签页切到后台时 rAF 会暂停，
 * 回到前台时位置会明显陈旧；定时器在后台仍会继续运行（虽然被节流）。
 */
function followLoop() {
  followTimer = null
  if (!activeEl || !hint) return

  if (!isTargetVisible(activeEl)) {
    // 目标滚出视口，隐藏并停止跟随
    hideHint()
    return
  }

  placeHint(activeEl)
  followTimer = setTimeout(followLoop, FOLLOW_INTERVAL)
}

function startFollow() {
  if (followTimer) return
  followTimer = setTimeout(followLoop, FOLLOW_INTERVAL)
}

function stopFollow() {
  if (followTimer) {
    clearTimeout(followTimer)
    followTimer = null
  }
}

function showHint(el: HTMLElement) {
  activeEl = el
  placeHint(el)
  startFollow()
}

function hideHint() {
  stopFollow()
  if (hint) hint.style.display = "none"
  activeEl = null
  lastPos = { top: -1, left: -1, width: -1 }
}

/** 容器出现后把工具条迁进去；容器被移除时回退 */
function ensureHostObserver() {
  if (hostObserver) return
  hostObserver = new MutationObserver(() => {
    if (!hint) return
    const host = findHost()
    if (host && hint.parentElement !== host) {
      mountHint()
      if (activeEl) placeHint(activeEl)
    } else if (!host && hint.parentElement !== document.body) {
      ;(document.body || document.documentElement).appendChild(hint)
    }
  })
  hostObserver.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  })
}

document.addEventListener(
  "mouseover",
  (e) => {
    const hit = findTarget(e.target)
    if (!hit) return
    showHint(hit)
  },
  true
)

document.addEventListener(
  "mouseout",
  (e) => {
    if (!activeEl) return
    const next = e.relatedTarget
    if (
      next instanceof Node &&
      (activeEl.contains(next) || hint?.contains(next))
    ) {
      return
    }
    // 常驻显示：移出目标后不隐藏
  },
  true
)

// 页面尺寸变化（窗口缩放 / 布局调整）时重新对齐
window.addEventListener("resize", () => {
  if (activeEl) placeHint(activeEl)
})

// 初始挂载 + 观察容器
ensureHint()
ensureHostObserver()
