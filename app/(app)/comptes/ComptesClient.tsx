"use client";

import { useState } from "react";
import Link from "next/link";
import { Chip, ScoreCircle } from "@/components/ui/Chip";
import { Avatar } from "@/components/ui/Avatar";

type Status = "PROSPECT" | "LEAD" | "CLIENT" | "LOST";

type Company = {
  id: string; name: string; siren: string | null; legalForm: string | null;
  status: Status; region: string | null; city: string | null;
  icp: number; contacts: number; deals: number;
};

const STATUS_LABEL: Record<Status, { label: string; color: "navy" | "teal" | "gold" | "red" }> = {
  PROSPECT: { label: "Prospect", color: "navy" },
  LEAD:     { label: "Lead",     color: "teal" },
  CLIENT:   { label: "Client",   color: "gold" },
  LOST:     { label: "Perdu",    color: "red"  },
};

const ALL_STATUSES: (Status | "ALL")[] = ["ALL", "PROSPECT", "LEAD", "CLIENT", "LOST"];

export function ComptesClient({ companies }: { companies: Company[] }) {
  const [search,     setSearch]     = useState("");
  const [statusFilter, setStatus]   = useState<Status | "ALL">("ALL");

  const q = search.toLowerCase().trim();

  const filtered = companies.filter((c) => {
    const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
    const matchSearch = !q
      || c.name.toLowerCase().includes(q)
      || (c.siren ?? "").includes(q)
      || (c.city ?? "").toLowerCase().includes(q)
      || (c.region ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const counts = {
    ALL:      companies.length,
    PROSPECT: companies.filter((c) => c.status === "PROSPECT").length,
    LEAD:     companies.filter((c) => c.status === "LEAD").length,
    CLIENT:   companies.filter((c) => c.status === "CLIENT").length,
    LOST:     companies.filter((c) => c.status === "LOST").length,
  };

  const tabLabel: Record<Status | "ALL", string> = {
    ALL:      `Tous (${counts.ALL})`,
    PROSPECT: `Prospects (${counts.PROSPECT})`,
    LEAD:     `Leads (${counts.LEAD})`,
    CLIENT:   `Clients (${counts.CLIENT})`,
    LOST:     `Perdus (${counts.LOST})`,
  };

  const tabColor: Record<Status | "ALL", string> = {
    ALL:      "bg-navy text-white border-navy",
    PROSPECT: "bg-navy text-white border-navy",
    LEAD:     "bg-teal text-white border-teal",
    CLIENT:   "bg-gold text-white border-gold",
    LOST:     "bg-red-500 text-white border-red-500",
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Filtres */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Recherche */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, SIREN, ville…"
            className="pl-8 pr-4 py-2 text-[13px] bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40 text-text-1 w-64"
          />
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>

        {/* Tabs statut */}
        <div className="flex gap-1.5 flex-wrap">
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded-lg border transition-colors ${
                statusFilter === s
                  ? tabColor[s]
                  : "bg-surface border-border text-text-2 hover:bg-bg"
              }`}
            >
              {tabLabel[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center text-[13px] text-text-3">
            {companies.length === 0
              ? "Aucun compte — importez vos premières entreprises depuis la Prospection."
              : "Aucun compte correspondant à cette recherche."}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-bg border-b border-border text-[10px] font-bold uppercase tracking-wider text-text-3">
                <th className="text-left px-3 py-3 w-[60px]">ICP</th>
                <th className="text-left px-3 py-3 min-w-[260px]">Compte</th>
                <th className="text-left px-3 py-3">Statut</th>
                <th className="text-left px-3 py-3">Région · Ville</th>
                <th className="text-left px-3 py-3">Contacts</th>
                <th className="text-left px-3 py-3">Deals</th>
                <th className="text-right px-3 py-3 w-[120px]">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const status = STATUS_LABEL[c.status];
                const canCreateDeal = c.status === "PROSPECT" || c.status === "LEAD";
                return (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-bg/50 transition-colors">
                    <td className="px-3 py-3">
                      <ScoreCircle score={c.icp} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={c.name} seed={c.id} size={32} />
                        <div>
                          <Link href={`/comptes/${c.id}` as never} className="text-[13px] font-semibold text-navy hover:underline">
                            {c.name}
                          </Link>
                          <div className="text-[11px] text-text-3 font-mono">
                            {c.siren ?? "—"} · {c.legalForm ?? "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Chip color={status.color}>{status.label}</Chip>
                    </td>
                    <td className="px-3 py-3 text-[12px] text-text-2">
                      <div className="font-semibold">{c.region?.split("-")[0].trim() ?? "—"}</div>
                      <div className="text-[11px] text-text-3">{c.city ?? "—"}</div>
                    </td>
                    <td className="px-3 py-3 text-[13px] font-mono font-semibold text-navy">{c.contacts}</td>
                    <td className="px-3 py-3 text-[13px] font-mono font-semibold text-navy">{c.deals}</td>
                    <td className="px-3 py-3 text-right">
                      {canCreateDeal ? (
                        <Link href={`/comptes/${c.id}?tab=deals` as never}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal text-white text-[11px] font-bold hover:bg-teal/80 transition-colors shadow-sm">
                          ＋ Deal
                        </Link>
                      ) : (
                        <Link href={`/comptes/${c.id}` as never}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-text-3 text-[11px] font-semibold hover:bg-bg transition-colors">
                          Voir →
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="mt-3 text-[11px] text-text-3 text-right">
          {filtered.length} compte{filtered.length > 1 ? "s" : ""}
          {filtered.length !== companies.length && ` sur ${companies.length}`}
        </p>
      )}
    </div>
  );
}
