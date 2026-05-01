"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = document.documentElement.getAttribute("data-theme");
    setTheme(t === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("lihtea-theme", next); } catch {}
  }

  if (!mounted) return <div className="w-[68px] h-7" />;

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      title={isDark ? "Mode clair" : "Mode sombre"}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
        bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.10]
        transition-all duration-150 text-white/70 hover:text-white/95"
    >
      <span className="text-[12px] leading-none">
        {isDark ? (
          /* Soleil */
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4"/>
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
          </svg>
        ) : (
          /* Lune */
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        )}
      </span>
      <span className="text-[11px] font-semibold whitespace-nowrap">
        {isDark ? "Mode clair" : "Mode sombre"}
      </span>
    </button>
  );
}
