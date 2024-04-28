/** @type {import('tailwindcss').Config} */
module.exports = {
  // content: [],
  content: ["./src/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    extend: {},
    minHeight: {
      0: "0",
      "1/4": "25%",
      "1/2": "50%",
      "3/4": "75%",
      full: "100%"
    }
  },
  plugins: [require("daisyui")]
}
