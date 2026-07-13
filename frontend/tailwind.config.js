/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Soft pastel palette — calming baby app feel.
        brand: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        },
        pink: {
          soft: "#fbcfe8",
          DEFAULT: "#f9a8d4",
        },
        sky: {
          soft: "#bae6fd",
        },
        mint: {
          soft: "#bbf7d0",
          DEFAULT: "#86efac",
        },
        peach: {
          soft: "#fed7aa",
        },
        cream: "#fff7ed",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        soft: "0 4px 20px -2px rgba(139, 92, 246, 0.12)",
        card: "0 2px 12px -2px rgba(0, 0, 0, 0.06)",
      },
    },
  },
  plugins: [],
};
