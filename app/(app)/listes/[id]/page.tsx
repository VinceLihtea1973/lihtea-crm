import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Chip, ScoreCircle } from "@/components/ui/Chip";
import { Avatar } from "@/components/ui/Avatar";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { ListActions } from "./ListActions";

export const metadata = { title: "Liste ICP" };

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tenantId } = await requireTenant();

  const list = await prisma.list.findFirst({
    where:   { id, tenantId },
    include: {
      owner: { select: { name: true, email: true } },
      members: {
        include: {
          company: {
            select: {
              id: true, name: true, siren: true, region: true, city: true,
              icp: true, status: true, nafBucket: true, headcountBand: true,
            },
          },
        },
        orderBy: { addedAt: "desc" },
      },
    },
  });

  if (!list) notFound();

  const filters = (list.filtersJson ?? null) as Record<string, unknown> | null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title={list.name}
        subtitle={list.description ?? "Liste ICP"}
        breadcrumbs={[
          { label: "Acquisition" },
          { label: "Listes ICP", href: "/listes" },
          { label: list.name },
        ]}
        actions={<ListActions listId={list.id} type={list.type} />}
      />
      <div className="flex-1 overflow-y-auto p-6">
        {/* Méta */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 mb-6">
          <div className="bg-surface rounded-xl border border-border shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-lg flex-none grid place-items-center text-white font-extrabold text-[16px]"
                style={{ backgroundColor: list.color }}
              >
                {list.name.charAt(0)}
              </div>
              <div>
                <div className="text-[16px] font-extrabold text-navy">{list.name}</div>
                <div className="text-[12px] text-text-3 mt-0.5">
                  {list.owner?.name ?? list.owner?.email?.split("@")[0] ?? "—"}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Chip color={list.type === "DYNAMIC" ? "teal" : "gold"}>
                  {list.type === "DYNAMIC" ? "Dynamique" : "Statique"}
                </Chip>
                <Chip color="navy">{list.members.length} membres</Chip>
              </div>
            </div>
            {list.lastRefreshedAt && (
              <p className="text-[11px] text-text-3 mt-2">
                Dernier rafraîchissement :{" "}
                {new Date(list.lastRefreshedAt).toLocaleString("fr-FR", {
                  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                })}
              </p>
            )}
          </div>

          {/* Filtres résumés */}
          {filters && Object.keys(filters).length > 0 && (
            <div className="bg-surface rounded-xl border border-border shadow-sm p-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-text-3 mb-3">
                Filtres
              </div>
              <ul className="space-y-1.5 text-[12px]">
                {Object.entries(filters).map(([k, v]) => (
                  <li key={k} className="flex items-start gap-2">
                    <span className="font-semibold text-text-2 w-[110px] flex-none">{k}</span>
                    <span className="text-text-1 font-mono">{formatValue(v)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Membres */}
        <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-bg border-b border-border text-[10px] font-bold uppercase tracking-wider text-text-3">
                <th className="text-left px-3 py-3 w-[60px]">ICP</th>
                <th className="text-left px-3 py-3">Compte</th>
                <th className="text-left px-3 py-3">Secteur</th>
                <th className="text-left px-3 py-3">Localisation</th>
                <th className="text-left px-3 py-3">Effectifs</th>
              </tr>
            </thead>
            <tbody>
              {list.members.map((m) => {
                const c = m.company;
                return (
                  <tr key={c.id} className="border-b border-border last:border-b-0 hover:bg-bg/50">
                    <td className="px-3 py-3"><ScoreCircle score={c.icp ?? 0} /></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={c.name} seed={c.id} size={32} />
                        <div>
                          <div className="text-[13px] font-semibold text-text-1">{c.name}</div>
                          <div className="text-[11px] text-text-3 font-mono">{c.siren ?? "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[12px] text-text-2 capitalize">{c.nafBucket ?? "—"}</td>
                    <td className="px-3 py-3 text-[12px] text-text-2">
                      {c.region?.split("-")[0].trim() ?? "—"} · {c.city ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-[12px] text-text-2">{c.headcountBand ?? "—"}</td>
                  </tr>
                );
              })}
              {list.members.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-12 text-center text-text-3 text-[13px]">
                    Aucun membre — rafraîchis la liste pour récupérer les comptes correspondants.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function formatValue(v: unknown): string {
  if (Array.isArray(v))           return v.join(", ");
  if (v === null || v === undefined) return "—";
  if (typeof v === "object")      return JSON.stringify(v);
  return String(v);
}
