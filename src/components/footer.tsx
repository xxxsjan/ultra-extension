import { useEffect, useState } from "react"

function Footer(props) {
  return (
    <div className="popup-footer">
      <span>© 2024 xxxsjan</span>

      <span>
        power by
        <a
          target="_blank"
          href="https://developer.chrome.com/docs/extensions/develop?hl=zh-cn">
          by google extensions
        </a>
        <a
          href="https://docs.plasmo.com"
          target="_blank"
          className="text-right">
          plasmo
        </a>
      </span>
    </div>
  )
}
export default Footer
