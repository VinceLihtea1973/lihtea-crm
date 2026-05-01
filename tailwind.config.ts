import type { Config } from "tailwindcss";

/**
 * Design system Lihtea — portage 1-pour-1 depuis la démo HTML.
 * Palette, radius, shadows et typo repris tels quels pour assurer
 * la continuité visuelle entre la démo et la plateforme.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Navy — couleur dominante sidebar / header
        navy: {
          DEFAULT: "#0f2b46",
          2: "#1a3d5c",
          3: "#264a6a",
        },
        // Teal — accent principal Lihtea
        teal: {
          DEFAULT: "#0d9488",
          2: "#0f766e",
          bright: "#14b8a6",
          bg: "#f0fdfa",
          border: "#99f6e4",
        },
        gold: { DEFAULT: "#d4a843", bg: "#faf0d4" },
        "lh-green": { DEFAULT: "#059669", bg: "#ecfdf5" },
        "lh-red": { DEFAULT: "#dc2626", bg: "#fef2f2" },
        "lh-blue": { DEFAULT: "#2563eb", bg: "#eff6ff" },
        "lh-purple": { DEFAULT: "#7c3aed", bg: "#f5f3ff" },
        "lh-amber": { DEFAULT: "#d97706", bg: "#fffbeb" },
        // Surfaces
        surface: "#ffffff",
        bg: "#f6f8fb",
        border: "#e1e7ef",
        "border-strong": "#c5cdd8",
        // Textes
        "text-1": "#1a2332",
        "text-2": "#4a5568",
        "text-3": "#8896a7",
      },
      fontFamily: {
        body: ["var(--font-dm-sans)", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["var(--font-jetbrains)", "SF Mono", "monospace"],
      },
      borderRadius: {
        DEFAULT: "12px",
        sm: "8px",
      },
      boxShadow: {
        sm: "0 1px 3px rgba(15,43,70,.06), 0 1px 2px rgba(15,43,70,.04)",
        md: "0 4px 12px rgba(15,43,70,.08), 0 2px 4px rgba(15,43,70,.04)",
        lg: "0 12px 40px rgba(15,43,70,.12)",
      },
      transitionTimingFunction: {
        "lh-out": "cubic-bezier(.16,1,.3,1)",
      },
    },
  },
  plugins: [],
};

export default config;
