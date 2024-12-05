console.log(location);

// 在内容页面中接收来自popup页面的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "redirect") {
    window.location.href = request.url;
  }
});
