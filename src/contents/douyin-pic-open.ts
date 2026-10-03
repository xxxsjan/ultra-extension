import type { PlasmoCSConfig } from "plasmo"

import { showPageToast } from "~scripts/page-toast"

export const config: PlasmoCSConfig = {
  matches: ["https://www.douyin.com/*", "https://live.douyin.com/*"],
  run_at: "document_idle"
}

const HINT_ID = "ultra-douyin-pic-hint"
/** 抖音图床：p3-sign.douyinpic.com/obj …（节点会轮换 p3/p6/p9 等） */
const PIC_URL_RE =
  /https?:\/\/p\d+-sign\.douyinpic\.com\/obj[^\s"'\\)]*/i

let hint: HTMLDivElement | null = null
let copyBtn: HTMLButtonElement | null = null
let activeEl: HTMLElement | null = null
let activeUrl = ""
let hideTimer: ReturnType<typeof setTimeout> | null = null
let copyResetTimer: ReturnType<typeof setTimeout> | null = null

function extractPicUrl(value: string): string | null {
  const match = String(value || "").match(PIC_URL_RE)
  return match ? match[0] : null
}

function urlFromImg(el: HTMLImageElement): string | null {
  const candidates = [
    el.currentSrc,
    el.src,
    el.getAttribute("data-src"),
    el.getAttribute("data-origin"),
    el.getAttribute("srcset")
  ]
  for (const raw of candidates) {
    const url = extractPicUrl(raw || "")
    if (url) return url
  }
  return null
}

function urlFromNode(node: Element): string | null {
  if (node instanceof HTMLImageElement) return urlFromImg(node)
  if (node instanceof HTMLSourceElement) {
    return extractPicUrl(node.srcset || node.src || "")
  }
  const bg = getComputedStyle(node).backgroundImage
  return extractPicUrl(bg)
}

function findPicTarget(start: EventTarget | null): {
  el: HTMLElement
  url: string
} | null {
  let node = start instanceof Element ? start : null
  let hops = 0
  while (node && hops < 8) {
    if (node.id === HINT_ID || node.closest?.(`#${HINT_ID}`)) {
      return activeEl && activeUrl ? { el: activeEl, url: activeUrl } : null
    }
    const url = urlFromNode(node)
    if (url) {
      const rect = node.getBoundingClientRect()
      if (rect.width >= 48 && rect.height >= 48) {
        return { el: node as HTMLElement, url }
      }
    }
    node = node.parentElement
    hops++
  }
  return null
}

const ICON_OPEN = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6"/></svg>`

const ICON_COPY = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`

const ICON_CHECK = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`

function styleActionBtn(btn: HTMLButtonElement) {
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

function setBtnIcon(btn: HTMLButtonElement, svg: string) {
  btn.innerHTML = svg
  const icon = btn.firstElementChild as SVGElement | null
  if (icon) icon.style.pointerEvents = "none"
}

async function copyUrl(url: string) {
  try {
    await navigator.clipboard.writeText(url)
    return true
  } catch {
    const input = document.createElement("textarea")
    input.value = url
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
      copyBtn.title = "复制图片地址"
    }
    copyResetTimer = null
  }, 1200)
}

function ensureHint() {
  if (hint) return hint

  hint = document.createElement("div")
  hint.id = HINT_ID
  Object.assign(hint.style, {
    position: "fixed",
    zIndex: "2147483646",
    display: "none",
    alignItems: "center",
    gap: "2px",
    padding: "2px",
    borderRadius: "9px",
    background: "rgba(20, 32, 51, 0.92)",
    boxShadow: "0 8px 20px rgba(0,0,0,0.28)",
    pointerEvents: "auto"
  })

  const openBtn = document.createElement("button")
  openBtn.type = "button"
  openBtn.title = "新窗口打开该图片"
  openBtn.setAttribute("aria-label", "打开图片")
  styleActionBtn(openBtn)
  setBtnIcon(openBtn, ICON_OPEN)
  openBtn.addEventListener("click", (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!activeUrl) return
    window.open(activeUrl, "_blank", "noopener,noreferrer")
  })

  copyBtn = document.createElement("button")
  copyBtn.type = "button"
  copyBtn.title = "复制图片地址"
  copyBtn.setAttribute("aria-label", "复制地址")
  styleActionBtn(copyBtn)
  setBtnIcon(copyBtn, ICON_COPY)
  copyBtn.addEventListener("click", async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!activeUrl) return
    const ok = await copyUrl(activeUrl)
    if (ok) {
      flashCopied()
      showPageToast("已复制图片地址")
    } else {
      showPageToast("复制失败")
    }
  })

  hint.append(openBtn, copyBtn)
  hint.addEventListener("mouseenter", () => {
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }
  })
  hint.addEventListener("mouseleave", scheduleHide)

  const mount = document.body || document.documentElement
  mount.appendChild(hint)
  return hint
}

function placeHint(el: HTMLElement) {
  const bar = ensureHint()
  const rect = el.getBoundingClientRect()
  const width = bar.offsetWidth || 72
  const top = Math.max(8, rect.top + 8)
  const left = Math.min(
    window.innerWidth - width - 8,
    Math.max(8, rect.right - width - 8)
  )
  bar.style.top = `${top}px`
  bar.style.left = `${left}px`
  bar.style.display = "flex"
}

function showHint(el: HTMLElement, url: string) {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  activeEl = el
  activeUrl = url
  placeHint(el)
}

function hideHint() {
  if (hint) hint.style.display = "none"
  activeEl = null
  activeUrl = ""
}

function scheduleHide() {
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    hideTimer = null
    hideHint()
  }, 180)
}

document.addEventListener(
  "mouseover",
  (e) => {
    const hit = findPicTarget(e.target)
    if (!hit) return
    showHint(hit.el, hit.url)
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
    scheduleHide()
  },
  true
)

window.addEventListener(
  "scroll",
  () => {
    if (activeEl && hint?.style.display === "flex") placeHint(activeEl)
  },
  true
)
