/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // "./src/**/*.{html,js}"
    "./popup/index.html",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
};
