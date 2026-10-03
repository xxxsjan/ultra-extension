const TOAST_ID = "ultra-page-toast"
let toastTimer: ReturnType<typeof setTimeout> | null = null

export function showPageToast(message: string) {
  let el = document.getElementById(TOAST_ID) as HTMLDivElement | null
  if (!el) {
    el = document.createElement("div")
    el.id = TOAST_ID
    Object.assign(el.style, {
      position: "fixed",
      left: "50%",
      bottom: "48px",
      transform: "translateX(-50%)",
      zIndex: "2147483647",
      padding: "10px 16px",
      borderRadius: "10px",
      background: "rgba(20, 32, 51, 0.94)",
      color: "#fff",
      fontSize: "13px",
      fontWeight: "600",
      fontFamily: "system-ui, sans-serif",
      lineHeight: "1.4",
      boxShadow: "0 10px 24px rgba(0,0,0,0.28)",
      pointerEvents: "none",
      opacity: "0",
      transition: "opacity 0.16s ease"
    })
    ;(document.body || document.documentElement).appendChild(el)
  }

  el.textContent = message
  el.style.opacity = "1"
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    if (el) el.style.opacity = "0"
    toastTimer = null
  }, 1600)
}
