"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; icon: string };
type NavGroup = { label: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    label: "Pilotage",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "▦" },
    ],
  },
  {
    label: "Acquisition",
    items: [
      { href: "/prospection", label: "Prospection", icon: "🔍" },
      { href: "/sequences",   label: "Séquences",   icon: "✉" },
    ],
  },
  {
    label: "Ventes",
    items: [
      { href: "/comptes",      label: "Comptes",      icon: "🏢" },
      { href: "/pipeline",     label: "Pipeline",     icon: "⊞" },
      { href: "/contacts",     label: "Contacts",     icon: "👥" },
      { href: "/propositions", label: "Propositions", icon: "📁" },
    ],
  },
  {
    label: "Activité",
    items: [
      { href: "/activites", label: "Activités", icon: "⏱" },
      { href: "/taches",    label: "Tâches",    icon: "✓" },
      { href: "/signaux",   label: "Signaux",   icon: "📡" },
    ],
  },
  {
    label: "Réglages",
    items: [
      { href: "/parametres", label: "Paramètres", icon: "⚙" },
    ],
  },
];

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <nav className="w-[242px] flex-none bg-navy flex flex-col overflow-hidden relative">
      {/* Brand */}
      <div className="px-[14px] pt-4 pb-[14px] flex items-center gap-[11px] border-b border-white/[0.07]">
        <div className="w-[38px] h-[38px] rounded-[10px] bg-teal grid place-items-center font-black text-white text-[15px] shadow-[0_4px_12px_rgba(13,148,136,.35)] flex-none">
          L
        </div>
        <div className="text-white text-[16px] font-extrabold tracking-[-0.02em]">
          Lihtea
        </div>
      </div>

      {/* Scroll */}
      <div className="flex-1 overflow-y-auto px-2 py-[10px]">
        {GROUPS.map((group) => (
          <div key={group.label} className="mb-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/[.28] px-[10px] pt-[10px] pb-[5px] flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-white/[0.07]">
              {group.label}
            </div>
            {group.items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href as never}
                  className={cn(
                    "flex items-center gap-[10px] px-3 py-[9px] rounded-lg text-[13px] font-medium transition-all duration-150 border border-transparent mb-px",
                    active
                      ? "bg-teal/[0.18] border-teal/[0.28] text-[#2dd4bf] font-semibold"
                      : "text-white/60 hover:bg-white/[0.06] hover:text-white/90"
                  )}
                >
                  <span className="w-[18px] text-center text-[14px] flex-none">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer user */}
      <div className="px-2 pt-[10px] pb-3 border-t border-white/[0.07] flex items-center justify-between">
        <div className="flex items-center gap-[9px] px-2 py-[6px]">
          <div className="w-8 h-8 rounded-full bg-teal grid place-items-center font-extrabold text-[11px] text-white flex-none">
            {initials}
          </div>
          <div className="text-white/80 text-[13px] font-semibold">
            {userName}
          </div>
        </div>
      </div>
    </nav>
  );
}
