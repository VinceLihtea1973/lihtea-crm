import Link from "next/link";

export type Crumb = {
  label: string;
  href?: string; // si absent → crumb courant (non cliquable)
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
    <header className="bg-surface border-b border-border">
      {/* Breadcrumb bar */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="h-9 px-6 flex items-center text-[12px] text-text-3 border-b border-border/60">
          <Link
            href="/dashboard"
            className="hover:text-text-1 transition-colors"
          >
            Accueil
          </Link>
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <span key={`${crumb.label}-${idx}`} className="flex items-center">
                <span className="mx-2 text-text-3/60 select-none">›</span>
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href as never}
                    className="hover:text-text-1 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className={
                      isLast ? "text-text-1 font-semibold" : "text-text-2"
                    }
                  >
                    {crumb.label}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Title bar */}
      <div className="h-14 px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Bouton retour — visible uniquement si un crumb PARENT (pas le dernier) a un href */}
          {breadcrumbs && breadcrumbs.slice(0, -1).reverse().find((c) => c.href) && (
            <Link
              href={breadcrumbs.slice(0, -1).reverse().find((c) => c.href)!.href as never}
              className="flex-none w-8 h-8 rounded-lg border border-border bg-bg hover:bg-border flex items-center justify-center text-text-2 hover:text-text-1 transition-colors"
              title="Retour"
            >
              <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
                <path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
              </svg>
            </Link>
          )}
          <div className="min-w-0">
            <div className="text-[15px] font-extrabold text-navy tracking-[-0.02em] truncate">
              {title}
            </div>
            {subtitle && (
              <div className="text-[11px] text-text-3 truncate">{subtitle}</div>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-none">{actions}</div>
        )}
      </div>
    </header>
  );
}
