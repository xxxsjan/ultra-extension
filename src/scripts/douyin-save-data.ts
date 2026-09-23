/** 省流模式用的 declarativeNetRequest 动态规则 ID */
export const SAVE_DATA_RULE_IDS = [9101, 9102, 9103, 9104]

/** 清理时多扫一段历史 ID，避免旧版本残留规则把视频继续拦死 */
export const SAVE_DATA_CLEAN_RULE_IDS = Array.from(
  { length: 20 },
  (_, i) => 9101 + i
)

/**
 * 省流开启时的拦截规则：只拦媒体流，尽量不影响弹幕等接口。
 */
export function buildSaveDataRules(): chrome.declarativeNetRequest.Rule[] {
  const liveSites = ["www.douyin.com", "live.douyin.com"]

  return [
    {
      id: 9101,
      priority: 1,
      action: { type: "block" as const },
      condition: {
        initiatorDomains: liveSites,
        resourceTypes: ["media" as const]
      }
    },
    {
      id: 9102,
      priority: 1,
      action: { type: "block" as const },
      condition: {
        urlFilter: "flv",
        initiatorDomains: liveSites,
        resourceTypes: [
          "xmlhttprequest" as const,
          "media" as const,
          "other" as const
        ]
      }
    },
    {
      id: 9103,
      priority: 1,
      action: { type: "block" as const },
      condition: {
        urlFilter: "m3u8",
        initiatorDomains: liveSites,
        resourceTypes: [
          "xmlhttprequest" as const,
          "media" as const,
          "other" as const
        ]
      }
    },
    {
      id: 9104,
      priority: 1,
      action: { type: "block" as const },
      condition: {
        urlFilter: "||douyincdn.com",
        resourceTypes: ["media" as const]
      }
    }
  ]
}

/**
 * 注入到页面 MAIN world 的纯函数（不可引用外部变量，供 executeScript 序列化）。
 * 仅在省流开启时调用；关闭省流应刷新页面，不要保留这些钩子。
 */
export function installSaveDataHooks(enabled: boolean) {
  const w = window as any
  w.__ULTRA_SAVE_DATA__ = enabled

  if (!enabled) {
    // 关闭时只改开关位；真正恢复靠刷新拿干净页面
    return
  }

  const shouldBlockUrl = (url: string) =>
    /flv|m3u8|\.m4s(\?|$)|\.ts(\?|$)|\/pull-|pull_stream|mediastream|livestream/i.test(
      String(url || "")
    )

  if (w.__ULTRA_SAVE_DATA_INSTALLED__) {
    // 已装过钩子，仅按开关停掉现有连接/媒体
    try {
      w.__ULTRA_PCS__ &&
        w.__ULTRA_PCS__.forEach((pc: RTCPeerConnection) => {
          try {
            pc.getSenders().forEach((s) => s.track && s.track.stop())
            pc.getReceivers().forEach((r) => r.track && r.track.stop())
            pc.close()
          } catch (e) {}
        })
    } catch (e) {}

    document.querySelectorAll("video, audio").forEach((node) => {
      const el = node as HTMLMediaElement
      try {
        el.pause()
        el.muted = true
        el.srcObject = null
        el.removeAttribute("src")
        el.load()
      } catch (e) {}
    })
    return
  }

  w.__ULTRA_SAVE_DATA_INSTALLED__ = true
  w.__ULTRA_PCS__ = new Set()

  if (typeof w.RTCPeerConnection !== "undefined") {
    const OrigRTC = w.RTCPeerConnection
    w.__ULTRA_ORIG_RTC__ = OrigRTC
    const PatchedRTC = function (...args: any[]) {
      const pc = new OrigRTC(...args)
      w.__ULTRA_PCS__.add(pc)
      if (w.__ULTRA_SAVE_DATA__) {
        try {
          pc.getSenders().forEach((s: RTCRtpSender) => s.track && s.track.stop())
          pc.getReceivers().forEach((r: RTCRtpReceiver) => r.track && r.track.stop())
          pc.close()
        } catch (e) {}
      }
      return pc
    }
    PatchedRTC.prototype = OrigRTC.prototype
    w.RTCPeerConnection = PatchedRTC
    if (w.webkitRTCPeerConnection) w.webkitRTCPeerConnection = PatchedRTC
  }

  const origFetch = w.fetch.bind(w)
  w.fetch = function (input: any, init: any) {
    const url =
      typeof input === "string"
        ? input
        : input && input.url
          ? input.url
          : String(input)
    if (w.__ULTRA_SAVE_DATA__ && shouldBlockUrl(url)) {
      return Promise.reject(new TypeError("Blocked by ultra save-data"))
    }
    return origFetch(input, init)
  }

  const origOpen = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function (method: string, url: string) {
    ;(this as any).__ultraUrl = String(url)
    return origOpen.apply(this, arguments as any)
  }
  const origSend = XMLHttpRequest.prototype.send
  XMLHttpRequest.prototype.send = function () {
    const url = String((this as any).__ultraUrl || "")
    if (w.__ULTRA_SAVE_DATA__ && shouldBlockUrl(url)) return
    return origSend.apply(this, arguments as any)
  }

  if (typeof SourceBuffer !== "undefined") {
    const origAppend = SourceBuffer.prototype.appendBuffer
    SourceBuffer.prototype.appendBuffer = function (data: BufferSource) {
      if (w.__ULTRA_SAVE_DATA__) return
      return origAppend.call(this, data)
    }
  }

  try {
    w.__ULTRA_PCS__ &&
      w.__ULTRA_PCS__.forEach((pc: RTCPeerConnection) => {
        try {
          pc.getSenders().forEach((s) => s.track && s.track.stop())
          pc.getReceivers().forEach((r) => r.track && r.track.stop())
          pc.close()
        } catch (e) {}
      })
  } catch (e) {}

  document.querySelectorAll("video, audio").forEach((node) => {
    const el = node as HTMLMediaElement
    try {
      el.pause()
      el.muted = true
      el.srcObject = null
      el.removeAttribute("src")
      el.load()
    } catch (e) {}
  })
}
