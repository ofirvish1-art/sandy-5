/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Concrete / stone neutrals — not the generic AI-cream
        stone: {
          50: "#F3F1EC",
          100: "#E9E7E0",
          200: "#D9D6CC",
          300: "#B9B5A8",
          800: "#3A3733",
          900: "#232220",
        },
        // Excavator-yellow brand accent
        brand: {
          400: "#E8A93A",
          500: "#D98E04",
          600: "#B3730A",
        },
        // Supply = green/blue ("יש לי לתת")
        supply: {
          50: "#EAF7EF",
          500: "#2F9C5A",
          600: "#237A46",
        },
        // Demand = orange/red ("אני צריך")
        demand: {
          50: "#FBEDE6",
          500: "#D9480F",
          600: "#B23A0C",
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
      backgroundImage: {
        "hazard-stripes":
          "repeating-linear-gradient(135deg, var(--stripe-color, #D98E04) 0px, var(--stripe-color, #D98E04) 10px, transparent 10px, transparent 20px)",
      },
    },
  },
  plugins: [],
};
