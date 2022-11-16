interface YoudaoTransRes {
  type: string
  errorCode: number
  isWord: boolean
  query: string
  elapsedTime: number
  translation: string[]
}
interface GoogleTransRes {
  sentences: { trans: string; orig: string; backend: number }[]
  src: string
  confidence: number
  spell: {}
  ld_result: {
    srclangs: string[]
    srclangs_confidences: number[]
    extended_srclangs: string[]
  }
}
interface Options {
  to: string
  from: string
}

// youdao 翻译
export async function youdaoTrans(queryStr: string): Promise<string> {
  const url = `http://aidemo.youdao.com/trans?q=${queryStr}&from=Auto&to=Auto`
  const res = await fetch(url)
  const data: YoudaoTransRes = await res.json()
  console.log("🚀🚀🚀 / data", data)
  return data.translation[0]
}

// google 翻译
export async function googleTrans(
  text: string,
  options: Options = {
    from: "auto",
    to: "zh-CN"
  }
): Promise<string> {
  const { from, to } = options
  const plainText = encodeURI(text)
  const url = `https://translate.google.com/translate_a/single?client=gtx&dt=t&dt=bd&dj=1&source=input&q=${plainText}&sl=${from}&tl=${to}`

  const res = await fetch(url)
  const data: GoogleTransRes = await res.json()
  return data.sentences.map((it) => it.trans).join("")
}
