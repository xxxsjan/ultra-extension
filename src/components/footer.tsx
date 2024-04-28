import { useEffect, useState } from "react"

function Footer(props) {
  return (
    <div className="popup-footer">
      <span>© 2024 xxxsjan&nbsp;</span>
      <span>&nbsp;</span>

      <span>power by </span>
      <span>&nbsp;</span>

      {/* <a
        target="_blank"
        href="https://developer.chrome.com/docs/extensions/develop?hl=zh-cn">
        google extensions
      </a>
      <span>&nbsp;/&nbsp;</span> */}

      <a href="https://docs.plasmo.com" target="_blank" className="text-right">
        plasmo
      </a>
    </div>
  )
}
export default Footer
