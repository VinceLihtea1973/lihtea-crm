"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Chip, ScoreCircle } from "@/components/ui/Chip";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  searchSireneAction,
  importSireneCompanyAction,
  type SearchResult,
} from "@/app/_actions/sirene";
import {
  searchDirectorAction,
  importPappersCompanyAction,
  type DirectorSearchResult,
} from "@/app/_actions/pappers";
import {
  searchDatagouvAction,
  importDatagouvCompanyAction,
  type DatagouvSearchResult,
} from "@/app/_actions/datagouv";
import { createListAction } from "@/app/_actions/lists";
import { NAF_CODES, SECTOR_NAF_MAP } from "@/lib/naf-data";

// ─── Données filtres ──────────────────────────────────────────────

const SECTEURS = [
  { value: "hotel",       label: "Hôtellerie & hébergement" },
  { value: "logistique",  label: "Logistique & transport" },
  { value: "retail",      label: "Distribution & retail" },
  { value: "industrie",   label: "Industrie & manufacturing" },
  { value: "immo",        label: "Immobilier" },
  { value: "services",    label: "Services aux entreprises" },
  { value: "tech",        label: "Tech & informatique" },
  { value: "sante",       label: "Santé & médical" },
  { value: "education",   label: "Éducation & formation" },
  { value: "restauration",label: "Restauration & alimentation" },
  { value: "finance",     label: "Finance & assurance" },
  { value: "btp",         label: "Construction & BTP" },
  { value: "agriculture", label: "Agriculture & agroalimentaire" },
  { value: "energie",     label: "Énergie & environnement" },
  { value: "culture",     label: "Culture & loisirs" },
];

const REGIONS = [
  "Île-de-France",
  "Auvergne-Rhône-Alpes",
  "Nouvelle-Aquitaine",
  "Occitanie",
  "Hauts-de-France",
  "Grand Est",
  "Provence-Alpes-Côte d'Azur",
  "Pays de la Loire",
  "Normandie",
  "Bretagne",
  "Bourgogne-Franche-Comté",
  "Centre-Val de Loire",
  "Corse",
  "La Réunion",
  "Martinique",
  "Guadeloupe",
  "Guyane",
  "Mayotte",
];

const TAILLES = [
  { value: "1-9",    label: "1 – 9 salariés (TPE)" },
  { value: "10-49",  label: "10 – 49 salariés (PE)" },
  { value: "50-249", label: "50 – 249 salariés (PME)" },
  { value: "250-999",label: "250 – 999 salariés (ETI)" },
  { value: "1000+",  label: "1 000+ salariés (GE)" },
];

// ─── Types ────────────────────────────────────────────────────────

type Option  = { value: string; label: string };
type Mode    = "insee" | "dirigeant" | "datagouv";

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

