const colors = require("tailwindcss/colors");
const plugin = require("tailwindcss/plugin");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: colors.stone[900],
        secondary: colors.stone[100],
      },
    },
  },
  plugins: [
    function ({ addUtilities, theme }) {
      addUtilities({
        ".selected-1": {
          transform: "translate(-0.2rem,-0.2rem)",
          boxShadow: "0.2rem 0.2rem",
        },
        ".selected-2": {
          boxShadow: "0.2rem 0.2rem",
        }
      });
    },
  ],
};
