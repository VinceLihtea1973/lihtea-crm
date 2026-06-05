import Link from "next/link";

export type Crumb = {
  label: string;
  href?: string;
};

export function Header({
  title,
  subtitle,
  breadcrumbs,
  actions,
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
  actions?: React.ReactNode;
}) {
  return (
    <header>
      <div style={{ background: "#0f2342" }} className="h-10 px-6 flex items-center justify-between gap-4 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <>
              <Link href="/dashboard" className="text-white/50 hover:text-white/80 text-[11px] transition-colors">Accueil</Link>
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <span key={`${crumb.label}-${idx}`} className="flex items-center">
                    <span className="mx-1.5 text-white/25 select-none text-[10px]">›</span>
                    {crumb.href && !isLast ? (
                      <Link href={crumb.href as never} className="text-white/50 hover:text-white/80 text-[11px] transition-colors">{crumb.label}</Link>
                    ) : (
                      <span className={isLast ? "text-white text-[11px] font-semibold" : "text-white/60 text-[11px]"}>{crumb.label}</span>
                    )}
                  </span>
                );
              })}
            </>
          ) : (
            <span className="text-white text-[13px] font-bold tracking-tight">{title}</span>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 flex-none">{actions}</div>}
      </div>

      <div className="bg-surface border-b border-border h-14 px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {breadcrumbs && breadcrumbs.slice(0, -1).reverse().find((c) => c.href) && (
            <Link
              href={breadcrumbs.slice(0, -1).reverse().find((c) => c.href)!.href as never}
              className="flex-none w-7 h-7 rounded-lg border border-border bg-bg hover:bg-border flex items-center justify-center text-text-2 hover:text-text-1 transition-colors"
            >
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
                <path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
              </svg>
            </Link>
          )}
          <div className="min-w-0">
            <div className="text-[18px] font-extrabold text-navy tracking-[-0.02em] truncate" style={{ fontFamily: "var(--font-sora), system-ui, sans-serif" }}>
