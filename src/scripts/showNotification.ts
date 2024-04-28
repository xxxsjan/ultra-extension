import icon from "../../assets/icon.development.png"

export default function ({ title = "", message = "" }) {
  chrome.notifications.create(
    {
      type: "basic",
      title,
      message,
      iconUrl: icon
    },
    (notificationId) => {
      console.log("notificationId-->", notificationId)
    }
  )
}
