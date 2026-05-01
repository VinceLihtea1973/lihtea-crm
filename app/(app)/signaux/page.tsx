import { Header } from "@/components/layout/Header";
import { fetchBodaccFeedAction } from "@/app/_actions/datagouv";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import Link from "next/link";
import type { BodaccSignalType } from "@/lib/datagouv";

export const dynamic = "force-dynamic";
export const metadata = { title: "Signaux" };

const TYPE_COLORS: Record<BodaccSignalType, string> = {
  CREATION:             "bg-teal/10 text-teal border-teal/20",
  VENTE:                "bg-purple/10 text-purple border-purple/20",
  MODIFICATION:         "bg-blue/10 text-blue border-blue/20",
  RADIATION:            "bg-lh-red/10 text-lh-red border-lh-red/20",
  PROCEDURE_COLLECTIVE: "bg-orange-100 text-orange-700 border-orange-200",
  DEPOT_COMPTES:        "bg-bg text-text-3 border-border",
  AUTRE:                "bg-bg text-text-3 border-border",
};

const TYPE_ICONS: Record<BodaccSignalType, string> = {
  CREATION:             "🌱",
  VENTE:                "🤝",
  MODIFICATION:         "✏️",
  RADIATION:            "⚠️",
  PROCEDURE_COLLECTIVE: "🚨",
  DEPOT_COMPTES:        "📄",
  AUTRE:                "📋",
};

export default async function SignauxPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { tenantId } = await requireTenant();
  const params = await searchParams;
  const daysBack = Number(params.days ?? 90);

  const [{ signals }, companiesCount] = await Promise.all([
    fetchBodaccFeedAction(daysBack),
    prisma.company.count({ where: { tenantId, siren: { not: null } } }),
  ]);

  // Groupe par type
  const byType = signals.reduce<Record<string, number>>((acc, s) => {
    acc[s.type] = (acc[s.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Signaux BODACC"
        subtitle="Annonces légales sur vos comptes — créations, cessions, procédures"
        breadcrumbs={[{ label: "Activité" }, { label: "Signaux" }]}
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Comptes surveillés" value={companiesCount} />
          <StatCard label="Signaux détectés" value={signals.length} highlight />
          <StatCard label="Créations / Cessions" value={(byType.CREATION ?? 0) + (byType.VENTE ?? 0)} />
          <StatCard label="Procédures collectives" value={byType.PROCEDURE_COLLECTIVE ?? 0} danger />
        </div>

        {/* Filtre jours */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[12px] text-text-3 font-semibold">Période :</span>
          {[30, 60, 90, 180].map((d) => (
            <Link
              key={d}
              href={`/signaux?days=${d}`}
              className={[
                "px-3 py-1 rounded-full text-[12px] font-semibold border transition-colors",
                daysBack === d
                  ? "bg-navy text-white border-navy"
                  : "bg-surface text-text-2 border-border hover:bg-bg",
              ].join(" ")}
            >
              {d} jours
            </Link>
          ))}
        </div>

        {/* Liste signaux */}
        {signals.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border p-12 text-center">
            <div className="text-[32px] mb-3">📡</div>
            <div className="text-[14px] font-semibold text-text-2 mb-1">Aucun signal sur la période</div>
            <div className="text-[12px] text-text-3">
              {companiesCount === 0
                ? "Importez des entreprises avec un SIREN pour surveiller leurs annonces légales."
                : `${companiesCount} compte(s) surveillé(s) — aucune annonce BODACC sur ${daysBack} jours.`}
            </div>
          </div>
        ) : (
          <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-bg border-b border-border text-[10px] font-bold uppercase tracking-wider text-text-3">
                  <th className="text-left px-4 py-3 w-[140px]">Date</th>
                  <th className="text-left px-4 py-3 w-[180px]">Type</th>
                  <th className="text-left px-4 py-3">Entreprise</th>
                  <th className="text-left px-4 py-3">Détail</th>
                  <th className="text-left px-4 py-3">Tribunal</th>
                  <th className="text-right px-4 py-3 w-[80px]">Lien</th>
                </tr>
              </thead>
              <tbody>
                {signals.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-b-0 hover:bg-bg/50">
                    <td className="px-4 py-3 text-[12px] font-mono text-text-3 whitespace-nowrap">
                      {s.date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${TYPE_COLORS[s.type]}`}>
                        {TYPE_ICONS[s.type]} {s.typeLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.companyId ? (
                        <Link
                          href={`/comptes/${s.companyId}`}
                          className="text-[13px] font-semibold text-navy hover:underline"
                        >
                          {s.companyName}
                        </Link>
                      ) : (
                        <div className="text-[13px] font-semibold text-text-1">{s.companyName}</div>
                      )}
                      <div className="text-[11px] text-text-3 font-mono">{s.siren}</div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-text-2 max-w-[240px] truncate">
                      {s.detail ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-text-3">{s.tribunal ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {s.url ? (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-teal hover:underline font-semibold"
                        >
                          BODACC ↗
                        </a>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label, value, highlight, danger,
}: {
  label: string; value: number; highlight?: boolean; danger?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${danger && value > 0 ? "bg-lh-red/5 border-lh-red/20" : "bg-surface border-border"}`}>
      <div className={`text-[22px] font-extrabold font-mono ${danger && value > 0 ? "text-lh-red" : highlight ? "text-teal" : "text-navy"}`}>
        {value}
      </div>
      <div className="text-[11px] text-text-3 font-semibold mt-0.5">{label}</div>
    </div>
  );
}
