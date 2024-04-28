import { useState } from "react"

import "./styles/tailwind.css"

function IndexOptions() {
  const [data, setData] = useState("")

  return (
    <div className="">
      <h1 className="text">
        Welcome to your <a href="https://www.plasmo.com">Plasmo</a> Extension!
      </h1>
      <button className="btn btn-neutral">233</button>
    </div>
  )
}

export default IndexOptions
