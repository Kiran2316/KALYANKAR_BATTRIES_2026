/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  important: "#landing-site",
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        matte: "#0F0F0F",
        gold: "#D4AF37",
        goldLight: "#F2D57E",
        charcoal: "#1A1A1A",
      },
      fontFamily: {
        display: ["'Cinzel'", "serif"],
        body: ["'Poppins'", "sans-serif"],
      },
      boxShadow: {
        goldGlow: "0 0 25px rgba(212,175,55,0.45)",
        goldGlowLg: "0 0 60px rgba(212,175,55,0.35)",
      },
      keyframes: {
        float: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-18px)" },
        },
        shine: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        scrollX: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        float: "float 4s ease-in-out infinite",
        shine: "shine 3s linear infinite",
        scrollX: "scrollX 30s linear infinite",
      },
    },
  },
  plugins: [],
}