// ─── MultiSelect ─────────────────────────────────────────────────

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label:    string;
  options:  Option[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[13px] font-semibold transition-colors whitespace-nowrap",
          selected.length > 0
            ? "bg-teal/10 border-teal/40 text-teal"
            : "bg-surface border-border text-text-2 hover:bg-bg",
        ].join(" ")}
      >
        {label}
        {selected.length > 0 && (
          <span className="bg-teal text-white text-[10px] font-bold rounded-full w-4 h-4 grid place-items-center flex-none">
            {selected.length}
          </span>
        )}
        <span className="text-[10px] opacity-60">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-surface border border-border rounded-xl shadow-xl z-30 overflow-hidden">
          <div className="p-2 border-b border-border">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="w-full px-2.5 py-1.5 text-[12px] bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40"
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-[12px] text-text-3">Aucun résultat</div>
            )}
            {filtered.map((o) => (
              <label
                key={o.value}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-bg cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(o.value)}
                  onChange={() => onChange(toggle(selected, o.value))}
                  className="w-3.5 h-3.5 rounded accent-teal flex-none"
                />
                <span className="text-[13px] text-text-1">{o.label}</span>
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <div className="p-2 border-t border-border">
              <button
                type="button"
                onClick={() => { onChange([]); setOpen(false); }}
                className="text-[11px] text-text-3 hover:text-lh-red font-semibold"
              >
                Tout effacer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── NAF Code Picker ──────────────────────────────────────────────

function NafCodePicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open,          setOpen]          = useState(false);
  const [search,        setSearch]        = useState("");
  const [activeSector,  setActiveSector]  = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        panelRef.current  && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleOpen() {
    if (!open && triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
    setOpen((v) => !v);
  }

  const q = search.trim().toLowerCase();

  // Keyword search → scan all codes
  // Sector selected → filter to that sector's curated NAF codes
  // Nothing → empty right panel
  const sectorCodeSet = activeSector ? new Set(SECTOR_NAF_MAP[activeSector] ?? []) : null;

  const filtered = q.length >= 1
    ? NAF_CODES.filter(
        (n) =>
          n.code.toLowerCase().includes(q) ||
          n.label.toLowerCase().includes(q) ||
          n.sectionLabel.toLowerCase().includes(q)
      )
    : sectorCodeSet
    ? NAF_CODES.filter((n) => sectorCodeSet.has(n.code))
    : [];

  const showBrowse = q.length === 0;

  // Position panel: choose direction with the most space, cap height accordingly
  const HEADER_FOOTER_PX = 120; // search bar + footer + padding
  const spaceBelow = rect ? window.innerHeight - rect.bottom - 8 : 999;
  const spaceAbove = rect ? rect.top - 8 : 0;
  const dropUp     = spaceAbove > spaceBelow;
  const contentMaxH = Math.min(380, (dropUp ? spaceAbove : spaceBelow) - HEADER_FOOTER_PX);

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={[
          "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[13px] font-semibold transition-colors whitespace-nowrap",
          selected.length > 0
            ? "bg-teal/10 border-teal/40 text-teal"
            : "bg-surface border-border text-text-2 hover:bg-bg",
        ].join(" ")}
      >
        Code NAF
        {selected.length > 0 && (
          <span className="bg-teal text-white text-[10px] font-bold rounded-full w-4 h-4 grid place-items-center flex-none">
            {selected.length}
          </span>
        )}
        <span className="text-[10px] opacity-60">{open ? "▲" : "▼"}</span>
      </button>

      {open && rect && (
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            left: Math.min(rect.left, window.innerWidth - Math.min(540, window.innerWidth - 16) - 8),
            width: Math.min(540, window.innerWidth - 16),
            ...(dropUp
              ? { bottom: window.innerHeight - rect.top + 4 }
              : { top: rect.bottom + 4 }),
          }}
          className="z-[200] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header – search bar */}
          <div className="p-3 border-b border-border">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setActiveSector(null); }}
              placeholder="Rechercher par activité ou code… ex : architecte, 71.11Z"
              className="w-full px-3 py-2 text-[13px] bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40"
              autoFocus
            />
          </div>

          <div className="flex min-h-0" style={{ maxHeight: `${contentMaxH}px` }}>
            {/* Colonne secteurs CRM (à gauche, visible quand pas de recherche) */}
            {showBrowse && (
              <div className="w-52 shrink-0 border-r border-border overflow-y-auto py-1">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-3">
                  Secteur d'activité
                </div>
                {SECTEURS.map((s) => {
                  const count = (SECTOR_NAF_MAP[s.value] ?? []).length;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setActiveSector(s.value === activeSector ? null : s.value)}
                      className={[
                        "w-full text-left px-3 py-2 text-[12px] transition-colors flex items-center justify-between gap-1",
                        activeSector === s.value
                          ? "bg-teal/10 text-teal font-semibold"
                          : "text-text-2 hover:bg-bg hover:text-text-1",
                      ].join(" ")}
                    >
                      <span className="truncate">{s.label}</span>
                      <span className="text-[10px] opacity-50 shrink-0">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Colonne codes NAF (à droite) */}
            <div className="flex-1 overflow-y-auto py-1">
              {q.length > 0 && filtered.length === 0 && (
                <div className="px-4 py-8 text-[12px] text-text-3 text-center">
                  Aucun code trouvé pour «&nbsp;{search}&nbsp;»
                </div>
              )}

              {q.length === 0 && !activeSector && (
                <div className="px-4 py-8 text-[12px] text-text-3 text-center leading-relaxed">
                  Choisissez un secteur à gauche<br />ou tapez un mot-clé pour rechercher
                </div>
              )}

              {filtered.map((n) => {
                const checked = selected.includes(n.code);
                return (
                  <button
                    key={n.code}
                    type="button"
                    onClick={() => onChange(toggle(selected, n.code))}
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-bg transition-colors text-left"
                  >
                    <span
                      className={`mt-0.5 w-4 h-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                        checked ? "bg-teal border-teal" : "border-border"
                      }`}
                    >
                      {checked && (
                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-navy shrink-0">{n.code}</span>
                        <span className={`text-[12px] truncate ${checked ? "text-navy font-semibold" : "text-text-1"}`}>
                          {n.label}
                        </span>
                      </div>
                      {q.length > 0 && (
                        <div className="text-[10px] text-text-3 mt-0.5">{n.sectionLabel}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          {selected.length > 0 && (
            <div className="border-t border-border px-3 py-2 flex items-center justify-between">
              <div className="flex flex-wrap gap-1">
                {selected.slice(0, 5).map((c) => (
                  <span key={c} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-teal/10 border border-teal/20 text-teal text-[11px] font-semibold rounded-full">
                    {c}
                    <button type="button" onClick={() => onChange(selected.filter((x) => x !== c))} className="w-3.5 h-3.5 grid place-items-center hover:bg-teal/20 rounded-full text-[10px]">×</button>
                  </span>
                ))}
                {selected.length > 5 && (
                  <span className="text-[11px] text-text-3 self-center">+{selected.length - 5} autres</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] text-text-3 hover:text-lh-red font-semibold shrink-0 ml-2"
              >
                Tout effacer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tags actifs ─────────────────────────────────────────────────

function ActiveTags({
  secteurs,   setSecteurs,
  regions,    setRegions,
  tailles,    setTailles,
  apeCodes,   setApeCodes,
}: {
  secteurs:    string[]; setSecteurs:    (v: string[]) => void;
  regions:     string[]; setRegions:     (v: string[]) => void;
  tailles:     string[]; setTailles:     (v: string[]) => void;
  apeCodes:    string[]; setApeCodes:    (v: string[]) => void;
}) {
  const secLabels = SECTEURS.filter((s) => secteurs.includes(s.value));
  const taiLabels = TAILLES.filter((t) => tailles.includes(t.value));
  const all = [
    ...secLabels.map((s) => ({ label: s.label,  remove: () => setSecteurs(secteurs.filter((x) => x !== s.value)) })),
    ...taiLabels.map((t) => ({ label: t.label,  remove: () => setTailles(tailles.filter((x) => x !== t.value)) })),
    ...regions.map((r)   => ({ label: r,         remove: () => setRegions(regions.filter((x) => x !== r)) })),
    ...apeCodes.map((c)  => ({ label: c,         remove: () => setApeCodes(apeCodes.filter((x) => x !== c)) })),
  ];
  if (all.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 pt-2">
      {all.map(({ label, remove }, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 bg-teal/10 border border-teal/20 text-teal text-[12px] font-semibold rounded-full"
        >
          {label}
          <button
            type="button"
            onClick={remove}
            className="w-4 h-4 rounded-full hover:bg-teal/20 grid place-items-center text-[10px] leading-none"
          >
            ×
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={() => { setSecteurs([]); setRegions([]); setTailles([]); setApeCodes([]); }}
        className="text-[11px] text-text-3 hover:text-lh-red font-semibold px-1"
      >
        Tout effacer
      </button>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────

function Pagination({
  page,
  total,
  pageSize,
  onPage,
  loading,
}: {
  page:     number;
  total:    number;
  pageSize: number;
  onPage:   (p: number) => void;
  loading:  boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  // Fenêtre de pages affichées : max 5 numéros centrés sur la page courante
  const window = 2;
  const start  = Math.max(1, page - window);
  const end    = Math.min(totalPages, page + window);
  const pages  = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const btn = (label: React.ReactNode, target: number, active = false, disabled = false, key?: string) => (
    <button
      key={key}
      type="button"
      disabled={disabled || loading}
      onClick={() => !disabled && !active && onPage(target)}
      className={[
        "min-w-[34px] h-[34px] px-2 rounded-lg text-[13px] font-semibold border transition-colors flex items-center justify-center",
        active
          ? "bg-teal text-white border-teal shadow-sm"
          : disabled
          ? "text-text-3 border-border cursor-not-allowed opacity-40"
          : "bg-surface text-text-2 border-border hover:bg-bg hover:border-teal/40",
      ].join(" ")}
    >
      {label}
    </button>
  );

  return (
    <div className="mt-4 flex items-center justify-between">
      <span className="text-[12px] text-text-3">
        Page <span className="font-semibold text-text-2">{page}</span> sur{" "}
        <span className="font-semibold text-text-2">{totalPages}</span>
        {" · "}
        <span className="font-semibold text-text-2">{total.toLocaleString("fr-FR")}</span> résultat{total > 1 ? "s" : ""}
      </span>

      <div className="flex items-center gap-1">
        {/* Flèche première page */}
        {btn(
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
            <path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
            <path d="M4 1.5a.5.5 0 0 1 .5.5v12a.5.5 0 0 1-1 0V2a.5.5 0 0 1 .5-.5z"/>
          </svg>,
          1, false, page === 1, "first"
        )}
        {/* Flèche précédent */}
        {btn(
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
            <path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
          </svg>,
          page - 1, false, page === 1, "prev"
        )}

        {start > 1 && <span key="dots-start" className="text-[12px] text-text-3 px-1">…</span>}

        {pages.map((p) => btn(p, p, p === page, false, `page-${p}`))}

        {end < totalPages && <span key="dots-end" className="text-[12px] text-text-3 px-1">…</span>}

        {/* Flèche suivant */}
        {btn(
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
            <path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
          </svg>,
          page + 1, false, page === totalPages, "next"
        )}
        {/* Flèche dernière page */}
        {btn(
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
            <path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
            <path d="M12 1.5a.5.5 0 0 1 .5.5v12a.5.5 0 0 1-1 0V2a.5.5 0 0 1 .5-.5z"/>
          </svg>,
          totalPages, false, page === totalPages, "last"
        )}
      </div>
    </div>
  );
}

// ─── Modal "Sauvegarder en liste" ────────────────────────────────

function SaveListModal({
  filters,
  onClose,
}: {
  filters: { query?: string; apeBuckets?: string[]; headcountBands?: string[]; regions?: string[] };
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName]       = useState("");
  const [pending, start]      = useTransition();
  const [error, setError]     = useState<string | null>(null);

  function handleSave() {
    if (!name.trim()) return;
    start(async () => {
      const r = await createListAction({
        name: name.trim(),
        type: "DYNAMIC",
        filters,
      });
      if (r.ok) {
        router.push(`/listes/${r.listId}`);
        onClose();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
        <div className="text-[15px] font-extrabold text-navy">Sauvegarder en liste ICP</div>
        <p className="text-[12px] text-text-3">
          Cette liste dynamique se rafraîchira automatiquement avec les filtres actifs.
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="Nom de la liste…"
          autoFocus
          className="w-full px-3 py-2 text-[13px] bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40"
        />
        {error && <p className="text-[12px] text-lh-red">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="button" disabled={!name.trim() || pending} onClick={handleSave}>
            {pending ? "Sauvegarde…" : "Sauvegarder"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Export CSV ───────────────────────────────────────────────────

function downloadCSV(filename: string, rows: string[][], headers: string[]) {
  const escape = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers, ...rows].map((r) => r.map(escape).join(";")).join("\r\n");
  const blob = new Blob(["﻿" + lines], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Session storage helpers ──────────────────────────────────────

function ssGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const s = sessionStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : fallback;
  } catch { return fallback; }
}
function ssSave(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ─── Composant principal ──────────────────────────────────────────

export function SearchForm() {
  const [mode, setMode] = useState<Mode>(() => ssGet("prospection_mode", "insee" as Mode));

  useEffect(() => { ssSave("prospection_mode", mode); }, [mode]);

  return (
    <div>
      {/* Toggle mode */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {([ ["insee", "🏢 INSEE Sirene"], ["dirigeant", "👤 Dirigeant (Pappers)"], ["datagouv", "🇫🇷 Data.gouv"] ] as [Mode, string][]).map(([m, lbl]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m as Mode)}
            className={[
              "px-4 py-2 rounded-lg text-[13px] font-semibold border transition-colors",
              mode === m
                ? "bg-navy text-white border-navy shadow-sm"
                : "bg-surface text-text-2 border-border hover:bg-bg",
            ].join(" ")}
          >
            {lbl}
          </button>
        ))}
      </div>

      <div className={mode === "insee"     ? "" : "hidden"}><InseeSearch /></div>
      <div className={mode === "dirigeant" ? "" : "hidden"}><DirectorSearch /></div>
      <div className={mode === "datagouv"  ? "" : "hidden"}><DatagouvSearch /></div>
    </div>
  );
}

// ─── INSEE Search ─────────────────────────────────────────────────

const INSEE_KEY = "prospection_insee";

function InseeSearch() {
  const [query,     setQuery]     = useState(() => ssGet<string>(INSEE_KEY + "_q", ""));
  const [secteurs,  setSecteurs]  = useState<string[]>(() => ssGet(INSEE_KEY + "_secteurs", []));
  const [regions,   setRegions]   = useState<string[]>(() => ssGet(INSEE_KEY + "_regions", []));
  const [tailles,   setTailles]   = useState<string[]>(() => ssGet(INSEE_KEY + "_tailles", []));
  const [apeCodes,  setApeCodes]  = useState<string[]>(() => ssGet(INSEE_KEY + "_ape", []));
  const [page,      setPage]      = useState(() => ssGet<number>(INSEE_KEY + "_page", 1));
  const [result,    setResult]    = useState<SearchResult | null>(() => ssGet(INSEE_KEY + "_result", null));
  const [error,     setError]     = useState<string | null>(null);
  const [pending,   start]        = useTransition();
  const [importing,    setImporting]   = useState<string | null>(null);
  const [importingAll, setImportingAll] = useState(false);
  const [importedIds,  setImportedIds] = useState<Record<string, string>>(() => ssGet(INSEE_KEY + "_ids", {}));
  const [saveOpen,     setSaveOpen]    = useState(false);

  // Persist state across navigations
  useEffect(() => { ssSave(INSEE_KEY + "_q",       query);      }, [query]);
  useEffect(() => { ssSave(INSEE_KEY + "_secteurs", secteurs);  }, [secteurs]);
  useEffect(() => { ssSave(INSEE_KEY + "_regions",  regions);   }, [regions]);
  useEffect(() => { ssSave(INSEE_KEY + "_tailles",  tailles);   }, [tailles]);
  useEffect(() => { ssSave(INSEE_KEY + "_ape",      apeCodes);  }, [apeCodes]);
  useEffect(() => { ssSave(INSEE_KEY + "_page",     page);      }, [page]);
  useEffect(() => { ssSave(INSEE_KEY + "_result",   result);    }, [result]);
  useEffect(() => { ssSave(INSEE_KEY + "_ids",      importedIds); }, [importedIds]);

  const hasFilters = secteurs.length > 0 || regions.length > 0 || tailles.length > 0 || apeCodes.length > 0 || query.trim().length > 0;

  function handleReset() {
    setQuery(""); setSecteurs([]); setRegions([]); setTailles([]); setApeCodes([]);
    setPage(1); setResult(null); setError(null); setImportedIds({});
    [INSEE_KEY + "_q", INSEE_KEY + "_secteurs", INSEE_KEY + "_regions",
     INSEE_KEY + "_tailles", INSEE_KEY + "_ape", INSEE_KEY + "_page",
     INSEE_KEY + "_result", INSEE_KEY + "_ids"].forEach((k) => sessionStorage.removeItem(k));
  }

  async function importAll() {
    if (!result) return;
    const toImport = result.results.filter((r) => !r.alreadyImported);
    if (!toImport.length) return;
    setImportingAll(true);
    setError(null);
    let current = result;
    for (const r of toImport) {
      setImporting(r.siren);
      try {
        const out = await importSireneCompanyAction({
          siren: r.siren, siret: r.siret ?? undefined, name: r.name,
          apeCode: r.apeCode, nafBucket: r.nafBucket, legalForm: r.legalForm,
          legalFormCode: r.legalFormCode, headcountBand: r.headcountBand,
          region: r.region, department: r.department, city: r.city,
          postalCode: r.postalCode, address: r.address, creationDate: r.creationDate,
        });
        if (out.ok) {
          current = { ...current, results: current.results.map((x) => x.siren === r.siren ? { ...x, alreadyImported: true } : x) };
          setResult(current);
          setImportedIds((prev) => ({ ...prev, [r.siren]: out.companyId }));
        }
      } catch { /* continue */ }
    }
    setImporting(null);
    setImportingAll(false);
  }

  function runSearch(targetPage = 1) {
    setError(null);
    setPage(targetPage);
    start(async () => {
      try {
        const r = await searchSireneAction({
          query:          query || undefined,
          apeBuckets:     secteurs.length  ? secteurs  : undefined,
          apeCodes:       apeCodes.length  ? apeCodes  : undefined,
          headcountBands: tailles.length   ? tailles   : undefined,
          regions:        regions.length   ? regions   : undefined,
          page:           targetPage,
        });
        setResult(r);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue");
      }
    });
  }

  async function importOne(siren: string) {
    if (!result) return;
    const r = result.results.find((x) => x.siren === siren);
    if (!r) return;
    setImporting(siren);
    try {
      const out = await importSireneCompanyAction({
        siren: r.siren, siret: r.siret ?? undefined, name: r.name,
        apeCode: r.apeCode, nafBucket: r.nafBucket, legalForm: r.legalForm,
        legalFormCode: r.legalFormCode, headcountBand: r.headcountBand,
        region: r.region, department: r.department, city: r.city,
        postalCode: r.postalCode, address: r.address, creationDate: r.creationDate,
      });
      if (out.ok) {
        setResult({ ...result, results: result.results.map((x) => x.siren === siren ? { ...x, alreadyImported: true } : x) });
        setImportedIds((prev) => ({ ...prev, [siren]: out.companyId }));
      } else {
        setError(out.error);
      }
    } finally {
      setImporting(null);
    }
  }

  return (
    <div>
      {/* Barre de recherche + filtres */}
      <div className="bg-surface rounded-xl border border-border shadow-sm p-4 mb-5">
        {/* Ligne 1 : champ texte + boutons */}
        <div className="flex gap-2 mb-1">
          <input
            type="text"
            placeholder="Raison sociale, SIREN (9 chiffres), SIRET (14 chiffres) ou code APE (ex : 55.10Z)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch(1)}
            className="flex-1 px-4 py-2.5 rounded-lg border border-border text-[14px] focus:outline-none focus:ring-2 focus:ring-teal/40"
          />
          {(result || hasFilters) && (
            <button type="button" onClick={handleReset}
              className="px-3 py-2 rounded-lg border border-border text-[13px] font-semibold text-text-3 hover:text-lh-red hover:border-lh-red/30 hover:bg-lh-red-bg transition-colors">
              ↺ Réinitialiser
            </button>
          )}
          <Button onClick={() => runSearch(1)} disabled={pending} type="button">
            {pending ? "Recherche…" : "🔍 Rechercher"}
          </Button>
        </div>
        <p className="text-[11px] text-text-3 mb-3 px-1">
          Recherchez par <span className="font-semibold text-text-2">raison sociale</span>, <span className="font-semibold text-text-2">SIREN</span>, <span className="font-semibold text-text-2">SIRET</span> ou <span className="font-semibold text-text-2">code APE</span> — puis affinez avec les filtres ci-dessous.
        </p>

        {/* Ligne 2 : dropdowns filtres */}
        <div className="flex flex-wrap gap-2 items-center">
          <MultiSelect
            label="Secteur"
            options={SECTEURS}
            selected={secteurs}
            onChange={setSecteurs}
          />
          <NafCodePicker
            selected={apeCodes}
            onChange={setApeCodes}
          />
          <MultiSelect
            label="Localisation"
            options={REGIONS.map((r) => ({ value: r, label: r }))}
            selected={regions}
            onChange={setRegions}
          />
          <MultiSelect
            label="Taille"
            options={TAILLES}
            selected={tailles}
            onChange={setTailles}
          />
          {hasFilters && result && result.total > 0 && (
            <button
              type="button"
              onClick={() => setSaveOpen(true)}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-teal/40 text-teal text-[12px] font-semibold hover:bg-teal/5 transition-colors"
            >
              ⊕ Sauvegarder en liste
            </button>
          )}
        </div>

        {/* Tags actifs */}
        <ActiveTags
          secteurs={secteurs}   setSecteurs={setSecteurs}
          regions={regions}     setRegions={setRegions}
          tailles={tailles}     setTailles={setTailles}
          apeCodes={apeCodes}   setApeCodes={setApeCodes}
        />
      </div>

      {error && <div className="mb-4 px-4 py-3 rounded-lg bg-lh-red-bg text-lh-red text-[13px]">{error}</div>}

      {/* Bandeau "Mode démo" — visible dès la première recherche si pas de creds INSEE */}
      {result?.source === "MOCK" && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
          <span className="text-amber-500 text-[18px] mt-0.5 shrink-0">⚠</span>
          <div>
            <div className="text-[13px] font-bold text-amber-800 mb-0.5">
              Clés API INSEE manquantes — mode démo actif
            </div>
            <div className="text-[12px] text-amber-700 leading-relaxed">
              Les résultats affichés sont <strong>fictifs</strong>. Pour accéder aux{" "}
              <strong>30 millions d'entreprises françaises réelles</strong>, configurez vos credentials INSEE gratuitement :{" "}
              <ol className="mt-1 ml-4 list-decimal space-y-0.5">
                <li>Créez un compte sur{" "}<a href="https://portail-api.insee.fr" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-amber-900">portail-api.insee.fr</a></li>
                <li>Souscrivez à l'API <strong>Sirene</strong> (gratuit, instantané)</li>
                <li>Copiez votre <strong>Consumer Key</strong> → <code className="bg-amber-100 px-1 rounded">INSEE_CLIENT_ID</code> dans <code className="bg-amber-100 px-1 rounded">.env.local</code></li>
                <li>Copiez votre <strong>Consumer Secret</strong> → <code className="bg-amber-100 px-1 rounded">INSEE_CLIENT_SECRET</code></li>
                <li>Redémarrez le serveur (<code className="bg-amber-100 px-1 rounded">npm run dev</code>)</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <Chip color="navy">{result.total} résultat{result.total > 1 ? "s" : ""}</Chip>
          <Chip color={result.source === "INSEE" ? "teal" : "amber"}>
            {result.source === "INSEE" ? "Source INSEE Sirene" : "Mode démo (données fictives)"}
          </Chip>
          <button
            type="button"
            onClick={() => downloadCSV(
              `prospection-insee-${new Date().toISOString().slice(0,10)}.csv`,
              result.results.map((r) => [
                r.name, r.siren, r.legalForm ?? "", r.apeCode ?? "",
                r.nafBucket ?? "", r.region ?? "", r.city ?? "",
                r.headcountBand ?? "", String(r.icpScore),
                r.alreadyImported ? "Importé" : "Non importé",
              ]),
              ["Raison sociale","SIREN","Forme juridique","Code APE","Secteur","Région","Ville","Effectifs","Score ICP","Statut"]
            )}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[12px] font-semibold text-text-2 hover:bg-bg transition-colors"
          >
            📥 Excel
          </button>
          {result.results.some((r) => !r.alreadyImported) && (
            <button
              type="button"
              onClick={importAll}
              disabled={importingAll}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy text-white text-[12px] font-semibold hover:bg-navy/80 disabled:opacity-50 transition-colors"
            >
              {importingAll
                ? `Importation… (${result.results.filter((r) => r.alreadyImported).length}/${result.results.length})`
                : `⬇ Tout importer (${result.results.filter((r) => !r.alreadyImported).length})`}
            </button>
          )}
        </div>
      )}

      {result && result.results.length > 0 && (
        <>
          <ResultTable>
            {result.results.map((r) => (
              <ResultRow
                key={r.siren}
                siren={r.siren}
                name={r.name}
                legalForm={r.legalForm}
                apeCode={r.apeCode}
                nafBucket={r.nafBucket}
                region={r.region}
                city={r.city}
                headcountBand={r.headcountBand}
                icpScore={r.icpScore}
                alreadyImported={r.alreadyImported}
                companyId={importedIds[r.siren] ?? r.companyId ?? undefined}
                importing={importing === r.siren}
                onImport={() => importOne(r.siren)}
              />
            ))}
          </ResultTable>
          <Pagination
            page={page}
            total={result.total}
            pageSize={result.pageSize}
            onPage={(p) => runSearch(p)}
            loading={pending}
          />
        </>
      )}

      {result && result.results.length === 0 && <EmptyState />}

      {saveOpen && (
        <SaveListModal
          filters={{ query: query || undefined, apeBuckets: secteurs.length ? secteurs : undefined, headcountBands: tailles.length ? tailles : undefined, regions: regions.length ? regions : undefined }}
          onClose={() => setSaveOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Dirigeant Search (Pappers) ───────────────────────────────────

const DIR_KEY = "prospection_dir";

function DirectorSearch() {
  const [query,    setQuery]    = useState(() => ssGet<string>(DIR_KEY + "_q", ""));
  const [result,   setResult]   = useState<DirectorSearchResult | null>(() => ssGet(DIR_KEY + "_result", null));
  const [error,    setError]    = useState<string | null>(null);
  const [pending,  start]       = useTransition();
  const [importing,setImporting]= useState<string | null>(null);

  useEffect(() => { ssSave(DIR_KEY + "_q",      query);  }, [query]);
  useEffect(() => { ssSave(DIR_KEY + "_result",  result); }, [result]);

  function handleReset() {
    setQuery(""); setResult(null); setError(null);
    [DIR_KEY + "_q", DIR_KEY + "_result"].forEach((k) => sessionStorage.removeItem(k));
  }

  function runSearch() {
    if (query.trim().length < 2) return;
    setError(null);
    start(async () => {
      try { setResult(await searchDirectorAction({ name: query })); }
      catch (e) { setError(e instanceof Error ? e.message : "Erreur Pappers"); }
    });
  }

  async function importOne(siren: string) {
    setImporting(siren);
    try {
      const out = await importPappersCompanyAction({ siren });
      if (out.ok) {
        setResult((prev) => prev ? {
          ...prev,
          results: prev.results.map((hit) => ({
            ...hit,
            entreprises: hit.entreprises.map((e) => e.siren === siren ? { ...e, alreadyImported: true } : e),
          })),
        } : prev);
      } else {
        setError(out.error);
      }
    } finally { setImporting(null); }
  }

  return (
    <div>
      <div className="bg-surface rounded-xl border border-border shadow-sm p-4 mb-5">
        <div className="flex gap-2 mb-1">
          <input
            type="text"
            placeholder="Nom de famille du dirigeant… ex : Dupont, Martin"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            className="flex-1 px-4 py-2.5 rounded-lg border border-border text-[14px] focus:outline-none focus:ring-2 focus:ring-teal/40"
          />
          {(result || query.trim().length > 0) && (
            <button type="button" onClick={handleReset}
              className="px-3 py-2 rounded-lg border border-border text-[13px] font-semibold text-text-3 hover:text-lh-red hover:border-lh-red/30 hover:bg-lh-red-bg transition-colors">
              ↺ Réinitialiser
            </button>
          )}
          <Button onClick={() => runSearch()} disabled={pending || query.trim().length < 2} type="button">
            {pending ? "Recherche…" : "🔍 Rechercher"}
          </Button>
        </div>
        <p className="text-[11px] text-text-3 px-1">
          Recherchez par <span className="font-semibold text-text-2">nom de dirigeant</span> (PDG, gérant, président…) — toutes ses entreprises apparaissent avec leur SIREN et code APE. Source : <span className="font-semibold text-text-2">Pappers</span>.
        </p>
      </div>

      {error && <div className="mb-4 px-4 py-3 rounded-lg bg-lh-red-bg text-lh-red text-[13px]">{error}</div>}

      {result && (
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <Chip color="purple">{result.total} dirigeant{result.total > 1 ? "s" : ""}</Chip>
          <Chip color="teal">Source Pappers</Chip>
          <button
            type="button"
            onClick={() => {
              const rows = result.results.flatMap((hit) =>
                hit.entreprises.map((e) => [
                  [hit.prenom, hit.nom].filter(Boolean).join(" "),
                  hit.qualite,
                  e.nom, e.siren, e.legalForm ?? "", e.apeCode ?? "",
                  e.city ?? "", e.isActive ? "Active" : "Fermée",
                  e.alreadyImported ? "Importé" : "Non importé",
                ])
              );
              downloadCSV(
                `prospection-pappers-${new Date().toISOString().slice(0,10)}.csv`,
                rows,
                ["Dirigeant","Qualité","Raison sociale","SIREN","Forme juridique","Code APE","Ville","État","Statut"]
              );
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[12px] font-semibold text-text-2 hover:bg-bg transition-colors"
          >
            📥 Excel
          </button>
        </div>
      )}

      {result && result.results.length > 0 && (
        <div className="space-y-4">
          {result.results.map((hit, i) => (
            <div key={i} className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-bg border-b border-border flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-navy/10 grid place-items-center text-[13px] font-bold text-navy flex-none">
                  {(hit.prenom?.[0] ?? "")}{(hit.nom?.[0] ?? "")}
                </div>
                <div>
                  <div className="text-[14px] font-bold text-text-1">{[hit.prenom, hit.nom].filter(Boolean).join(" ")}</div>
                  <div className="text-[11px] text-text-3">{hit.qualite}</div>
                </div>
                <div className="ml-auto text-[11px] text-text-3">{hit.entreprises.length} entreprise{hit.entreprises.length > 1 ? "s" : ""}</div>
              </div>
              <table className="w-full">
                <tbody>
                  {hit.entreprises.map((e) => (
                    <tr key={e.siren} className="border-b border-border last:border-b-0 hover:bg-bg/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={e.nom} seed={e.siren} size={28} />
                          <div>
                            <div className="text-[13px] font-semibold text-text-1">{e.nom}</div>
                            <div className="text-[11px] text-text-3 font-mono">{e.siren} · {e.legalForm ?? "—"} {e.apeCode ? `· ${e.apeCode}` : ""}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-text-3">{e.city ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        {!e.isActive
                          ? <Chip color="red">Fermée</Chip>
                          : e.alreadyImported
                          ? (
                            <div className="flex items-center justify-end gap-1.5">
                              {e.companyId ? (
                                <>
                                  <a href={`/comptes/${e.companyId}`}
                                    className="inline-flex items-center px-2 py-1 rounded-lg border border-border text-[11px] font-semibold text-text-2 hover:bg-bg transition-colors">
                                    Voir →
                                  </a>
                                  <a href={`/comptes/${e.companyId}?tab=deals`}
                                    className="inline-flex items-center px-2 py-1 rounded-lg bg-teal text-white text-[11px] font-bold hover:bg-teal/80 transition-colors">
                                    ＋ Deal
                                  </a>
                                </>
                              ) : <Chip color="teal">✓ Dans Comptes</Chip>}
                            </div>
                          )
                          : (
                            <Button type="button" variant="toolbar" onClick={() => importOne(e.siren)} disabled={importing === e.siren}>
                              {importing === e.siren ? "…" : "+ Importer"}
                            </Button>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {result && result.results.length === 0 && <EmptyState label="Aucun dirigeant trouvé — vérifiez l'orthographe." />}
    </div>
  );
}

// ─── Data.gouv Search ─────────────────────────────────────────────

const DG_KEY = "prospection_dg";

function DatagouvSearch() {
  const [query,       setQuery]       = useState(() => ssGet<string>(DG_KEY + "_q", ""));
  const [page,        setPage]        = useState(() => ssGet<number>(DG_KEY + "_page", 1));
  const [result,      setResult]      = useState<DatagouvSearchResult | null>(() => ssGet(DG_KEY + "_result", null));
  const [error,       setError]       = useState<string | null>(null);
  const [pending,     start]          = useTransition();
  const [importing,   setImporting]   = useState<string | null>(null);
  const [importingAll,setImportingAll] = useState(false);

  useEffect(() => { ssSave(DG_KEY + "_q",      query);  }, [query]);
  useEffect(() => { ssSave(DG_KEY + "_page",   page);   }, [page]);
  useEffect(() => { ssSave(DG_KEY + "_result", result); }, [result]);

  function handleReset() {
    setQuery(""); setPage(1); setResult(null); setError(null);
    [DG_KEY + "_q", DG_KEY + "_page", DG_KEY + "_result"].forEach((k) => sessionStorage.removeItem(k));
  }

  async function importAll() {
    if (!result) return;
    const toImport = result.results.filter((r) => !r.alreadyImported);
    if (!toImport.length) return;
    setImportingAll(true);
    setError(null);
    let current = result;
    for (const r of toImport) {
      setImporting(r.siren);
      try {
        const out = await importDatagouvCompanyAction({
          siren: r.siren, siret: r.siret, name: r.name,
          legalForm: r.legalForm, apeCode: r.apeCode,
          headcountBand: r.headcountBand, region: r.region,
          department: r.department, city: r.city,
          postalCode: r.postalCode, address: r.address,
        });
        if (out.ok) {
          current = { ...current, results: current.results.map((x) => x.siren === r.siren ? { ...x, alreadyImported: true } : x) };
          setResult(current);
        }
      } catch { /* continue */ }
    }
    setImporting(null);
    setImportingAll(false);
  }

  function runSearch(targetPage = 1) {
    if (!query.trim()) return;
    setError(null);
    setPage(targetPage);
    start(async () => {
      try { setResult(await searchDatagouvAction({ query, page: targetPage })); }
      catch (e) { setError(e instanceof Error ? e.message : "Erreur Data.gouv"); }
    });
  }

  async function importOne(r: DatagouvSearchResult["results"][0]) {
    setImporting(r.siren);
    try {
      const out = await importDatagouvCompanyAction({
        siren: r.siren, siret: r.siret, name: r.name,
        legalForm: r.legalForm, apeCode: r.apeCode,
        headcountBand: r.headcountBand, region: r.region,
        department: r.department, city: r.city,
        postalCode: r.postalCode, address: r.address,
      });
      if (out.ok) {
        setResult((prev) => prev ? {
          ...prev,
          results: prev.results.map((x) => x.siren === r.siren ? { ...x, alreadyImported: true } : x),
        } : prev);
      } else {
        setError(out.error);
      }
    } finally { setImporting(null); }
  }

  return (
    <div>
      <div className="bg-surface rounded-xl border border-border shadow-sm p-4 mb-5">
        <div className="flex gap-2 mb-1">
          <input
            type="text"
            placeholder="Raison sociale, SIREN (9 chiffres), SIRET (14 chiffres) ou code APE (ex : 71.11Z)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch(1)}
            className="flex-1 px-4 py-2.5 rounded-lg border border-border text-[14px] focus:outline-none focus:ring-2 focus:ring-teal/40"
          />
          {(result || query.trim().length > 0) && (
            <button type="button" onClick={handleReset}
              className="px-3 py-2 rounded-lg border border-border text-[13px] font-semibold text-text-3 hover:text-lh-red hover:border-lh-red/30 hover:bg-lh-red-bg transition-colors">
              ↺ Réinitialiser
            </button>
          )}
          <Button onClick={() => runSearch(1)} disabled={pending || !query.trim()} type="button">
            {pending ? "Recherche…" : "🔍 Rechercher"}
          </Button>
        </div>
        <p className="text-[11px] text-text-3 px-1">
          Recherchez par <span className="font-semibold text-text-2">raison sociale</span>, <span className="font-semibold text-text-2">SIREN</span>, <span className="font-semibold text-text-2">SIRET</span> ou <span className="font-semibold text-text-2">code APE</span> — annuaire officiel agrégeant INSEE, INPI et URSSAF. Inclut les <span className="font-semibold text-text-2">dirigeants</span> et l'<span className="font-semibold text-text-2">adresse du siège</span>.
        </p>
      </div>

      {error && <div className="mb-4 px-4 py-3 rounded-lg bg-lh-red-bg text-lh-red text-[13px]">{error}</div>}

      {result && (
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <Chip color="navy">{result.total} résultat{result.total > 1 ? "s" : ""}</Chip>
          <Chip color="blue">🇫🇷 Source Data.gouv</Chip>
          <button
            type="button"
            onClick={() => downloadCSV(
              `prospection-datagouv-${new Date().toISOString().slice(0,10)}.csv`,
              result.results.map((r) => [
                r.name, r.siren, r.legalForm ?? "", r.apeCode ?? "",
                r.region ?? "", r.city ?? "", r.headcountBand ?? "",
                r.dirigeants?.slice(0,3).map((d) => [d.prenom, d.nom].filter(Boolean).join(" ")).join(", ") ?? "",
                r.alreadyImported ? "Importé" : "Non importé",
              ]),
              ["Raison sociale","SIREN","Forme juridique","Code APE","Région","Ville","Effectifs","Dirigeants","Statut"]
            )}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[12px] font-semibold text-text-2 hover:bg-bg transition-colors"
          >
            📥 Excel
          </button>
          {result.results.some((r) => !r.alreadyImported) && (
            <button
              type="button"
              onClick={importAll}
              disabled={importingAll}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy text-white text-[12px] font-semibold hover:bg-navy/80 disabled:opacity-50 transition-colors"
            >
              {importingAll
                ? `Importation… (${result.results.filter((r) => r.alreadyImported).length}/${result.results.length})`
                : `⬇ Tout importer (${result.results.filter((r) => !r.alreadyImported).length})`}
            </button>
          )}
        </div>
      )}

      {result && result.results.length > 0 && (
        <>
          <ResultTable extraCol="Dirigeants">
            {result.results.map((r) => (
              <ResultRow
                key={r.siren}
                siren={r.siren}
                name={r.name}
                legalForm={r.legalForm}
                apeCode={r.apeCode}
                nafBucket={null}
                region={r.region}
                city={r.city}
                headcountBand={r.headcountBand}
                icpScore={r.icpScore}
                alreadyImported={r.alreadyImported}
                companyId={r.companyId ?? undefined}
                importing={importing === r.siren}
                isActive={r.isActive}
                extra={
                  r.dirigeants.length > 0
                    ? r.dirigeants.slice(0, 2).map((d) => [d.prenom, d.nom].filter(Boolean).join(" ")).join(", ")
                    : "—"
                }
                onImport={() => importOne(r)}
              />
            ))}
          </ResultTable>
          <Pagination
            page={page}
            total={result.total}
            pageSize={20}
            onPage={(p) => runSearch(p)}
            loading={pending}
          />
        </>
      )}

      {result && result.results.length === 0 && <EmptyState />}
    </div>
  );
}

// ─── Shared table components ──────────────────────────────────────

function ResultTable({ children, extraCol }: { children: React.ReactNode; extraCol?: string }) {
  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-bg border-b border-border text-[10px] font-bold uppercase tracking-wider text-text-3">
            <th className="text-left px-3 py-3 w-[60px]">ICP</th>
            <th className="text-left px-3 py-3 min-w-[240px]">Entreprise · SIREN</th>
            <th className="text-left px-3 py-3">APE</th>
            <th className="text-left px-3 py-3">Région · Ville</th>
            <th className="text-left px-3 py-3">Effectifs</th>
            {extraCol && <th className="text-left px-3 py-3">{extraCol}</th>}
            <th className="text-right px-3 py-3 w-[140px]">Action</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function ResultRow({
  siren, name, legalForm, apeCode, nafBucket,
  region, city, headcountBand, icpScore,
  alreadyImported, companyId, importing, isActive = true,
  extra, onImport,
}: {
  siren: string; name: string; legalForm: string | null; apeCode: string | null;
  nafBucket: string | null; region: string | null; city: string | null;
  headcountBand: string | null; icpScore: number; alreadyImported: boolean;
  companyId?: string; importing: boolean; isActive?: boolean; extra?: string; onImport: () => void;
}) {
  return (
    <tr className="border-b border-border last:border-b-0 hover:bg-bg/50">
      <td className="px-3 py-3"><ScoreCircle score={icpScore} /></td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={name} seed={siren} size={32} />
          <div>
            <div className="text-[13px] font-semibold text-text-1">{name}</div>
            <div className="text-[11px] text-text-3 font-mono">{siren} · {legalForm ?? "—"}</div>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="text-[12px] font-bold text-navy font-mono">{apeCode ?? "—"}</div>
        {nafBucket && <div className="text-[10px] text-text-2 capitalize">{nafBucket}</div>}
      </td>
      <td className="px-3 py-3">
        <div className="text-[12px] font-semibold text-text-2">{region?.split("-")[0].trim() ?? "—"}</div>
        <div className="text-[11px] text-text-3">{city ?? "—"}</div>
      </td>
      <td className="px-3 py-3 text-[12px] text-text-2">{headcountBand ?? "—"}</td>
      {extra !== undefined && <td className="px-3 py-3 text-[11px] text-text-3 max-w-[160px] truncate">{extra}</td>}
      <td className="px-3 py-3 text-right">
        {!isActive
          ? <Chip color="red">Fermée</Chip>
          : alreadyImported
          ? (
            <div className="flex items-center justify-end gap-1.5">
              {companyId ? (
                <>
                  <a
                    href={`/comptes/${companyId}`}
                    className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg border border-border text-[11px] font-semibold text-text-2 hover:bg-bg transition-colors"
                  >
                    Voir →
                  </a>
                  <a
                    href={`/comptes/${companyId}?tab=deals`}
                    className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-teal text-white text-[11px] font-bold hover:bg-teal/80 transition-colors"
                  >
                    ＋ Deal
                  </a>
                </>
              ) : (
                <Chip color="teal">✓ Dans Comptes</Chip>
              )}
            </div>
          )
          : (
            <Button type="button" variant="toolbar" onClick={onImport} disabled={importing}>
              {importing ? "…" : "+ Importer"}
            </Button>
          )}
      </td>
    </tr>
  );
}

function EmptyState({ label }: { label?: string }) {
  return (
    <div className="text-center text-text-3 text-[13px] py-12">
      {label ?? "Aucun résultat — essayez d'élargir les filtres."}
    </div>
  );
}
