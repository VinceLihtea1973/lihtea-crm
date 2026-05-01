import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

export const metadata = { title: "Listes ICP" };

export default async function ListesPage() {
  const { tenantId } = await requireTenant();

  const lists = await prisma.list.findMany({
    where:   { tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { members: true } },
      owner:  { select: { name: true, email: true } },
    },
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Listes ICP"
        subtitle="Recherches sauvegardées et listes statiques"
        breadcrumbs={[{ label: "Acquisition" }, { label: "Listes" }]}
        actions={
          <Link href="/listes/new">
            <Button type="button">+ Nouvelle liste</Button>
          </Link>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <Chip color="navy">{lists.length} listes</Chip>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((l) => (
            <Link
              key={l.id}
              href={`/listes/${l.id}`}
              className="bg-surface rounded-xl border border-border shadow-sm p-5 hover:shadow-md hover:border-teal/40 transition-all block"
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex-none grid place-items-center text-white font-extrabold text-[16px]"
                  style={{ backgroundColor: l.color }}
                >
                  {l.name.charAt(0)}
                </div>
                <Chip color={l.type === "DYNAMIC" ? "teal" : "gold"}>
                  {l.type === "DYNAMIC" ? "Dynamique" : "Statique"}
                </Chip>
              </div>

              <h3 className="mt-3 text-[15px] font-extrabold text-navy">{l.name}</h3>
              {l.description && (
                <p className="mt-1 text-[12px] text-text-2 leading-relaxed">{l.description}</p>
              )}

              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-[11px] text-text-3">
                <span className="font-mono font-semibold text-navy">
                  {l._count.members} comptes
                </span>
                <span>{l.owner?.name ?? l.owner?.email?.split("@")[0] ?? "—"}</span>
              </div>
            </Link>
          ))}

          {lists.length === 0 && (
            <div className="col-span-full text-center py-12 text-[13px] text-text-3">
              Aucune liste — crée la première à partir d&apos;une recherche.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
