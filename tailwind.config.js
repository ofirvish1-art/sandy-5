/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // "Hulit" (חולית) brand palette
        olive: {
          DEFAULT: "#3A523D", // Deep Olive Green — footer, headings, emphasis
          light: "#4A6B4E",
          night: "#1F2E20", // near-black header/nav green from the reference design
        },
        demand: "#C0392B", // demand-side red used on the calendar + toggles
        sage: {
          DEFAULT: "#B2D8A2", // Light Sage / Pistachio — CTA buttons, active chips
          dark: "#A8C297", // card backgrounds
        },
        forest: "#213523", // Dark Forest Text — body text, inputs
        cream: {
          DEFAULT: "#F7F9F6", // section backgrounds
          pure: "#FFFFFF",
        },
        // Status chips referenced across listing cards
        status: {
          active: "#B2D8A2",
          pending: "#E3C46E",
          closed: "#C9C4BC",
        },
      },
      fontFamily: {
        display: ["var(--font-rubik)", "sans-serif"],
        body: ["var(--font-assistant)", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
