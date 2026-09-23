function Footer(props) {
  return (
    <div className="popup-footer">
      <span>© {new Date().getFullYear()}&nbsp;</span>
      <a href="https://github.com/xxxsjan " target="_blank">
        xxxsjan
      </a>
      <span>&nbsp;</span>
      <span>power by </span>
      <span>&nbsp;</span>
      <a href="https://docs.plasmo.com" target="_blank" className="text-right">
        plasmo
      </a>
    </div>
  )
}
export default Footer
