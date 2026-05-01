"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { createListAction } from "@/app/_actions/lists";

const APE_BUCKETS = [
  { code: "hotel",        label: "Hôtellerie" },
  { code: "logistique",   label: "Logistique" },
  { code: "retail",       label: "Distribution" },
  { code: "industrie",    label: "Industrie" },
  { code: "immo",         label: "Immobilier" },
  { code: "services",     label: "Services" },
  { code: "tech",         label: "Tech / IT" },
  { code: "sante",        label: "Santé" },
  { code: "education",    label: "Éducation" },
  { code: "restauration", label: "Restauration" },
  { code: "finance",      label: "Finance" },
  { code: "btp",          label: "BTP" },
  { code: "agriculture",  label: "Agriculture" },
  { code: "energie",      label: "Énergie" },
  { code: "culture",      label: "Culture / Média" },
];

const HEADCOUNT_BANDS = [
  { code: "1-9",     label: "1 – 9 salariés (TPE)" },
  { code: "10-49",   label: "10 – 49 salariés (PE)" },
  { code: "50-249",  label: "50 – 249 salariés (PME)" },
  { code: "250-999", label: "250 – 999 salariés (ETI)" },
  { code: "1000+",   label: "1 000+ salariés (GE)" },
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

const COLORS = ["#14b8a6", "#0d9488", "#d4a574", "#7c3aed", "#dc2626", "#0ea5e9"];

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

// ─── Multi-select dropdown ────────────────────────────────────────────────────

function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
}: {
  options: { code: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [rect, setRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleOpen() {
    if (!open && triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect());
    }
    setOpen((v) => !v);
  }

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );
  const selectedLabels = options
    .filter((o) => selected.includes(o.code))
    .map((o) => o.label);

  // Decide whether to open upward or downward based on available space
  const spaceBelow = rect ? window.innerHeight - rect.bottom : 999;
  const dropUp = spaceBelow < 260;

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-bg text-[13px] focus:outline-none focus:ring-2 focus:ring-teal/40 hover:border-teal/40 transition-colors"
      >
        <span className={selected.length === 0 ? "text-text-3" : "text-text-1 truncate"}>
          {selected.length === 0
            ? placeholder
            : selectedLabels.join(", ")}
        </span>
        <span className="ml-2 shrink-0 flex items-center gap-1.5">
          {selected.length > 0 && (
            <span className="text-[10px] bg-teal text-white rounded-full px-1.5 py-px font-bold">
              {selected.length}
            </span>
          )}
          <svg className={`w-4 h-4 text-text-3 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </span>
      </button>

      {/* Dropdown — fixed position so it never pushes the layout */}
      {open && rect && (
        <div
          ref={containerRef}
          style={{
            position: "fixed",
            left: rect.left,
            width: rect.width,
            ...(dropUp
              ? { bottom: window.innerHeight - rect.top + 4 }
              : { top: rect.bottom + 4 }),
          }}
          className="z-[200] bg-surface border border-border rounded-xl shadow-xl overflow-hidden"
        >
          {/* Search */}
          <div className="p-2 border-b border-border">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              autoFocus
              className="w-full px-2 py-1.5 text-[12px] bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40"
            />
          </div>

          {/* Options */}
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-[12px] text-text-3 text-center">Aucun résultat</div>
            )}
            {filtered.map((o) => {
              const checked = selected.includes(o.code);
              return (
                <button
                  key={o.code}
                  type="button"
                  onClick={() => onChange(toggle(selected, o.code))}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-bg transition-colors text-left"
                >
                  <span
                    className={`w-4 h-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                      checked ? "bg-teal border-teal" : "border-border"
                    }`}
                  >
                    {checked && (
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className={checked ? "text-navy font-semibold" : "text-text-2"}>
                    {o.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          {selected.length > 0 && (
            <div className="border-t border-border px-3 py-2">
              <button
                type="button"
                onClick={() => { onChange([]); setSearch(""); }}
                className="text-[11px] text-text-3 hover:text-lh-red transition-colors"
              >
                Tout désélectionner
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Formulaire principal ─────────────────────────────────────────────────────

export function NewListForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [type, setType] = useState<"DYNAMIC" | "STATIC">("DYNAMIC");

  const [apeBuckets, setApeBuckets] = useState<string[]>([]);
  const [headcountBands, setHeadcountBands] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [icpMin, setIcpMin] = useState<string>("");

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await createListAction({
        name,
        description: description || undefined,
        color,
        type,
        filters: type === "DYNAMIC" ? {
          apeBuckets:     apeBuckets.length ? apeBuckets : undefined,
          headcountBands: headcountBands.length ? headcountBands : undefined,
          regions:        regions.length ? regions : undefined,
          icpMin:         icpMin ? parseInt(icpMin, 10) : undefined,
        } : undefined,
      });
      if (!r.ok) {
        setError(r.error);
      } else {
        router.push(`/listes/${r.listId}`);
      }
    });
  }

  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm p-6 space-y-5">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-lh-red-bg text-lh-red text-[13px]">
          {error}
        </div>
      )}

      <Field label="Nom" required>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ETI Hôtellerie Sud-Est"
          className="w-full px-3 py-2 rounded-lg border border-border text-[14px] focus:outline-none focus:ring-2 focus:ring-teal/40"
        />
      </Field>

      <Field label="Description">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Hôtels 50-250 employés en PACA + Occitanie avec ICP ≥ 70"
          className="w-full px-3 py-2 rounded-lg border border-border text-[14px] focus:outline-none focus:ring-2 focus:ring-teal/40 resize-none"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Type">
          <div className="flex gap-2">
            {(["DYNAMIC", "STATIC"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={[
                  "flex-1 px-3 py-2 rounded-lg text-[12px] font-semibold border transition-colors",
                  type === t
                    ? "bg-teal text-white border-teal"
                    : "bg-bg text-text-2 border-border hover:border-teal/50",
                ].join(" ")}
              >
                {t === "DYNAMIC" ? "Dynamique" : "Statique"}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Couleur">
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                className={[
                  "w-9 h-9 rounded-full border-2 transition-all",
                  color === c ? "border-navy scale-110" : "border-transparent hover:scale-105",
                ].join(" ")}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </Field>
      </div>

      {type === "DYNAMIC" && (
        <>
          <hr className="border-border" />
          <div>
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-text-3 mb-3">
              Filtres dynamiques
            </h3>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Secteur d'activité">
                <MultiSelect
                  options={APE_BUCKETS}
                  selected={apeBuckets}
                  onChange={setApeBuckets}
                  placeholder="Tous les secteurs"
                />
              </Field>

              <Field label="Régions">
                <MultiSelect
                  options={REGIONS.map((r) => ({ code: r, label: r }))}
                  selected={regions}
                  onChange={setRegions}
                  placeholder="Toutes les régions"
                />
              </Field>

              <Field label="Effectifs">
                <MultiSelect
                  options={HEADCOUNT_BANDS}
                  selected={headcountBands}
                  onChange={setHeadcountBands}
                  placeholder="Toutes les tailles"
                />
              </Field>

              <Field label="ICP minimum">
                <input
                  type="number"
                  value={icpMin}
                  onChange={(e) => setIcpMin(e.target.value)}
                  min={0}
                  max={100}
                  placeholder="Ex. : 70"
                  className="w-full px-3 py-2 rounded-lg border border-border text-[13px] focus:outline-none focus:ring-2 focus:ring-teal/40"
                />
              </Field>
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/listes")}
        >
          Annuler
        </Button>
        <Button type="button" onClick={submit} disabled={pending || !name.trim()}>
          {pending ? "Création…" : "Créer la liste"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      <div className="text-[11px] font-bold uppercase tracking-wider text-text-3 mb-1.5">
        {label}
        {required && <span className="text-lh-red ml-1">*</span>}
      </div>
      {children}
    </div>
  );
}
