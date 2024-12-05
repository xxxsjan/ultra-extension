import "./module_1.js";

console.log("background");

chrome.runtime.onMessage.addListener(async (payload, sender, sendResponse) => {
  if (payload.action === "fromPopup") {
    chrome.notifications.create(
      {
        type: "basic",
        title: "Notifications Title",
        message: payload.message,
        iconUrl: "../icons/icon.png",
      },
      (notificationId) => {
        console.log("notificationId-->", notificationId);
      }
    );
  }

  if (payload.action === "fromContent") {
    chrome.notifications.create(
      {
        type: "basic",
        title: "Notifications Title",
        message: "Notifications message to display",
        iconUrl: "../icons/icon.png",
      },
      (notificationId) => {
        console.log("notificationId-->", notificationId);
      }
    );
  }
  console.log(payload.action);
});

// 获取cookie
async function getCookie(name) {
  const cookies = await chrome.cookies.getAll({ domain: ".lkcoffee.com" });
  console.log("service worker cookies--->", cookies);
}
