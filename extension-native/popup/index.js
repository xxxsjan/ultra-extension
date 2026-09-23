const copyrightYearEl = document.getElementById("copyright-year")
if (copyrightYearEl) {
  copyrightYearEl.textContent = String(new Date().getFullYear())
}

const translateResultEl = document.querySelector(".translate-result")
const fanyiBtn = document.querySelector(".fanyiBtn")
const inputArea = document.querySelector(".inputArea")

console.log("popup")

if (fanyiBtn) {
  fanyiBtn.onclick = function () {
    const value = inputArea.value
    if (value) {
      translateResultEl && (translateResultEl.innerText = value)
    }
  }
}

const toBg = document.getElementById("toBg")
if (toBg) {
  toBg.onclick = function () {
    chrome.runtime.sendMessage({ action: "toBg" })
  }
}
