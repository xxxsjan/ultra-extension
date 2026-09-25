/** 抖音直播弹幕相关 storage key */
export const DOUYIN_KEYS = {
  TEXT: "DOUYIN_DANMAKU_TEXT",
  INTERVAL: "DOUYIN_DANMAKU_INTERVAL",
  RUNNING: "DOUYIN_DANMAKU_RUNNING",
  SAVE_DATA: "DOUYIN_SAVE_DATA"
} as const

/**
 * 页面 session 兜底：扩展热更新后 chrome.* 失效时，
 * 仍能记下开关意图，刷新后由新内容脚本写入 chrome.storage。
 */
export const SAVE_DATA_PENDING_KEY = "ULTRA_DOUYIN_SAVE_DATA_PENDING"

export const DOUYIN_DEFAULTS = {
  TEXT: "",
  INTERVAL: 10
}

/**
 * 是否为抖音「直播间」地址（面板与省流只在这里生效）。
 * 支持：
 * - https://live.douyin.com/{房间号}
 * - https://www.douyin.com/live/{房间号}
 * - https://www.douyin.com/root/live/{房间号}
 * - https://www.douyin.com/.../live/{房间号}
 */
export function isDouyinLiveRoom(
  loc: Pick<Location, "hostname" | "pathname"> = location
) {
  const host = loc.hostname.toLowerCase()
  const path = loc.pathname

  // live.douyin.com/123456 （需带房间路径，首页不算）
  if (host === "live.douyin.com" || host.endsWith(".live.douyin.com")) {
    const seg = path.split("/").filter(Boolean)[0]
    return Boolean(seg) && /^[\w-]+$/i.test(seg)
  }

  // www.douyin.com/.../live/{id} ，必须是路径段 /live/xxx
  if (host === "www.douyin.com" || host === "douyin.com") {
    return /\/live\/[^/?#]+/i.test(path)
  }

  return false
}

export type DouyinDanmakuConfig = {
  text: string
  /** 发送间隔（秒） */
  interval: number
  running: boolean
  /** 省流：拦截直播画面，只保留弹幕 */
  saveData: boolean
}

export function getDouyinConfig(
  result: Record<string, unknown>
): DouyinDanmakuConfig {
  const intervalRaw = Number(result[DOUYIN_KEYS.INTERVAL])
  // 未配置过时默认开省流；仅当明确存了 false 才视为关闭
  const saveData =
    result[DOUYIN_KEYS.SAVE_DATA] === undefined
      ? true
      : Boolean(result[DOUYIN_KEYS.SAVE_DATA])
  return {
    text: (result[DOUYIN_KEYS.TEXT] as string) || DOUYIN_DEFAULTS.TEXT,
    interval:
      Number.isFinite(intervalRaw) && intervalRaw > 0
        ? intervalRaw
        : DOUYIN_DEFAULTS.INTERVAL,
    running: Boolean(result[DOUYIN_KEYS.RUNNING]),
    saveData
  }
}
