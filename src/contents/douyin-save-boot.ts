import type { PlasmoCSConfig } from "plasmo"

import { DOUYIN_KEYS, SAVE_DATA_PENDING_KEY } from "~scripts/douyin-config"

/**
 * document_start：
 * - 省流开：尽早挂拦截规则并注入钩子
 * - 省流关：只清网络规则，不注入任何拦截脚本（页面保持原样）
 */
export const config: PlasmoCSConfig = {
  matches: ["https://www.douyin.com/*", "https://live.douyin.com/*"],
  run_at: "document_start"
}

function isLivePage() {
  const href = location.href
  const path = location.pathname
  return (
    /\/live(\/|$)/.test(path) ||
    /(^|\.)live\.douyin\.com$/i.test(location.hostname) ||
    /douyin\.com\/.*live/i.test(href)
  )
}

function readPendingSaveData(): boolean | null {
  try {
    const raw = sessionStorage.getItem(SAVE_DATA_PENDING_KEY)
    if (raw === "1") return true
    if (raw === "0") return false
  } catch {
    // ignore
  }
  return null
}

function clearPendingSaveData() {
  try {
    sessionStorage.removeItem(SAVE_DATA_PENDING_KEY)
  } catch {
    // ignore
  }
}

function applySaveData(enabled: boolean) {
  chrome.runtime.sendMessage(
    {
      action: "douyin-save-data",
      // 关：不注入；开：注入钩子
      payload: { enabled, skipInject: !enabled }
    },
    () => {
      void chrome.runtime.lastError
    }
  )
}

if (isLivePage()) {
  const pending = readPendingSaveData()

  if (pending !== null) {
    clearPendingSaveData()
    try {
      chrome.storage.local.set({ [DOUYIN_KEYS.SAVE_DATA]: pending }, () => {
        void chrome.runtime.lastError
        applySaveData(pending)
      })
    } catch {
      applySaveData(pending)
    }
  } else {
    chrome.storage.local.get([DOUYIN_KEYS.SAVE_DATA], (result) => {
      const enabled =
        result[DOUYIN_KEYS.SAVE_DATA] === undefined
          ? true
          : Boolean(result[DOUYIN_KEYS.SAVE_DATA])
      applySaveData(enabled)
    })
  }
}
