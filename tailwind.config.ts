import type { Config } from "tailwindcss";

/**
 * Design system Lihtea v2 — light + dark mode
 * Les couleurs de surface/texte/bordure pointent sur des CSS vars
 * → elles changent automatiquement quand [data-theme] bascule.
 * Les couleurs d'accent (navy, teal, statuts) restent fixes.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: ["selector", "[data-theme='dark']"],
  theme: {
    extend: {
      colors: {
        /* ── Accent fixe — sidebar / brand ── */
        navy: {
          DEFAULT: "#0f2b46",
          2: "#1a3d5c",
          3: "#264a6a",
        },
        /* ── Teal — accent principal ── */
        teal: {
          DEFAULT: "#0d9488",
          2: "#0f766e",
          bright: "#14b8a6",
          bg: "var(--c-teal-bg)",
          border: "#99f6e4",
        },
        /* ── Statuts (bg auto-adaptatif en dark) ── */
        gold:      { DEFAULT: "#d4a843", bg: "var(--c-gold-bg)"   },
        "lh-green":  { DEFAULT: "#059669", bg: "var(--c-green-bg)"  },
        "lh-red":    { DEFAULT: "#dc2626", bg: "var(--c-red-bg)"    },
        "lh-blue":   { DEFAULT: "#2563eb", bg: "var(--c-blue-bg)"   },
        "lh-purple": { DEFAULT: "#7c3aed", bg: "var(--c-purple-bg)" },
        "lh-amber":  { DEFAULT: "#d97706", bg: "var(--c-amber-bg)"  },

        /* ── Surfaces — changent avec le thème ── */
        bg:              "rgb(var(--rgb-bg) / <alpha-value>)",
        surface:         "rgb(var(--rgb-surface) / <alpha-value>)",
        "surface-2":     "rgb(var(--rgb-surface-2) / <alpha-value>)",
        border:          "rgb(var(--rgb-border) / <alpha-value>)",
        "border-strong": "rgb(var(--rgb-border-strong) / <alpha-value>)",

        /* ── Texte — change avec le thème ── */
        "text-1": "rgb(var(--rgb-text) / <alpha-value>)",
        "text-2": "rgb(var(--rgb-text-2) / <alpha-value>)",
        "text-3": "rgb(var(--rgb-text-3) / <alpha-value>)",
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
        sm: "var(--shadow)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },

      transitionTimingFunction: {
        "lh-out": "cubic-bezier(.16,1,.3,1)",
      },
    },
  },
  plugins: [],
};

export default config;
