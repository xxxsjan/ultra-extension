console.log("this is content js");

// popup 中使用 chrome.tabs.sendMessage 发送消息，content 中使用 chrome.runtime.onMessage.addListener 接收消息
chrome.runtime.onMessage.addListener((e) => {
  console.log("onMessage", e);
});

// popup 中使用 chrome.tabs.connect 发送消息，content 使用 chrome.runtime.onConnect.addListener 来接收消息
chrome.runtime.onConnect.addListener((res) => {
  console.log("contentjs中的 chrome.runtime.onConnect：", res);
  if (res.name === "connect-fromPopup2Content") {
    res.onMessage.addListener((mess) => {
      console.log("contentjs中的 res.onMessage.addListener：", mess);
      res.postMessage("哈哈哈，我是contentjs");
    });
  }

  if (res.name === "fromPopup") {
    res.onMessage.addListener((mess) => {
      console.log("mess: ", mess);
      const _el = document.querySelectorAll(
        "#messageContent .xAxX7KyW .A1KpIsbL.HO4aqgd4"
      );
      console.log("_el: ", _el);
      const res = [];
      _el.forEach((item) => {
        const nickname = item.querySelector(".VYqsvYoD").innerText;

        const msgEl = item.querySelector(".WCSQFekt span pre");
        const msg = msgEl?.innerText;

        const kaiboEl = item.querySelector(".eqPQd3M6 .JcoJj88b");
        const weikaiboEl = item.querySelector(".eqPQd3M6 .w0uZF25w");

        console.log("msg: ", msg);
        console.log("nickname: ", nickname);
      });
    });
  }
});
