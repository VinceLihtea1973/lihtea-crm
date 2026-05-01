"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { updateCompanyAction } from "@/app/_actions/companies";

type CompanyEditable = {
  id: string;
  name: string;
  website?: string | null;
  description?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  region?: string | null;
  headcountBand?: string | null;
  revenueM?: number | null;
  nafBucket?: string | null;
  linkedinUrl?: string | null;
  siren?: string | null;
  siret?: string | null;
  apeCode?: string | null;
  legalForm?: string | null;
  categorieEntreprise?: string | null;
  creationDate?: Date | null;
  enrichedAt?: Date | null;
  source?: string | null;
};

const FIELD_ROWS: { key: keyof CompanyEditable; label: string; editable: boolean; type?: string }[] = [
  { key: "siren",              label: "SIREN",           editable: false },
  { key: "siret",              label: "SIRET siège",     editable: false },
  { key: "apeCode",            label: "Code NAF",        editable: false },
  { key: "legalForm",          label: "Forme juridique", editable: false },
  { key: "categorieEntreprise",label: "Catégorie",       editable: false },
  { key: "headcountBand",      label: "Effectifs",       editable: true  },
  { key: "revenueM",           label: "CA (M€)",         editable: true, type: "number" },
  { key: "website",            label: "Site web",        editable: true  },
  { key: "linkedinUrl",        label: "LinkedIn",        editable: true  },
  { key: "address",            label: "Adresse",         editable: true  },
  { key: "postalCode",         label: "Code postal",     editable: true  },
  { key: "city",               label: "Ville",           editable: true  },
  { key: "region",             label: "Région",          editable: true  },
  { key: "nafBucket",          label: "Secteur interne", editable: true  },
];

function fmt(c: CompanyEditable, key: keyof CompanyEditable): string {
  const v = c[key];
  if (v == null) return "";
  if (key === "revenueM") return String(v);
  if (key === "creationDate" || key === "enrichedAt") return new Date(v as Date).toLocaleDateString("fr-FR");
  return String(v);
}

export function CompanyEditForm({ company }: { company: CompanyEditable }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name:          company.name,
    website:       company.website ?? "",
    description:   company.description ?? "",
    address:       company.address ?? "",
    postalCode:    company.postalCode ?? "",
    city:          company.city ?? "",
    region:        company.region ?? "",
    headcountBand: company.headcountBand ?? "",
    revenueM:      company.revenueM != null ? String(company.revenueM) : "",
    nafBucket:     company.nafBucket ?? "",
    linkedinUrl:   company.linkedinUrl ?? "",
  });

  function handleSave() {
    setError(null);
    start(async () => {
      const r = await updateCompanyAction({
        companyId:     company.id,
        name:          form.name.trim() || company.name,
        website:       form.website.trim()       || null,
        description:   form.description.trim()   || null,
        address:       form.address.trim()        || null,
        postalCode:    form.postalCode.trim()     || null,
        city:          form.city.trim()           || null,
        region:        form.region.trim()         || null,
        headcountBand: form.headcountBand.trim()  || null,
        revenueM:      form.revenueM ? Number(form.revenueM) : null,
        nafBucket:     form.nafBucket.trim()      || null,
        linkedinUrl:   form.linkedinUrl.trim()    || null,
      });
      if (r.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  const readOnlyRows = FIELD_ROWS.filter((f) => !f.editable);
  const visibleReadOnly = readOnlyRows.filter((f) => {
    const v = company[f.key];
    return v != null && String(v) !== "";
  });

  return (
    <div className="max-w-2xl">
      {/* Description */}
      {editing ? (
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={3}
          placeholder="Description de l'entreprise…"
          className="w-full px-3 py-2 text-[13px] bg-bg border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/40 mb-4 resize-none"
        />
      ) : company.description ? (
        <p className="text-[13px] text-text-2 mb-6 p-4 bg-bg rounded-xl border border-border leading-relaxed">
          {company.description}
        </p>
      ) : null}

      {/* Champs éditables */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden mb-4">
        {/* Nom */}
        <div className="flex items-center px-4 py-3 border-b border-border text-[13px]">
          <span className="w-40 text-text-3 font-medium shrink-0">Nom</span>
          {editing ? (
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="flex-1 px-2 py-1 text-[13px] bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40"
            />
          ) : (
            <span className="text-text-1 font-semibold">{company.name}</span>
          )}
        </div>

        {/* Champs éditables */}
        {[
          { key: "website",       label: "Site web" },
          { key: "linkedinUrl",   label: "LinkedIn" },
          { key: "address",       label: "Adresse" },
          { key: "postalCode",    label: "Code postal" },
          { key: "city",          label: "Ville" },
          { key: "region",        label: "Région" },
          { key: "headcountBand", label: "Effectifs" },
          { key: "revenueM",      label: "CA (M€)", type: "number" },
          { key: "nafBucket",     label: "Secteur" },
        ].map(({ key, label, type }) => {
          const val = form[key as keyof typeof form];
          if (!editing && !val) return null;
          return (
            <div key={key} className="flex items-center px-4 py-3 border-b border-border last:border-b-0 text-[13px]">
              <span className="w-40 text-text-3 font-medium shrink-0">{label}</span>
              {editing ? (
                <input
                  type={type ?? "text"}
                  value={val}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  step={type === "number" ? "0.1" : undefined}
                  className="flex-1 px-2 py-1 text-[13px] bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40"
                />
              ) : (
                <span className="text-text-1 font-mono">{val}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Champs en lecture seule (SIREN, NAF, etc.) */}
      {visibleReadOnly.length > 0 && (
        <div className="bg-surface rounded-xl border border-border overflow-hidden mb-4">
          {visibleReadOnly.map((row) => (
            <div key={row.key} className="flex items-center px-4 py-3 border-b border-border last:border-b-0 text-[13px]">
              <span className="w-40 text-text-3 font-medium shrink-0">{row.label}</span>
              <span className="text-text-1 font-mono">{fmt(company, row.key)}</span>
            </div>
          ))}
          {company.creationDate && (
            <div className="flex items-center px-4 py-3 border-b border-border last:border-b-0 text-[13px]">
              <span className="w-40 text-text-3 font-medium shrink-0">Création</span>
              <span className="text-text-1 font-mono">{new Date(company.creationDate).toLocaleDateString("fr-FR")}</span>
            </div>
          )}
          {company.enrichedAt && (
            <div className="flex items-center px-4 py-3 border-b border-border last:border-b-0 text-[13px]">
              <span className="w-40 text-text-3 font-medium shrink-0">Enrichi le</span>
              <span className="text-text-1 font-mono">{new Date(company.enrichedAt).toLocaleDateString("fr-FR")}</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-[12px] text-lh-red bg-lh-red-bg px-3 py-2 rounded-lg mb-3">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {editing ? (
          <>
            <Button onClick={handleSave} disabled={pending}>
              {pending ? "Sauvegarde…" : "Enregistrer"}
            </Button>
            <Button variant="secondary" onClick={() => { setEditing(false); setError(null); }}>
              Annuler
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            ✏️ Modifier les informations
          </Button>
        )}
      </div>
    </div>
  );
}
