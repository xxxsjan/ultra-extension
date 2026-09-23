/**
 * 在 GitHub 仓库页注入「跳转 1s」按钮，打开对应 github1s 在线编辑地址。
 */

const BTN_ID = "ultra-github1s-btn"

function isRepoPage() {
  // /owner/repo 或 /owner/repo/...
  const parts = location.pathname.split("/").filter(Boolean)
  if (parts.length < 2) return false
  const reserved = new Set([
    "settings",
    "notifications",
    "marketplace",
    "explore",
    "topics",
    "trending",
    "collections",
    "events",
    "sponsors",
    "login",
    "signup",
    "orgs",
    "organizations",
    "users",
    "search",
    "pulls",
    "issues",
    "codespaces",
    "account",
    "new"
  ])
  return !reserved.has(parts[0].toLowerCase())
}

function toGithub1s() {
  const url = new URL(location.href)
  url.hostname = url.hostname.replace("github.com", "github1s.com")
  location.href = url.toString()
}

function findToolbar() {
  return (
    document.querySelector("ul.pagehead-actions") ||
    document.querySelector(".pagehead-actions") ||
    document.querySelector('[data-selector="repos-container"] .d-flex') ||
    document.querySelector("div.d-flex.flex-wrap.flex-items-start") ||
    document.querySelector(".Layout-sidebar") ||
    document.querySelector("main .AppHeader-context") ||
    null
  )
}

function ensureButton() {
  if (!isRepoPage()) {
    document.getElementById(BTN_ID)?.remove()
    return
  }
  if (document.getElementById(BTN_ID)) return

  const btn = document.createElement("button")
  btn.id = BTN_ID
  btn.type = "button"
  btn.textContent = "跳转 1s"
  btn.title = "用 github1s 打开当前仓库"
  Object.assign(btn.style, {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "8px",
    padding: "5px 12px",
    fontSize: "12px",
    fontWeight: "600",
    lineHeight: "20px",
    color: "#24292f",
    background: "#f6f8fa",
    border: "1px solid rgba(31,35,40,0.15)",
    borderRadius: "6px",
    cursor: "pointer",
    verticalAlign: "middle"
  })
  btn.addEventListener("mouseenter", () => {
    btn.style.background = "#f3f4f6"
  })
  btn.addEventListener("mouseleave", () => {
    btn.style.background = "#f6f8fa"
  })
  btn.addEventListener("click", (e) => {
    e.preventDefault()
    e.stopPropagation()
    toGithub1s()
  })

  const toolbar = findToolbar()
  if (toolbar) {
    // pagehead-actions 是 ul，包一层 li 更贴合 GitHub 结构
    if (toolbar.tagName === "UL") {
      const li = document.createElement("li")
      li.appendChild(btn)
      toolbar.prepend(li)
    } else {
      toolbar.prepend(btn)
    }
    return
  }

  // 找不到工具栏时，固定到右上角兜底
  Object.assign(btn.style, {
    position: "fixed",
    top: "72px",
    right: "16px",
    zIndex: "9999",
    marginLeft: "0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.12)"
  })
  document.documentElement.appendChild(btn)
}

chrome.runtime.onMessage.addListener(function (request, _sender, _sendResponse) {
  if (request.action === "redirect") {
    if (request.url) {
      window.location.href = request.url
    } else {
      toGithub1s()
    }
  }
})

function boot() {
  ensureButton()
  // GitHub 为 SPA，路由变化后重挂
  let lastHref = location.href
  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href
      ensureButton()
    } else if (isRepoPage() && !document.getElementById(BTN_ID)) {
      ensureButton()
    }
  }, 1200)
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => setTimeout(boot, 500))
} else {
  setTimeout(boot, 500)
}
