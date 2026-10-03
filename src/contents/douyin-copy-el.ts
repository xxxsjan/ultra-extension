import type { PlasmoCSConfig } from "plasmo"

import { showPageToast } from "~scripts/page-toast"

export const config: PlasmoCSConfig = {
  matches: ["https://www.douyin.com/*", "https://live.douyin.com/*"],
  run_at: "document_idle"
}

const HINT_ID = "ultra-douyin-el-copy-hint"
const TARGET_CLASS = "muiGrjCv"

let hint: HTMLDivElement | null = null
let copyBtn: HTMLButtonElement | null = null
let activeEl: HTMLElement | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null
let copyResetTimer: ReturnType<typeof setTimeout> | null = null

const ICON_COPY = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`

const ICON_CHECK = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`

function findTarget(start: EventTarget | null): HTMLElement | null {
  let node = start instanceof Element ? start : null
  if (node?.id === HINT_ID || node?.closest?.(`#${HINT_ID}`)) {
    return activeEl
  }
  const hit = node?.closest?.(`.${TARGET_CLASS}`)
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

function ensureHint() {
  if (hint) return hint

  hint = document.createElement("div")
  hint.id = HINT_ID
  Object.assign(hint.style, {
    position: "fixed",
    zIndex: "2147483646",
    display: "none",
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
  Object.assign(copyBtn.style, {
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
  copyBtn.addEventListener("mouseenter", () => {
    if (copyBtn) copyBtn.style.background = "rgba(255,255,255,0.12)"
  })
  copyBtn.addEventListener("mouseleave", () => {
    if (copyBtn) copyBtn.style.background = "transparent"
  })
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

  hint.append(copyBtn)
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
  const width = bar.offsetWidth || 34
  const top = Math.max(8, rect.top + 4)
  const left = Math.min(
    window.innerWidth - width - 8,
    Math.max(8, rect.right - width - 4)
  )
  bar.style.top = `${top}px`
  bar.style.left = `${left}px`
  bar.style.display = "flex"
}

function showHint(el: HTMLElement) {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  activeEl = el
  placeHint(el)
}

function hideHint() {
  if (hint) hint.style.display = "none"
  activeEl = null
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
