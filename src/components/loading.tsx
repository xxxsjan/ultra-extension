import { useEffect, useState } from "react"

import "./loading.css"

function Loading(props) {
  console.log("props: ", props)
  const num = Math.floor(Math.random() * 10 - 0) + 1
  const [clsName, setClsName] = useState("progress-" + num)
  console.log("num: ", num)
  return (
    <>
      <div className="loading-container flex flex-col justify-center items-center">
        <div className={clsName}></div>
        <div> {props.text}</div>
      </div>
    </>
  )
}
export default Loading
