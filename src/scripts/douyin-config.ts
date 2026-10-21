/** 抖音直播弹幕相关 storage key */
export const DOUYIN_KEYS = {
  TEXT: "DOUYIN_DANMAKU_TEXT",
  INTERVAL: "DOUYIN_DANMAKU_INTERVAL",
  RUNNING: "DOUYIN_DANMAKU_RUNNING",
  SAVE_DATA: "DOUYIN_SAVE_DATA",
  /** 悬浮面板是否处于最小化（收起）状态 */
  MINIMIZED: "DOUYIN_PANEL_MINIMIZED",
  /** 是否随机发送（多条弹幕中随机挑一条） */
  RANDOM_TEXT: "DOUYIN_DANMAKU_RANDOM_TEXT",
  /** 是否随机间隔 */
  RANDOM_INTERVAL: "DOUYIN_DANMAKU_RANDOM_INTERVAL",
  /** 随机间隔的最大秒数（>= 最小间隔） */
  MAX_INTERVAL: "DOUYIN_DANMAKU_MAX_INTERVAL"
} as const

/**
 * 页面 session 兜底：扩展热更新后 chrome.* 失效时，
 * 仍能记下开关意图，刷新后由新内容脚本写入 chrome.storage。
 */
export const SAVE_DATA_PENDING_KEY = "ULTRA_DOUYIN_SAVE_DATA_PENDING"

export const DOUYIN_DEFAULTS = {
  TEXT: "",
  INTERVAL: 10,
  /** 随机间隔的最大秒数默认值 */
  MAX_INTERVAL: 20,
  RANDOM_TEXT: false,
  RANDOM_INTERVAL: false
}

/** 发送间隔下限（秒），平台风控 */
export const MIN_INTERVAL = 3

/**
 * 把多行文本拆成弹幕条目数组。
 * - 按换行分隔
 * - 去掉首尾空白与空行
 */
export function splitDanmakuList(text: string): string[] {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

/** 从候选列表中随机取一条（不重复优先，取完才允许重复） */
export function pickRandomDanmaku(
  list: string[],
  used?: Set<string>
): string | null {
  const pool = list.filter(Boolean)
  if (!pool.length) return null
  if (used) {
    const fresh = pool.filter((item) => !used.has(item))
    if (fresh.length) {
      const picked = fresh[Math.floor(Math.random() * fresh.length)]
      used.add(picked)
      return picked
    }
  }
  const picked = pool[Math.floor(Math.random() * pool.length)]
  used?.add(picked)
  return picked
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
  /** 悬浮面板是否最小化 */
  minimized: boolean
  /** 多条弹幕中随机发送 */
  randomText: boolean
  /** 随机间隔 */
  randomInterval: boolean
  /** 随机间隔的最大秒数 */
  maxInterval: number
}

export function getDouyinConfig(
  result: Record<string, unknown>
): DouyinDanmakuConfig {
  const intervalRaw = Number(result[DOUYIN_KEYS.INTERVAL])
  const maxIntervalRaw = Number(result[DOUYIN_KEYS.MAX_INTERVAL])
  // 未配置过时默认开省流；仅当明确存了 false 才视为关闭
  const saveData =
    result[DOUYIN_KEYS.SAVE_DATA] === undefined
      ? true
      : Boolean(result[DOUYIN_KEYS.SAVE_DATA])
  // 悬浮窗默认最小化；仅当明确存了 false 才视为展开
  const minimized =
    result[DOUYIN_KEYS.MINIMIZED] === undefined
      ? true
      : Boolean(result[DOUYIN_KEYS.MINIMIZED])
  const interval =
    Number.isFinite(intervalRaw) && intervalRaw > 0
      ? intervalRaw
      : DOUYIN_DEFAULTS.INTERVAL
  const maxInterval =
    Number.isFinite(maxIntervalRaw) && maxIntervalRaw > 0
      ? maxIntervalRaw
      : DOUYIN_DEFAULTS.MAX_INTERVAL
  return {
    text: (result[DOUYIN_KEYS.TEXT] as string) || DOUYIN_DEFAULTS.TEXT,
    interval,
    running: Boolean(result[DOUYIN_KEYS.RUNNING]),
    saveData,
    minimized,
    randomText: Boolean(result[DOUYIN_KEYS.RANDOM_TEXT]),
    randomInterval: Boolean(result[DOUYIN_KEYS.RANDOM_INTERVAL]),
    maxInterval: Math.max(interval, maxInterval)
  }
}
