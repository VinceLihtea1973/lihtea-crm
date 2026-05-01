"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

type NavItem = { href: string; label: string; icon: React.ReactNode };
type NavGroup = { label: string; items: NavItem[] };

/* ── Icônes SVG inline ─────────────────────────────── */
const Icon = {
  dashboard:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  search:       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>,
  mail:         <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/></svg>,
  building:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 7v14M21 7v14M6 3h12l3 4H3l3-4z"/><path d="M9 21v-6h6v6"/></svg>,
  pipeline:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>,
  users:        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  file:         <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>,
  clock:        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12,6 12,12 16,14"/></svg>,
  check:        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>,
  signal:       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  settings:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>,
};

const GROUPS: NavGroup[] = [
  { label: "Pilotage",    items: [{ href: "/dashboard",    label: "Dashboard",    icon: Icon.dashboard }] },
  { label: "Acquisition", items: [
      { href: "/prospection", label: "Prospection", icon: Icon.search },
      { href: "/sequences",   label: "Séquences",   icon: Icon.mail },
  ]},
  { label: "Ventes", items: [
      { href: "/comptes",      label: "Comptes",      icon: Icon.building },
      { href: "/pipeline",     label: "Pipeline",     icon: Icon.pipeline },
      { href: "/contacts",     label: "Contacts",     icon: Icon.users },
      { href: "/propositions", label: "Propositions", icon: Icon.file },
  ]},
  { label: "Activité", items: [
      { href: "/activites", label: "Activités", icon: Icon.clock },
      { href: "/taches",    label: "Tâches",    icon: Icon.check },
      { href: "/signaux",   label: "Signaux",   icon: Icon.signal },
  ]},
  { label: "Réglages", items: [
      { href: "/parametres", label: "Paramètres", icon: Icon.settings },
  ]},
];

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const initials = userName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <nav
      className="w-[220px] flex-none flex flex-col overflow-hidden relative"
      style={{ background: "var(--sidebar-bg)" }}
    >
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-teal flex items-center justify-center font-black text-white text-[14px] shadow-[0_4px_12px_rgba(13,148,136,.4)] flex-none">
          L
        </div>
        <span className="text-white text-[15px] font-extrabold tracking-tight">Lihtea</span>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {GROUPS.map((group) => (
          <div key={group.label} className="mb-3">
            <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/25 px-3 pt-2 pb-1.5">
              {group.label}
            </div>
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href as never}
                  className={cn(
                    "flex items-center gap-2.5 py-[7px] text-[12.5px] font-medium transition-all duration-150 mb-px rounded-r-lg",
                    active
                      ? "pl-[10px] pr-3 text-white font-semibold border-l-[3px] border-teal-bright bg-white/[0.06]"
                      : "pl-3 pr-3 text-white/40 hover:text-white/75 hover:bg-white/[0.04] border-l-[3px] border-transparent"
                  )}
                >
                  <span className={cn("flex-none", active ? "text-teal-bright" : "")}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Theme toggle */}
      <div className="px-2 py-2 border-t border-white/[0.06]">
        <ThemeToggle />
      </div>

      {/* User */}
      <div className="px-3 py-3 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-teal flex items-center justify-center font-bold text-[10px] text-white flex-none">
          {initials}
        </div>
        <span className="text-white/60 text-[12px] font-medium truncate">{userName}</span>
      </div>
    </nav>
  );
}
