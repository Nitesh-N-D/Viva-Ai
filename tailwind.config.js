/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Farm module — warm soil & leaf tones
        soil: {
          50: "#FBF6EC",
          100: "#F1E4C8",
          400: "#B98447",
          600: "#8A5A2B",
          900: "#4A2F18",
        },
        leaf: {
          400: "#7C9A6E",
          600: "#5B7553",
          800: "#374A31",
        },
        // Fabrication module — steel & ember accent
        steel: {
          400: "#6E8CA0",
          600: "#3E5A6E",
          800: "#22323D",
        },
        ember: {
          400: "#E0823D",
          600: "#C2611E",
        },
      },
      fontFamily: {
        display: ["Noto Sans Tamil", "Noto Sans", "sans-serif"],
        body: ["Noto Sans Tamil", "Noto Sans", "sans-serif"],
      },
      borderRadius: {
        tile: "1.25rem",
      },
    },
  },
  plugins: [],
};
