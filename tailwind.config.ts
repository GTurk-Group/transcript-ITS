import type { Config } from "tailwindcss";

const config: Config = {
  // ─── Dark mode ────────────────────────────────────────────────────────────
  //
  // "class" strategy: dark mode is enabled by toggling the "dark" class
  // on <html>. The AppShell component manages this via localStorage.
  darkMode: "class",

  // ─── Content ──────────────────────────────────────────────────────────────
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],

  theme: {
    extend: {
      // ─── Animations ───────────────────────────────────────────────────────
      keyframes: {
        "slide-in": {
          "0%":   { opacity: "0", transform: "translateX(1rem)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-out": {
          "0%":   { opacity: "1", transform: "translateX(0)" },
          "100%": { opacity: "0", transform: "translateX(1rem)" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "slide-in":  "slide-in 0.2s ease-out",
        "slide-out": "slide-out 0.15s ease-in",
        "fade-in":   "fade-in 0.15s ease-out",
      },
    },
  },

  plugins: [],
};

export default config;
