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
  const navBar = (
    <div style={{ background: "#0f2342" }} className="h-10 px-6 flex items-center justify-between gap-4 border-b border-white/10">
      <div className="flex items-center gap-2 min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <>
            <Link href="/dashboard" className="text-white/50 hover:text-white/80 text-xs transition-colors">Accueil</Link>
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <span key={idx} className="flex items-center">
                  <span className="mx-1.5 text-white/25 select-none text-xs">›</span>
                  {crumb.href && !isLast ? (
                    <Link href={crumb.href as never} className="text-white/50 hover:text-white/80 text-xs transition-colors">{crumb.label}</Link>
                  ) : (
                    <span className={isLast ? "text-white text-xs font-semibold" : "text-white/60 text-xs"}>{crumb.label}</span>
                  )}
                </span>
              );
            })}
          </>
        ) : (
          <span className="text-white text-sm font-bold tracking-tight">{title}</span>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-none">{actions}</div>}
    </div>
  );

  const titleBar = (
    <div className="bg-surface border-b border-border h-14 px-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <div className="text-lg font-extrabold text-navy tracking-tight truncate" style={{ fontFamily: "var(--font-sora), system-ui, sans-serif" }}>
            {title}
          </div>
          {subtitle && <div className="text-xs text-text-3 truncate mt-0.5">{subtitle}</div>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-none">{actions}</div>}
    </div>
  );

  return (
    <div>
      {navBar}
      {titleBar}
    </div>
  );
}
