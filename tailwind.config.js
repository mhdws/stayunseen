/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./assets/app.js"],
  theme: {
    extend: {
      colors: {
        surface: "#12161f",
        deep: "#161b26",
        panel: "#1e2433",
        elevated: "#262e40",
        void: "#07080a",
        ink: "#f1f5f9",
        muted: "#94a3b8",
        shield: "#6366f1",
        violet: "#7c3aed",
        story: "#38bdf8",
        receipt: "#c084fc",
        typing: "#34d399",
        /* canonical brand ramp + status tones read off the shipped product */
        steel: "#83b8d7",
        indigo: "#405687",
        grape: "#8877c5",
        lav: "#a7a0e8",
        good: "#79d8a2",
        amber: "#e0b36a"
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "Inter", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"]
      },
      letterSpacing: { tightest: "-0.035em" },
      boxShadow: {
        card: "0 40px 90px -50px rgba(0,0,0,.95)",
        glow: "0 0 0 1px rgba(99,102,241,.45), 0 0 45px -10px rgba(99,102,241,.6)",
        "glow-cyan": "0 0 40px -12px rgba(56,189,248,.7)"
      }
    }
  },
  plugins: []
};
