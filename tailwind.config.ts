import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#fafaf9",
          100: "#f5f5f7",
          200: "#ecebe8",
          300: "#dedbd5",
        },
        forest: {
          DEFAULT: "#175d3b",
          dark: "#0e3d27",
          light: "#2c7a52",
          50: "#e9f1ec",
        },
        peach: {
          DEFAULT: "#f4b886",
          light: "#f9d2ae",
          dark: "#e09e6a",
        },
        taupe: {
          DEFAULT: "#beb0a7",
          light: "#d8cfc8",
          dark: "#807466",
          muted: "#a8998d",
        },
        ink: {
          DEFAULT: "#1c1f1d",
          soft: "#3a3f3c",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "system-ui",
          "sans-serif",
        ],
        serif: [
          '"EB Garamond"',
          "Garamond",
          '"Iowan Old Style"',
          '"Hoefler Text"',
          "serif",
        ],
        display: ["etoile", '"EB Garamond"', "Garamond", "serif"],
      },
      borderRadius: {
        DEFAULT: "0.375rem",
      },
    },
  },
  plugins: [],
};

export default config;
