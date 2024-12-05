const dyBtn = document.getElementById("dyBtn");

const translateResultEl = document.querySelector(".translate-result");

const fanyiBtn = document.querySelector(".fanyiBtn");

const inputArea = document.querySelector(".inputArea");
console.log("popup");
if (dyBtn) {
  dyBtn.onclick = async function getMessageContent() {
    const [tab] = await chrome.tabs.query({
      url: ["https://www.douyin.com/user/self"],
      active: true,
      currentWindow: true,
    });
    console.log(tab);
    if (tab) {
      const connect = chrome.tabs.connect(tab.id, { name: "fromPopup" });
      connect.postMessage({ action: "getMessageContent", payload: {} });
      connect.onMessage.addListener((mess) => {
        console.log(mess);
      });
    }
  };
}
if (fanyiBtn) {
  fanyiBtn.onclick = function () {
    const value = inputArea.value;
    if (value) {
      translateResultEl && (translateResultEl.innerText = value);
    }
  };
}
async function send() {
  const [tab] = await chrome.tabs.query({
    url: ["https://movie.douban.com/*"],
    active: true,
    currentWindow: true,
  });
  console.log("tab", tab);
  if (tab) {
    chrome.tabs.sendMessage(tab.id, {
      action: "fromPopup2Content",
    });
  }
}

async function send2() {
  const [tab] = await chrome.tabs.query({
    url: ["https://movie.douban.com/*"],
    active: true,
    currentWindow: true,
  });
  const connect = chrome.tabs.connect(tab.id, { name: "connect-fromPopup2Content" });
  console.log("connect", connect);
  connect.postMessage("这里是弹出框页面，你是谁？");
  connect.onMessage.addListener((mess) => {
    console.log(mess);
  });
}

// 获取cookie
async function getCookie() {
  const cookies = await chrome.cookies.getAll({ domain: ".lkcoffee.com" });
  console.log("popup cookies--->", cookies);
  const urlCookies = await chrome.cookies.getAll({
    url: "https://leaptest03.lkcoffee.com/",
  });
  console.log("popup urlCookies", urlCookies);
}

const btn1s = document.getElementById("btn1s");
function to1s() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var currentTab = tabs[0];
    const tabId = currentTab.id;

    var currentUrl = new URL(currentTab.url);

    const { protocol, pathname, host } = currentUrl;

    if (host !== "github.com") {
      chrome.notifications.create(
        {
          type: "basic",
          title: "提示",
          message: "当前不在github站点",
          iconUrl: "../icons/icon.png",
        },
        (notificationId) => {
          console.log("notificationId-->", notificationId);
        }
      );
      return;
    }
    const newUrl = `${protocol}//${host.replace(
      "github",
      "github1s"
    )}${pathname}`;

    chrome.tabs.sendMessage(tabId, {
      action: "redirect",
      url: newUrl,
    });
  });
}
if (btn1s) {
  btn1s.onclick = to1s;
}

const toBg = document.getElementById("toBg");
if (toBg) {
  toBg.onclick = function () {
    chrome.runtime.sendMessage({ action: "toBg" });
  };
}
