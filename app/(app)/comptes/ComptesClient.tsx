"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Chip } from "@/components/ui/Chip";

type Status = "PROSPECT" | "LEAD" | "CLIENT" | "LOST";

type Company = {
  id: string;
  name: string;
  siren: string | null;
  siret: string | null;
  legalForm: string | null;
  legalFormCode: string | null;
  apeCode: string | null;
  headcountBand: string | null;
  status: Status;
  region: string | null;
  department: string | null;
  city: string | null;
  postalCode: string | null;
  address: string | null;
  icp: number;
  contacts: number;
  deals: number;
  creationDate: string | null;
  enrichedAt: string | null;
};

const STATUS_META: Record<Status, { label: string; color: "navy" | "teal" | "gold" | "red" }> = {
  PROSPECT: { label: "Prospect", color: "navy" },
  LEAD:     { label: "Lead",     color: "teal" },
  CLIENT:   { label: "Client",   color: "gold" },
  LOST:     { label: "Perdu",    color: "red"  },
};

type SortKey = "name" | "status" | "icp" | "region" | "contacts" | "deals" | "apeCode" | "headcountBand";
type SortDir = "asc" | "desc";

// ─── Export Excel (HTML table → .xls) ────────────────────────────
function exportToExcel(rows: Company[], filename: string) {
  const headers = [
    "Raison sociale","SIREN","SIRET","Forme juridique","Code APE","Effectifs",
    "Statut","Région","Département","Ville","Code postal","Adresse",
    "Score ICP","Contacts","Deals","Date création","Enrichi le",
  ];
  const esc = (v: string) => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const toRow = (cells: string[]) => "<tr>" + cells.map(c => `<td>${esc(c)}</td>`).join("") + "</tr>";
  const dataRows = rows.map(c => [
    c.name, c.siren ?? "", c.siret ?? "",
    c.legalForm ?? "", c.apeCode ?? "", c.headcountBand ?? "",
    STATUS_META[c.status].label,
    c.region ?? "", c.department ?? "", c.city ?? "", c.postalCode ?? "", c.address ?? "",
    String(c.icp), String(c.contacts), String(c.deals),
    c.creationDate ?? "", c.enrichedAt ?? "",
  ]);
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>
<x:ExcelWorksheet><x:Name>Comptes</x:Name></x:ExcelWorksheet>
</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
<body><table>${toRow(headers)}${dataRows.map(toRow).join("")}</table></body></html>`;
  const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Composant principal ─────────────────────────────────────────
export function ComptesClient({ companies }: { companies: Company[] }) {
  const router = useRouter();
  const [search,      setSearch]     = useState("");
  const [statusFilter,setStatus]     = useState<Status | "ALL">("ALL");
  const [selected,    setSelected]   = useState<Set<string>>(new Set());
  const [sortKey,     setSortKey]    = useState<SortKey>("name");
  const [sortDir,     setSortDir]    = useState<SortDir>("asc");
  const [deletingId,  setDeletingId] = useState<string | null>(null);

  // ── Filtrage + tri ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = companies.filter(c => {
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.siren ?? "").includes(q) ||
        (c.apeCode ?? "").toLowerCase().includes(q) ||
        (c.city ?? "").toLowerCase().includes(q) ||
        (c.region ?? "").toLowerCase().includes(q) ||
        (c.postalCode ?? "").includes(q)
      );
    });
    return [...list].sort((a, b) => {
      let va: string | number = a[sortKey] ?? "";
      let vb: string | number = b[sortKey] ?? "";
      if (sortKey === "icp" || sortKey === "contacts" || sortKey === "deals") {
        va = Number(va); vb = Number(vb);
      }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [companies, search, statusFilter, sortKey, sortDir]);

  // ── Sélection ───────────────────────────────────────────────────
  const allSelected   = filtered.length > 0 && filtered.every(c => selected.has(c.id));
  const someSelected  = filtered.some(c => selected.has(c.id));
  const selectedCount = [...selected].filter(id => filtered.some(c => c.id === id)).length;

  function toggleAll() {
    if (allSelected) {
      setSelected(prev => { const n = new Set(prev); filtered.forEach(c => n.delete(c.id)); return n; });
    } else {
      setSelected(prev => { const n = new Set(prev); filtered.forEach(c => n.add(c.id)); return n; });
    }
  }
  function toggle(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  // ── Tri colonne ─────────────────────────────────────────────────
  function sort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }
  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="text-text-3 opacity-30">↕</span>;
    return <span className="text-teal">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  // ── Suppression ─────────────────────────────────────────────────
  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer "${name}" ?`)) return;
    setDeletingId(id);
    try { await fetch(`/api/comptes/${id}`, { method: "DELETE" }); router.refresh(); }
    finally { setDeletingId(null); }
  }

  // ── Export ──────────────────────────────────────────────────────
  function exportSelected() {
    const rows = filtered.filter(c => selected.has(c.id));
    exportToExcel(rows, `comptes-selection-${new Date().toISOString().slice(0,10)}.xls`);
  }
  function exportAll() {
    exportToExcel(filtered, `comptes-${new Date().toISOString().slice(0,10)}.xls`);
  }

  // ── Compteurs onglets ───────────────────────────────────────────
  const counts = {
    ALL: companies.length,
    PROSPECT: companies.filter(c => c.status === "PROSPECT").length,
    LEAD:     companies.filter(c => c.status === "LEAD").length,
    CLIENT:   companies.filter(c => c.status === "CLIENT").length,
    LOST:     companies.filter(c => c.status === "LOST").length,
  };

  const ICP_COLOR = (s: number) =>
    s >= 70 ? "text-teal font-bold" : s >= 40 ? "text-navy font-semibold" : "text-text-3";

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">

      {/* ── Barre d'actions bulk (sticky) ───────────────────────── */}
      {someSelected && (
        <div className="sticky top-0 z-20 bg-navy text-white px-6 py-3 flex items-center gap-4 shadow-lg">
          <span className="text-[13px] font-semibold">
            {selectedCount} compte{selectedCount > 1 ? "s" : ""} sélectionné{selectedCount > 1 ? "s" : ""}
          </span>
          <button onClick={exportSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-[12px] font-semibold transition-colors">
            📥 Exporter la sélection (.xls)
          </button>
          <button onClick={() => setSelected(new Set())}
            className="ml-auto text-[12px] text-white/60 hover:text-white transition-colors">
            ✕ Désélectionner tout
          </button>
        </div>
      )}

      {/* ── Barre de recherche + filtres ────────────────────────── */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Recherche */}
          <div className="relative">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Nom, SIREN, APE, ville, département…"
              className="pl-8 pr-4 py-2 text-[13px] bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40 text-text-1 w-72" />
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>

          {/* Onglets statut */}
          <div className="flex gap-1.5 flex-wrap">
            x(["ALL","PROSPECT","LEAD","CLIENT","LOST"] as const).map(s => {
              const active = statusFilter === s;
              const colors: Record<typeof s, string> = {
                ALL: "bg-navy text-white border-navy",
                PROSPECT: "bg-navy text-white border-navy",
                LEAD: "bg-teal text-white border-teal",
                CLIENT: "bg-amber-500 text-white border-amber-500",
                LOST: "bg-red-500 text-white border-red-500",
              };
              const labels = { ALL:`Tous (${counts.ALL})`, PROSPECT:`Prospects (${counts.PROSPECT})`, LEAD:`Leads (${counts.LEAD})`, CLIENT:`Clients (${counts.CLIENT})`, LOST:`Perdus (${counts.LOST})` };
              return (
                <button key={s} onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 text-[12px] font-semibold rounded-lg border transition-colors ${active ? colors[s] : "bg-surface border-border text-text-2 hover:bg-bg"}`}>
                  {labels[s]}
                </button>
              );
            })}
          </div>

          {/* Export tout à droite */}
          <div className="ml-auto flex items-center gap-2">
            <button onClick={exportAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal/40 bg-teal/5 text-[12px] font-semibold text-teal hover:bg-teal/10 transition-colors">
              📥 Export tout ({filtered.length})
            </button>
          </div>
        </div>
      </div>

      {/* ── Tableau ─────────────────────────────────────────────── */}
      <div className="px-6 pb-6 flex-1">
        <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-[13px] text-text-3">
              {companies.length === 0
                ? "Aucun compte — importez vos premières entreprises depuis la Prospection."
                : "Aucun résultat pour cette recherche."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="bg-bg border-b border-border text-[10px] font-bold uppercase tracking-wider text-text-3">
                    {/* Checkbox tout sélectionner */}
                    <th className="px-3 py-3 w-9">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll}
                        className="w-3.5 h-3.5 rounded accent-teal cursor-pointer" />
                    </th>
                    <th className="text-left px-3 py-3 min-w-[240px] cursor-pointer select-none" onClick={() => sort("name")}>
                      Compte <SortIcon k="name" />
                    </th>
                    <th className="text-left px-3 py-3 cursor-pointer select-none" onClick={() => sort("status")}>
                      Statut <SortIcon k="status" />
                    </th>
                    <th className="text-left px-3 py-3 cursor-pointer select-none" onClick={() => sort("icp")}>
                      ICP <SortIcon k="icp" />
                    </th>
                    <th className="text-left px-3 py-3 cursor-pointer select-none" onClick={() => sort("apeCode")}>
                      APE <SortIcon k="apeCode" />
                    </th>
                    <th className="text-left px-3 py-3 cursor-pointer select-none" onClick={() => sort("headcountBand")}>
                      Effectifs <SortIcon k="headcountBand" />
                    </th>
                    <th className="text-left px-3 py-3 cursor-pointer select-none" onClick={() => sort("region")}>
                      Région · Ville <SortIcon k="region" />
                    </th>
                    <th className="text-left px-3 py-3 cursor-pointer select-none" onClick={() => sort("contacts")}>
                      Contacts <SortIcon k="contacts" />
                    </th>
                    <th className="text-left px-3 py-3 cursor-pointer select-none" onClick={() => sort("deals")}>
                      Deals <SortIcon k="deals" />
                    </th>
                    <th className="text-right px-3 py-3 w-[120px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const isSelected = selected.has(c.id);
                    const meta = STATUS_META[c.status];
                    return (
                      <tr key={c.id}
                        className={`border-b border-border last:border-0 transition-colors cursor-pointer ${isSelected ? "bg-teal/5" : "hover:bg-bg/60"}`}
                        onClick={() => toggle(c.id)}>

                        {/* Checkbox */}
                        <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggle(c.id)}
                            className="w-3.5 h-3.5 rounded accent-teal cursor-pointer" />
                        </td>

                        {/* Nom + SIREN */}
                        <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                          <Link href={`/comptes/${c.id}` as never}
                            className="text-[13px] font-semibold text-navy hover:underline block">
                            {c.name}
                          </Link>
                          <div className="text-[11px] text-text-3 font-mono">
                            {c.siren ?? "—"} · {c.legalForm ?? "—"}
                          </div>
                        </td>

                        {/* Statut */}
                        <td className="px-3 py-2.5">
                          <Chip color={meta.color}>{meta.label}</Chip>
                        </td>

                        {/* ICP */}
                        <td className="px-3 py-2.5">
                          <span className={`text-[13px] ${ICP_COLOR(c.icp)}`}>{c.icp ?? "—"}</span>
                        </td>

                        {/* APE */}
                        <td className="px-3 py-2.5">
                          <span className="text-[12px] font-mono text-text-2">{c.apeCode ?? "—"}</span>
                        </td>

                        {/* Effectifs */}
                        <td className="px-3 py-2.5">
                          <span className="text-[12px] text-text-2">{c.headcountBand ?? "—"}</span>
                        </td>

                        {/* Région · Ville */}
                        <td className="px-3 py-2.5">
                          <div className="text-[12px] font-medium text-text-2">{c.region?.split("-")[0].trim() ?? "—"}</div>
                          <div className="text-[11px] text-text-3">{[c.postalCode, c.city].filter(Boolean).join(" ") || "—"}</div>
                        </td>

                        {/* Contacts */}
                        <td className="px-3 py-2.5">
                          <span className="text-[13px] font-mono font-semibold text-navy">{c.contacts}</span>
                        </td>

                        {/* Deals */}
                        <td className="px-3 py-2.5">
                          <span className="text-[13px] font-mono font-semibold text-navy">{c.deals}</span>
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Link href={`/comptes/${c.id}` as never}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-text-3 text-[11px] font-semibold hover:bg-bg transition-colors">
                              Ouvrir →
                            </Link>
                            <button onClick={() => handleDelete(c.id, c.name)} disabled={deletingId === c.id}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-400 transition-colors disabled:opacity-40"
                              title="Supprimer">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6"/>
                                <path d="M10,11v6"/><path d="M14,11v6"/><path d="M9,6V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1v2"/>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pied de page */}
        {filtered.length > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[11px] text-text-3">
              {filtered.length} compte{filtered.length > 1 ? "s" : ""}
              {filtered.length !== companies.length && ` sur ${companies.length}`}
              {selectedCount > 0 && ` · ${selectedCount} sélectionné${selectedCount > 1 ? "s" : ""}`}
            </p>
            {selectedCount > 0 && (
              <button onClick={exportSelected}
                className="text-[11px] text-teal hover:underline font-semibold">
                📥 Exporter les {selectedCount} sélectionnés
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
