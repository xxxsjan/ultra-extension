import translate from "./scripts/translate"
import { DOUYIN_KEYS } from "./scripts/douyin-config"
import {
  SAVE_DATA_CLEAN_RULE_IDS,
  buildSaveDataRules,
  installSaveDataHooks
} from "./scripts/douyin-save-data"

export {}

console.log("❤️ ❤️ background.js")

/** 串行化 DNR 更新，避免启动同步与消息处理并发导致规则 ID 冲突 */
let dnrQueue: Promise<void> = Promise.resolve()

function enqueueDnr<T>(task: () => Promise<T>): Promise<T> {
  const run = dnrQueue.then(task, task)
  dnrQueue = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

async function clearAllSaveDataRules() {
  if (!chrome.declarativeNetRequest?.updateDynamicRules) {
    throw new Error("当前浏览器不支持 declarativeNetRequest")
  }

  // 1) 清已知 ID 段（含历史版本）
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: SAVE_DATA_CLEAN_RULE_IDS
  })

  // 2) 再扫一遍动态规则，兜底删掉仍残留的省流 ID
  if (chrome.declarativeNetRequest.getDynamicRules) {
    const existing = await chrome.declarativeNetRequest.getDynamicRules()
    const leftover = existing
      .map((r) => r.id)
      .filter((id) => id >= 9101 && id <= 9120)
    if (leftover.length) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: leftover
      })
    }
  }
}

async function setSaveDataNetworkBlock(enabled: boolean) {
  if (!chrome.declarativeNetRequest?.updateDynamicRules) {
    throw new Error("当前浏览器不支持 declarativeNetRequest")
  }

  return enqueueDnr(async () => {
    // 关闭：彻底清规则，页面即可按原样拉流
    if (!enabled) {
      await clearAllSaveDataRules()
      return
    }

    const rules = buildSaveDataRules()
    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: SAVE_DATA_CLEAN_RULE_IDS,
        addRules: rules
      })
      return
    } catch (err: any) {
      console.warn("DNR batch add failed, fallback one-by-one", err)
    }

    await clearAllSaveDataRules()

    const errors: string[] = []
    for (const rule of rules) {
      try {
        await chrome.declarativeNetRequest.updateDynamicRules({
          addRules: [rule]
        })
      } catch (e: any) {
        errors.push(`#${rule.id}:${e?.message || e}`)
      }
    }
    if (errors.length === rules.length) {
      throw new Error(errors[0] || "网络拦截规则添加失败")
    }
  })
}

async function injectSaveDataHooks(tabId: number, enabled: boolean) {
  if (!enabled) return
  if (!chrome.scripting?.executeScript) {
    throw new Error("缺少 scripting 权限，请重新加载扩展")
  }
  await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    world: "MAIN",
    func: installSaveDataHooks,
    args: [true]
  })
}

function readSaveDataEnabled(result: Record<string, unknown>) {
  return result[DOUYIN_KEYS.SAVE_DATA] === undefined
    ? true
    : Boolean(result[DOUYIN_KEYS.SAVE_DATA])
}

/** 按本地记忆同步拦截规则（开=挂规则，关=清干净） */
async function syncSaveDataFromStorage() {
  const result = await chrome.storage.local.get([DOUYIN_KEYS.SAVE_DATA])
  const enabled = readSaveDataEnabled(result)
  await setSaveDataNetworkBlock(enabled)
  return enabled
}

chrome.runtime.onInstalled.addListener(() => {
  syncSaveDataFromStorage().catch(console.error)
})

chrome.runtime.onStartup.addListener(() => {
  syncSaveDataFromStorage().catch(console.error)
})

// service worker 醒来时也同步一次
syncSaveDataFromStorage().catch(console.error)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("request.action: ", request.action)

  if (request.action === "translate") {
    translate(request.payload.text)
      .then((data) => sendResponse(data))
      .catch((err) =>
        sendResponse(err || { error_code: "UNKNOWN", error_msg: "翻译失败" })
      )
    return true
  }

  if (request.action === "douyin-save-data") {
    const enabled = Boolean(request.payload?.enabled)
    const tabId = sender.tab?.id
    // 关闭省流时强制不注入；开启时才注入页面钩子
    const skipInject =
      !enabled || Boolean(request.payload?.skipInject)
    ;(async () => {
      await chrome.storage.local.set({ [DOUYIN_KEYS.SAVE_DATA]: enabled })

      let dnrOk = false
      let injectOk = false
      const notes: string[] = []

      try {
        await setSaveDataNetworkBlock(enabled)
        dnrOk = true
      } catch (err: any) {
        console.error("setSaveDataNetworkBlock", err)
        notes.push(`网络规则: ${err?.message || err}`)
      }

      if (!skipInject && typeof tabId === "number") {
        try {
          await injectSaveDataHooks(tabId, true)
          injectOk = true
        } catch (err: any) {
          console.error("injectSaveDataHooks", err)
          notes.push(`页面注入: ${err?.message || err}`)
        }
      }

      // 关闭：只要清规则成功（或仅落盘+刷新）即可
      // 开启：规则或注入任一成功；skipInject 的刷新流程以落盘为准
      const ok = !enabled
        ? dnrOk || Boolean(request.payload?.skipInject)
        : skipInject || dnrOk || injectOk

      sendResponse({
        ok,
        enabled,
        dnrOk,
        injectOk,
        error_msg: ok
          ? undefined
          : notes.join("；") ||
            "省流操作失败，请到 chrome://extensions 重新加载扩展"
      })
    })().catch((err) => {
      console.error(err)
      sendResponse({
        ok: false,
        error_msg: err?.message || "省流操作失败"
      })
    })
    return true
  }

  if (request.action === "douyin-save-data-sync") {
    ;(async () => {
      const enabled = await syncSaveDataFromStorage()
      const tabId = sender.tab?.id
      // 仅省流开启时注入；关闭时绝不碰页面脚本
      if (enabled && typeof tabId === "number") {
        try {
          await injectSaveDataHooks(tabId, true)
        } catch (e) {
          console.warn(e)
        }
      }
      sendResponse({ ok: true, enabled })
    })().catch((err) => {
      sendResponse({ ok: false, error_msg: err?.message || "同步失败" })
    })
    return true
  }

  return false
})
